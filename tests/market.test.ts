import { describe, expect, it } from "vitest";
import { keywordGlut } from "@/lib/market";

const headlines = [
  { lang: "en", text: "Potato harvest overshoots national demand, and farmers sell below cost." },
  { lang: "bn", text: "আলুর উৎপাদন জাতীয় চাহিদার চেয়ে বেশি হয়েছে। কৃষকরা উৎপাদন খরচের নিচে বিক্রি করছেন।" },
  { lang: "en", text: "Lentil and maize arrivals are in line with last season, with no reports of distress sales." },
  { lang: "bn", text: "আঞ্চলিক বাজারে মসুর ও ভুট্টার সরবরাহ গত মৌসুমের মতো। লোকসানে বিক্রির খবর নেই।" },
];

describe("keywordGlut", () => {
  it("flags a crop whose headline describes selling below cost", () => {
    const potato = keywordGlut(headlines).find((m) => m.crop === "potato")!;
    expect(potato.glut).toBe(true);
  });
  it("ignores negated glut phrases in English and Bangla", () => {
    const signals = keywordGlut(headlines);
    expect(signals.find((m) => m.crop === "lentil")!.glut).toBe(false);
    expect(signals.find((m) => m.crop === "maize")!.glut).toBe(false);
  });
});
