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

export function glutFromNouls(nouls: Record<string, number>): MarketSignal[] {
  return Object.entries(nouls).map(([crop, noul]) => ({
    crop,
    noul,
    glut: noul >= GLUT_NOUL,
  }));
}
