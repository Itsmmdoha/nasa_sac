import fs from "fs";
import { dataPath } from "./paths";

export const GLUT_WATCH = ["mustard", "lentil", "maize", "potato", "boro", "wheat"] as const;
export const GLUT_NOUL = 0.65;

export type Headline = { lang: string; text: string };

export function loadHeadlines(): Headline[] {
  const file = dataPath("market", "headlines.json");
  if (!fs.existsSync(file)) return [];
  const raw = JSON.parse(fs.readFileSync(file, "utf8")) as { headlines?: Headline[] };
  return (raw.headlines ?? []).filter((h) => h && typeof h.text === "string" && h.text.trim());
}

export type MarketSignal = { crop: string; noul: number; glut: boolean };
export type MarketSource = "jev" | "keywords";

export function glutFromNouls(nouls: Record<string, number>): MarketSignal[] {
  return Object.entries(nouls).map(([crop, noul]) => ({
    crop,
    noul,
    glut: noul >= GLUT_NOUL,
  }));
}

const CROP_WORDS: Record<string, string[]> = {
  mustard: ["mustard", "সরিষা", "সরিষার"],
  lentil: ["lentil", "মসুর"],
  maize: ["maize", "corn", "ভুট্টা"],
  potato: ["potato", "আলু"],
  boro: ["boro", "paddy", "rice", "বোরো", "ধান"],
  wheat: ["wheat", "গম"],
};

const GLUT_WORDS = [
  "glut",
  "oversupply",
  "over-supply",
  "overshoot",
  "below cost",
  "price collapse",
  "prices collapse",
  "distress sale",
  "unsold",
  "খরচের নিচে",
  "লোকসানে",
  "দরপতন",
  "চাহিদার চেয়ে",
];

const NEGATION = [/\bno\b/i, /\bnot\b/i, /\bwithout\b/i, /নেই/, /\sনা(?=[\s।,]|$)/];

/**
 * Offline glut check used when the System One model is unavailable.
 * A sentence counts when it names the crop and a glut phrase without a negation.
 */
export function keywordGlut(
  headlines: Headline[],
  crops: readonly string[] = GLUT_WATCH
): MarketSignal[] {
  const sentences = headlines.flatMap((h) =>
    h.text.split(/(?<=[.!?।])\s+/).map((s) => s.toLowerCase())
  );
  return crops.map((crop) => {
    const words = CROP_WORDS[crop] ?? [crop];
    const mentions = sentences.filter((s) => words.some((w) => s.includes(w)));
    // A glut phrase can sit in the next sentence of the same headline; join per headline too.
    const blocks = headlines
      .map((h) => h.text.toLowerCase())
      .filter((t) => words.some((w) => t.includes(w)));
    const hit = blocks.some((t) =>
      t
        .split(/(?<=[.!?।])\s+/)
        .some((s) => GLUT_WORDS.some((g) => s.includes(g)) && !NEGATION.some((n) => n.test(s)))
    );
    const noul = hit ? 0.8 : mentions.length ? 0.15 : 0.05;
    return { crop, noul, glut: noul >= GLUT_NOUL };
  });
}
