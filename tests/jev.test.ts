import { describe, expect, it } from "vitest";
import { interpretJev } from "@/lib/jev";
import { glutFromNouls } from "@/lib/market";

const fixture = {
  pick: {
    type: "choice",
    choice: "R5",
    confidence: 0.42,
    probabilities: { R5: 0.5, R3: 0.3, R8: 0.2 },
  },
  glut_potato: { type: "noul", noul: 0.91 },
  glut_mustard: { type: "noul", noul: 0.2 },
  glut_lentil: { type: "noul", noul: 0.15 },
};

describe("interpretJev", () => {
  it("reads a choice and per-crop noul answers", () => {
    const parsed = interpretJev(fixture, ["R5", "R3", "R8"], 0.55);
    expect(parsed.choice).toBe("R5");
    expect(parsed.confidence).toBe(0.42);
    expect(parsed.unsure).toBe(true);
    expect(parsed.nouls.potato).toBe(0.91);
    const market = glutFromNouls(parsed.nouls);
    expect(market.find((m) => m.crop === "potato")?.glut).toBe(true);
    expect(market.find((m) => m.crop === "mustard")?.glut).toBe(false);
  });

  it("drops a choice that is not in the allowed list", () => {
    const parsed = interpretJev(
      { pick: { type: "choice", choice: "NOPE", confidence: 0.9 } },
      ["R5"],
      0.55
    );
    expect(parsed.choice).toBeNull();
    expect(parsed.unsure).toBe(false);
  });
});
