import { describe, expect, it } from "vitest";
import { previousSeasonKey, seasonKey } from "@/lib/upcomingSeason";
import { allocate, type CropOption, type ZoneHolder } from "@/lib/zone";

const mustard = (overall: number, id = "R5"): CropOption => ({
  rotation_id: id,
  rabi_crop: "mustard",
  overall,
});
const lentil = (overall: number, id = "R3"): CropOption => ({
  rotation_id: id,
  rabi_crop: "lentil",
  overall,
});
const maize = (overall: number, id = "R8"): CropOption => ({
  rotation_id: id,
  rabi_crop: "maize",
  overall,
});

function holder(farm_id: string, fit: number, priority = false): ZoneHolder {
  return {
    farm_id,
    rotation_id: "R5",
    rabi_crop: "mustard",
    fit_score: fit,
    priority,
    individual_best_rabi: "mustard",
    options: [mustard(fit), lentil(fit - 10, `${farm_id}-lentil`), maize(fit - 15, `${farm_id}-maize`)],
  };
}

describe("season keys", () => {
  it("keeps January in the rabi that started the previous November", () => {
    expect(seasonKey(new Date("2026-11-12T12:00:00Z"))).toBe("2026-rabi");
    expect(seasonKey(new Date("2027-01-15T12:00:00Z"))).toBe("2026-rabi");
    expect(previousSeasonKey("2026-rabi")).toBe("2026-kharif2");
    expect(previousSeasonKey("2027-kharif1")).toBe("2026-rabi");
  });
});

describe("allocate", () => {
  const holders = [holder("a", 80), holder("b", 70)];

  it("diverts a weaker farm to lentil or maize once two farms already hold the crop", () => {
    const result = allocate({
      farm_id: "c",
      individual_best_rotation_id: "R5",
      priority: false,
      options: [mustard(50), lentil(48), maize(40)],
      holders,
      glut_crops: [],
    });
    expect(["lentil", "maize"]).toContain(result.rabi_crop);
    expect(result.deferred).toBe(true);
    expect(result.displaced).toBeNull();
  });

  it("lets a farm that deferred last season keep the top crop", () => {
    const result = allocate({
      farm_id: "c",
      individual_best_rotation_id: "R5",
      priority: true,
      options: [mustard(50), lentil(48)],
      holders,
      glut_crops: [],
    });
    expect(result.rabi_crop).toBe("mustard");
    expect(result.rotation_id).toBe("R5");
    expect(result.deferred).toBe(false);
    expect(result.displaced).toBeNull();
  });

  it("gives mustard to a better-fit newcomer and defers the weaker holder", () => {
    const result = allocate({
      farm_id: "c",
      individual_best_rotation_id: "R5",
      priority: false,
      options: [mustard(80), lentil(60)],
      holders: [holder("a", 90), holder("b", 60)],
      glut_crops: [],
    });
    expect(result.rabi_crop).toBe("mustard");
    expect(result.deferred).toBe(false);
    expect(result.displaced?.farm_id).toBe("b");
    expect(["lentil", "maize"]).toContain(result.displaced?.rabi_crop);
    expect(result.displaced?.deferred).toBe(true);
  });

  it("does not divert the second farm on a crop", () => {
    const result = allocate({
      farm_id: "b",
      individual_best_rotation_id: "R5",
      priority: false,
      options: [mustard(55), lentil(54)],
      holders: [holder("a", 80)],
      glut_crops: [],
    });
    expect(result.rabi_crop).toBe("mustard");
    expect(result.deferred).toBe(false);
  });
});
