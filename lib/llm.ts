import OpenAI from "openai";
import { cacheKey, readCache, writeCache } from "./cache";
import { explanationSchema, templateExplanation, type Explanation } from "./advice";
import { SYSTEM_PROMPT } from "./prompt";
import type { ScoredCandidate, UnionSoilProfile } from "./types";
import { templateExplanationBn } from "./advice-bn";

export type ExplainSource = "groq" | "cache" | "scorer" | "mock";

export type ExplainFallback =
  | "MOCK_LLM"
  | "NO_GROQ_API_KEY"
  | "RATE_LIMIT"
  | "SCHEMA_ERROR"
  | "GROQ_ERROR";

const explainJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    reasons: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4 },
    risks: {
      type: "array",
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          risk: { type: "string" },
          mitigation: { type: "string" },
        },
        required: ["risk", "mitigation"],
      },
    },
    soil_direction: { type: "string", enum: ["improves", "neutral", "degrades"] },
    soil_explanation: { type: "string" },
    water_note: { type: "string" },
    uncertainty_note: { type: "string" },
    bn: {
      type: "object",
      additionalProperties: false,
      properties: {
        summary: { type: "string" },
        reasons: { type: "array", items: { type: "string" }, maxItems: 4 },
        risks: {
          type: "array",
          maxItems: 3,
          items: {
            type: "object",
            additionalProperties: false,
            properties: { risk: { type: "string" }, mitigation: { type: "string" } },
            required: ["risk", "mitigation"],
          },
        },
        soil_explanation: { type: "string" },
        water_note: { type: "string" },
        uncertainty_note: { type: "string" },
      },
      required: ["summary", "reasons", "risks", "soil_explanation", "water_note", "uncertainty_note"],
    },
  },
  required: [
    "bn",
    "summary",
    "reasons",
    "risks",
    "soil_direction",
    "soil_explanation",
    "water_note",
    "uncertainty_note",
  ],
} as const;

function mockForced() {
  return process.env.MOCK_LLM === "1";
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

async function callGroq(payload: object, model: string, strict: boolean): Promise<Explanation> {
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
        name: "rotation_explanation",
        schema: explainJsonSchema,
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
  return explanationSchema.parse(JSON.parse(content));
}

export async function explainAssignment(input: {
  payload: object;
  candidate: ScoredCandidate;
  soil: UnionSoilProfile;
  zoneNote: string;
  marketNote: string;
  zoneNoteBn?: string;
  marketNoteBn?: string;
}): Promise<{ explanation: Explanation; source: ExplainSource; fallback_reason?: ExplainFallback }> {
  const templateBn = () =>
    templateExplanationBn(
      input.candidate,
      input.soil,
      input.zoneNoteBn ?? "",
      input.marketNoteBn ?? ""
    );
  const template = (): Explanation => ({
    ...templateExplanation(input.candidate, input.soil, input.zoneNote, input.marketNote),
    bn: templateBn(),
  });
  const withBn = (e: Explanation): Explanation => (e.bn ? e : { ...e, bn: templateBn() });

  const hash = cacheKey("explain_v2", input.payload);
  const cached = await readCache<Explanation>(hash);
  if (cached) {
    const parsed = explanationSchema.safeParse(cached);
    if (parsed.success) return { explanation: withBn(parsed.data), source: "cache" };
  }

  if (mockForced()) {
    return { explanation: template(), source: "mock", fallback_reason: "MOCK_LLM" };
  }
  if (!process.env.GROQ_API_KEY?.trim()) {
    return { explanation: template(), source: "scorer", fallback_reason: "NO_GROQ_API_KEY" };
  }

  const primary = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";
  const fallback = process.env.GROQ_FALLBACK_MODEL ?? "openai/gpt-oss-20b";
  try {
    let explanation: Explanation;
    let reason: ExplainFallback | undefined;
    try {
      explanation = await callGroq(input.payload, primary, true);
    } catch (e) {
      const status = errorStatus(e);
      if (status === 429 || (status && status >= 500)) {
        reason = "RATE_LIMIT";
        explanation = await callGroq(input.payload, fallback, true);
      } else if (status === 400) {
        reason = "SCHEMA_ERROR";
        explanation = await callGroq(input.payload, fallback, false);
      } else {
        throw e;
      }
    }
    await writeCache(hash, explanation);
    return { explanation: withBn(explanation), source: "groq", fallback_reason: reason };
  } catch (e) {
    const status = errorStatus(e);
    const reason: ExplainFallback =
      status === 429 ? "RATE_LIMIT" : status === 400 ? "SCHEMA_ERROR" : "GROQ_ERROR";
    console.warn("[fieldshift explain]", reason, status ?? "");
    return { explanation: template(), source: "scorer", fallback_reason: reason };
  }
}
