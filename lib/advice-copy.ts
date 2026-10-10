export type AdviceLang = "en" | "bn";

type FallbackCopy = {
  summary: string;
  irrigationNote: (mm: number) => string;
  soilExplanation: (score: number, om: number | null) => string;
  overallReason: (score: number) => string;
  waterReason: (score: number, changePct: number) => string;
  phReason: (ph: number) => string;
  soilSamplesReason: string;
  uncertainty: string;
  caveat: string;
  fillerNote: string;
  fillerExplanation: string;
  fillerReason: string;
  fillerUncertainty: string;
};

const en: FallbackCopy = {
  summary:
    "These three rotations scored highest for your field and priorities. AI explanations were unavailable; reasons below are from the rule-based scorer.",
  irrigationNote: (mm) => `Estimated irrigation ${mm} mm for the full rotation.`,
  soilExplanation: (score, om) =>
    `Soil health score ${score}; organic matter about ${om ?? "unknown"}%.`,
  overallReason: (score) => `Overall score ${score} from your priority weights.`,
  waterReason: (score, changePct) =>
    `Water score ${score}; irrigation change ${changePct}% vs your current pattern.`,
  phReason: (ph) => `Union soil pH about ${ph}.`,
  soilSamplesReason: "Soil data from SRDI union samples.",
  uncertainty: "AI explanation unavailable; ranking from deterministic scorer only.",
  caveat: "Explanation generated offline from the rule-based scorer.",
  fillerNote: "From rule-based scorer.",
  fillerExplanation: "See scores.",
  fillerReason: "Ranked by the rule-based scorer.",
  fillerUncertainty: "Filled from scorer.",
};

const bn: FallbackCopy = {
  summary:
    "আপনার জমি ও অগ্রাধিকার অনুসারে এই তিনটি ফসলচক্র সবচেয়ে বেশি নম্বর পেয়েছে। এআই ব্যাখ্যা পাওয়া যায়নি; নিচের কারণগুলো নিয়মভিত্তিক হিসাব থেকে এসেছে।",
  irrigationNote: (mm) => `পুরো ফসলচক্রে আনুমানিক সেচ ${mm} মিমি।`,
  soilExplanation: (score, om) =>
    `মাটির স্বাস্থ্যের নম্বর ${score}; জৈব পদার্থ প্রায় ${om ?? "অজানা"}%।`,
  overallReason: (score) => `আপনার অগ্রাধিকার অনুসারে সামগ্রিক নম্বর ${score}।`,
  waterReason: (score, changePct) =>
    `পানির নম্বর ${score}; আপনার বর্তমান ধরনের চেয়ে সেচ ${changePct}% পরিবর্তন।`,
  phReason: (ph) => `ইউনিয়নের মাটির পিএইচ প্রায় ${ph}।`,
  soilSamplesReason: "মাটির তথ্য এসআরডিআইয়ের ইউনিয়ন নমুনা থেকে।",
  uncertainty: "এআই ব্যাখ্যা পাওয়া যায়নি; ক্রম শুধু নিয়মভিত্তিক হিসাব থেকে।",
  caveat: "ব্যাখ্যা নিয়মভিত্তিক হিসাব থেকে অফলাইনে তৈরি।",
  fillerNote: "নিয়মভিত্তিক হিসাব থেকে।",
  fillerExplanation: "নম্বর দেখুন।",
  fillerReason: "নিয়মভিত্তিক হিসাব অনুসারে স্থান।",
  fillerUncertainty: "হিসাব থেকে পূরণ করা হয়েছে।",
};

export function adviceCopy(lang: AdviceLang): FallbackCopy {
  return lang === "bn" ? bn : en;
}
