import fs from "fs";
import os from "os";
import path from "path";
import { beforeEach, describe, expect, it } from "vitest";
import { persistDecisionLocal } from "@/lib/local-store";

const options = [
  { rotation_id: "R5", rabi_crop: "mustard", overall: 80 },
  { rotation_id: "R3", rabi_crop: "lentil", overall: 70 },
  { rotation_id: "R8", rabi_crop: "maize", overall: 60 },
];

function input(name: string) {
  return {
    farmName: name,
    upazila: "Godagari",
    unionName: "Godagari",
    season: "2026-rabi",
    previousSeason: "2026-kharif2",
    individualBestRotationId: "R5",
    options,
    confidence: 0.8,
    unsure: false,
    glutCrops: [],
  };
}

describe("local zone store", () => {
  beforeEach(() => {
    process.env.FIELDSHIFT_LOCAL_STORE = path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), "fs-")),
      "zone.json"
    );
  });

  it("updates the same farm instead of adding a row", async () => {
    await persistDecisionLocal(input("Rahim"));
    const again = await persistDecisionLocal(input("Rahim"));
    expect(again.counts.find((c) => c.crop === "mustard")!.n).toBe(1);
  });

  it("caps one crop across the zone", async () => {
    const results = [];
    for (const name of ["A", "B", "C", "D", "E"]) results.push(await persistDecisionLocal(input(name)));
    const last = results[results.length - 1]!;
    const mustard = last.counts.find((c) => c.crop === "mustard")!.n;
    expect(mustard).toBeLessThan(5);
    expect(results.some((r) => r.result.deferred)).toBe(true);
  });
});
