import type { ScoredCandidate } from "./types";
import { GLUT_WATCH, glutFromNouls, type Headline, type MarketSignal } from "./market";

export const JEV_URL = "https://opencode.ai/inference/systemone/v1/systemone";
export const DEFAULT_JEV_MODEL = "jev-1.13-free";

export type JevAnswer = {
  type?: string;
  choice?: string;
  confidence?: number;
  noul?: number;
};

export function confidenceMin(): number {
  const n = Number(process.env.JEV_CONFIDENCE_MIN ?? "0.55");
  return Number.isFinite(n) ? n : 0.55;
}

export function interpretJev(
  answers: Record<string, JevAnswer>,
  allowedIds: string[],
  minConfidence = confidenceMin()
): {
  choice: string | null;
  confidence: number | null;
  unsure: boolean;
  nouls: Record<string, number>;
} {
  const pick = answers.pick;
  const choice =
    pick?.type === "choice" && pick.choice && allowedIds.includes(pick.choice) ? pick.choice : null;
  const confidence = typeof pick?.confidence === "number" ? pick.confidence : null;
  const unsure = choice != null && confidence != null && confidence < minConfidence;
  const nouls: Record<string, number> = {};
  for (const [key, val] of Object.entries(answers)) {
    if (!key.startsWith("glut_")) continue;
    if (val?.type === "noul" && typeof val.noul === "number") nouls[key.slice(5)] = val.noul;
  }
  return { choice, confidence, unsure, nouls };
}

type Question = {
  type: string;
  instructions: string;
  criteria?: Record<string, string>;
};

function lineFor(c: ScoredCandidate): string {
  const s = c.scores;
  return `${c.name}. Rabi ${c.seasons.rabi.crop}. Overall ${s.overall}, water ${s.water}, soil ${s.soil_health}, profit ${s.profit}, irrigation ${c.irrigation_mm} mm.`;
}

export function decisionQuestions(
  allowed: ScoredCandidate[],
  crops: string[]
): Record<string, Question> {
  const criteria: Record<string, string> = {};
  for (const c of allowed) criteria[c.rotation_id] = lineFor(c);
  const questions: Record<string, Question> = {
    pick: {
      type: "choice",
      instructions:
        "Pick the single best rotation for this farm. Use only the scores in the state.",
      criteria,
    },
  };
  for (const crop of crops) {
    questions[`glut_${crop}`] = {
      type: "noul",
      instructions: `Do these headlines show an early glut or farmers selling below cost for ${crop}?`,
      criteria: {
        true: "Headlines describe oversupply, a price collapse, or selling below cost for this crop.",
        false: "No early glut signal for this crop.",
      },
    };
  }
  return questions;
}

export type JevDecision = {
  rotation_id: string;
  confidence: number | null;
  unsure: boolean;
  source: "jev" | "scorer";
  fallback_reason?: string;
  market: MarketSignal[];
};

function topId(allowed: ScoredCandidate[]): string {
  return [...allowed].sort((a, b) => b.scores.overall - a.scores.overall)[0]!.rotation_id;
}

async function postJev(model: string, state: unknown, questions: Record<string, Question>, key: string) {
  const res = await fetch(JEV_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, state, questions }),
    signal: AbortSignal.timeout(15_000),
  });
  return res;
}

export async function jevDecision(input: {
  allowed: ScoredCandidate[];
  headlines: Headline[];
  upazila: string;
  union: string;
  water: string;
  budget: string;
  lastRabi: string;
  ph: number | null;
  rabiRainMm: number | null;
}): Promise<JevDecision> {
  const allowed = input.allowed;
  const fallbackId = topId(allowed);
  const rabiCrops = [
    ...new Set(
      allowed
        .map((c) => c.seasons.rabi.crop)
        .filter((crop) => (GLUT_WATCH as readonly string[]).includes(crop))
    ),
  ];
  const key = process.env.OPENCODE_API_KEY?.trim();
  if (!key) {
    return {
      rotation_id: fallbackId,
      confidence: null,
      unsure: false,
      source: "scorer",
      fallback_reason: "NO_OPENCODE_API_KEY",
      market: [],
    };
  }

  const state = {
    farm: {
      upazila: input.upazila,
      union: input.union,
      water: input.water,
      budget: input.budget,
      last_rabi: input.lastRabi,
    },
    soil_ph: input.ph,
    rabi_rain_mm: input.rabiRainMm,
    rotations: allowed.map((c) => ({
      rotation_id: c.rotation_id,
      summary: lineFor(c),
    })),
    headlines: input.headlines.map((h) => `${h.lang}: ${h.text}`),
  };
  const questions = decisionQuestions(allowed, rabiCrops);
  const primary = process.env.OPENCODE_MODEL?.trim() || DEFAULT_JEV_MODEL;
  const fallbackModel = process.env.OPENCODE_FALLBACK_MODEL?.trim();

  try {
    let res = await postJev(primary, state, questions, key);
    if ((res.status === 402 || res.status === 404) && fallbackModel) {
      res = await postJev(fallbackModel, state, questions, key);
    }
    if (!res.ok) {
      console.warn("[fieldshift jev]", res.status);
      return {
        rotation_id: fallbackId,
        confidence: null,
        unsure: false,
        source: "scorer",
        fallback_reason: "JEV_ERROR",
        market: [],
      };
    }
    const json = (await res.json()) as { answers?: Record<string, JevAnswer> };
    const parsed = interpretJev(json.answers ?? {}, allowed.map((c) => c.rotation_id));
    return {
      rotation_id: parsed.choice ?? fallbackId,
      confidence: parsed.choice ? parsed.confidence : null,
      unsure: parsed.choice ? parsed.unsure : false,
      source: parsed.choice ? "jev" : "scorer",
      fallback_reason: parsed.choice ? undefined : "JEV_ERROR",
      market: glutFromNouls(parsed.nouls),
    };
  } catch (e) {
    console.warn("[fieldshift jev]", e instanceof Error ? e.message : e);
    return {
      rotation_id: fallbackId,
      confidence: null,
      unsure: false,
      source: "scorer",
      fallback_reason: "JEV_ERROR",
      market: [],
    };
  }
}
