import type { Explanation } from "./advice";
import type { MarketSignal } from "./market";
import type { ScoredCandidate } from "./types";

export const CROP_BN: Record<string, string> = {
  boro: "বোরো ধান",
  t_aman: "রোপা আমন",
  wheat: "গম",
  maize: "ভুট্টা",
  mustard: "সরিষা",
  lentil: "মসুর",
  chickpea: "ছোলা",
  mungbean: "মুগ",
  potato: "আলু",
  fallow: "পতিত",
  other: "অন্যান্য",
};

const DIGITS = "০১২৩৪৫৬৭৮৯";
export function bnNum(n: number | string): string {
  return String(n).replace(/[0-9]/g, (d) => DIGITS[Number(d)]!);
}

export function rotationNameBn(c: Pick<ScoredCandidate, "seasons">): string {
  return (["rabi", "kharif1", "kharif2"] as const)
    .map((s) => CROP_BN[c.seasons[s].crop] ?? c.seasons[s].crop)
    .join(" – ");
}

export function zoneNoteBn(input: {
  deferred: boolean;
  displaced: boolean;
  best: ScoredCandidate;
  assigned: ScoredCandidate;
}): string {
  if (input.deferred) {
    return `আপনার জমির জন্য সেরা ছিল ${rotationNameBn(input.best)}। একই বাজারে সবাই যেন এক ফসল না তোলে, তাই জোন পরিকল্পনা ${rotationNameBn(input.assigned)} দিয়েছে। পরের মৌসুমে সেরা ফসলের জন্য আপনি প্রথম থাকবেন।`;
  }
  if (input.displaced) {
    return `জোনের আরেকটি খামারের চেয়ে ${rotationNameBn(input.assigned)} আপনার জমিতে বেশি মানায়, তাই দুর্বল মিলের খামারটি অন্য উপযোগী ফসলে যাবে।`;
  }
  return "";
}

export function marketNoteBn(market: MarketSignal[], source: "jev" | "keywords" | "none"): string {
  if (source === "none") return "বাজার যাচাই পাওয়া যায়নি।";
  const glut = market.filter((m) => m.glut).map((m) => CROP_BN[m.crop] ?? m.crop);
  if (!glut.length) return "কোনো শিরোনামে অতিরিক্ত সরবরাহের সংকেত নেই।";
  return `বাজারের শিরোনামে ${glut.join(", ")}-এর আগাম অতিরিক্ত সরবরাহের সংকেত আছে।`;
}

export type ExplanationBn = Pick<
  Explanation,
  "summary" | "reasons" | "risks" | "soil_explanation" | "water_note" | "uncertainty_note"
>;

export function templateExplanationBn(
  c: ScoredCandidate,
  soil: { ph_median: number | null; om_pct?: number | null },
  zoneNote: string,
  marketNote: string
): ExplanationBn {
  const change = c.change_vs_current_pct;
  const changeText =
    change === 0
      ? "বর্তমানের সমান পানি"
      : change < 0
        ? `বর্তমানের চেয়ে ${bnNum(Math.abs(change))}% কম পানি`
        : `বর্তমানের চেয়ে ${bnNum(change)}% বেশি পানি`;
  return {
    summary: [`এই মৌসুমের জন্য ফসলচক্র: ${rotationNameBn(c)}।`, zoneNote, marketNote]
      .filter(Boolean)
      .join(" "),
    reasons: [
      `আপনার অগ্রাধিকার অনুযায়ী সামগ্রিক স্কোর ${bnNum(c.scores.overall)}।`,
      `পানির স্কোর ${bnNum(c.scores.water)}; ${changeText}।`,
      soil.ph_median != null
        ? `ইউনিয়নের মাটির pH প্রায় ${bnNum(soil.ph_median)}।`
        : "মাটির তথ্য SRDI ইউনিয়ন নমুনা থেকে।",
    ],
    risks: [],
    soil_explanation: `মাটির স্বাস্থ্য স্কোর ${bnNum(c.scores.soil_health)}; জৈব পদার্থ প্রায় ${
      soil.om_pct != null ? bnNum(soil.om_pct) : "অজানা"
    }%।`,
    water_note: `পুরো ফসলচক্রে আনুমানিক ${bnNum(c.irrigation_mm)} মিমি সেচ লাগবে।`,
    uncertainty_note: "ভাষা মডেলের ব্যাখ্যা পাওয়া যায়নি। কারণগুলো নিয়মভিত্তিক স্কোরার থেকে।",
  };
}
