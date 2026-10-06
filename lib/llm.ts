import fs from "fs";
import OpenAI from "openai";
import schema from "@/schemas/rotation_advice.schema.json";
import { cacheKey, readCache, writeCache } from "./cache";
import {
  mergeAdvice,
  rotationAdviceSchema,
  scorerFallbackAdvice,
  type RotationAdvice,
} from "./advice";
import { dataPath } from "./paths";
import { SYSTEM_PROMPT } from "./prompt";
import type { ScoredCandidate, UnionSoilProfile } from "./types";

export type AdviceSource = "groq" | "cache" | "scorer" | "mock";

export type FallbackReason =
  | "MOCK_LLM"
  | "NO_GROQ_API_KEY"
  | "RATE_LIMIT"
  | "SCHEMA_ERROR"
  | "GROQ_ERROR";

function mockForced() {
  return process.env.MOCK_LLM === "1";
}

function hasGroqKey() {
  return Boolean(process.env.GROQ_API_KEY?.trim());
}

function loadMock(): RotationAdvice {
  const raw = JSON.parse(
    fs.readFileSync(dataPath("mock", "llm_response.json"), "utf8")
  );
  return rotationAdviceSchema.parse(raw);
}

function groqClient() {
  return new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1",
  });
}

function errorStatus(e: unknown): number | undefined {
  return (e as { status?: number }).status;
}

async function callGroq(
  payload: object,
  model: string,
  strict: boolean
): Promise<RotationAdvice> {
  const client = groqClient();
  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: JSON.stringify(payload) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "rotation_advice",
        schema: schema as Record<string, unknown>,
        strict,
      },
    },
    max_completion_tokens: 3000,
    reasoning_effort: "low",
    // @ts-expect-error Groq-specific
    include_reasoning: false,
  });
  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("empty LLM response");
  return rotationAdviceSchema.parse(JSON.parse(content));
}

function logFallback(reason: FallbackReason, detail?: string) {
  console.warn("[fieldshift advice]", reason, detail ?? "");
}

export async function getAdvice(
  payload: object,
  candidates: ScoredCandidate[],
  location: { upazila: string; union: string },
  soil: UnionSoilProfile
): Promise<{ advice: RotationAdvice; source: AdviceSource; fallback_reason?: FallbackReason }> {
  const hash = cacheKey("llm", payload);
  const cached = readCache<RotationAdvice>(hash);
  if (cached) {
    const top3 = cached.rotations.map((r) => r.rotation_id);
    return {
      advice: mergeAdvice(cached, candidates, top3),
      source: "cache",
    };
  }

  if (mockForced()) {
    logFallback("MOCK_LLM");
    const mock = loadMock();
    mock.location = location;
    const top3 = mock.rotations.map((r) => r.rotation_id);
    return {
      advice: mergeAdvice(mock, candidates, top3),
      source: "mock",
      fallback_reason: "MOCK_LLM",
    };
  }

  if (!hasGroqKey()) {
    logFallback("NO_GROQ_API_KEY");
    return {
      advice: scorerFallbackAdvice(location, candidates, soil),
      source: "scorer",
      fallback_reason: "NO_GROQ_API_KEY",
    };
  }

  const primary = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";
  const fallback = process.env.GROQ_FALLBACK_MODEL ?? "openai/gpt-oss-20b";

  try {
    let raw: RotationAdvice;
    let reason: FallbackReason | undefined;
    try {
      raw = await callGroq(payload, primary, true);
    } catch (e) {
      const status = errorStatus(e);
      if (status === 429 || (status && status >= 500)) {
        reason = "RATE_LIMIT";
        logFallback("RATE_LIMIT", `primary model HTTP ${status}`);
        raw = await callGroq(payload, fallback, true);
      } else if (status === 400) {
        reason = "SCHEMA_ERROR";
        logFallback("SCHEMA_ERROR", "retrying with fallback model, strict false");
        raw = await callGroq(payload, fallback, false);
      } else {
        throw e;
      }
    }
    writeCache(hash, raw);
    const top3 = raw.rotations.map((r) => r.rotation_id);
    return {
      advice: mergeAdvice(raw, candidates, top3),
      source: "groq",
      fallback_reason: reason,
    };
  } catch (e) {
    const status = errorStatus(e);
    const reason: FallbackReason =
      status === 429 ? "RATE_LIMIT" : status === 400 ? "SCHEMA_ERROR" : "GROQ_ERROR";
    logFallback(reason, status ? `HTTP ${status}` : String(e));
    return {
      advice: scorerFallbackAdvice(location, candidates, soil),
      source: "scorer",
      fallback_reason: reason,
    };
  }
}
