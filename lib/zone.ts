export type CropOption = {
  rotation_id: string;
  rabi_crop: string;
  overall: number;
};

export type ZoneHolder = {
  farm_id: string;
  rotation_id: string;
  rabi_crop: string;
  fit_score: number;
  /** Deferred last season, so this season they keep the top crop. */
  priority: boolean;
  individual_best_rabi: string;
  options: CropOption[];
};

export type AllocateInput = {
  farm_id: string;
  individual_best_rotation_id: string;
  /** This farm deferred last season. */
  priority: boolean;
  options: CropOption[];
  holders: ZoneHolder[];
  glut_crops: string[];
};

export type Displaced = {
  farm_id: string;
  rotation_id: string;
  rabi_crop: string;
  fit_score: number;
  deferred: boolean;
};

export type AllocateResult = {
  rotation_id: string;
  rabi_crop: string;
  fit_score: number;
  deferred: boolean;
  displaced: Displaced | null;
};

const SHARE = 0.4;
const GLUT_SHARE = 0.25;

function limit(farmCount: number, glut: boolean): number {
  return Math.floor(farmCount * (glut ? GLUT_SHARE : SHARE));
}

/** Cap is inactive until two farms already hold the crop. */
function addingExceeds(
  crop: string,
  holders: { rabi_crop: string }[],
  glutCrops: string[]
): boolean {
  const already = holders.filter((h) => h.rabi_crop === crop).length;
  if (already < 2) return false;
  const n = holders.length + 1;
  return already + 1 > limit(n, glutCrops.includes(crop));
}

function byScore(a: CropOption, b: CropOption): number {
  return b.overall - a.overall || a.rotation_id.localeCompare(b.rotation_id);
}

function pickNext(
  options: CropOption[],
  holders: { rabi_crop: string }[],
  glutCrops: string[],
  avoidCrop: string
): CropOption {
  const sorted = [...options].sort(byScore);
  const different = sorted.filter((o) => o.rabi_crop !== avoidCrop);
  for (const opt of different) {
    if (!addingExceeds(opt.rabi_crop, holders, glutCrops)) return opt;
  }
  return different[0] ?? sorted[0]!;
}

function assigned(
  opt: CropOption,
  bestRabi: string,
  displaced: Displaced | null
): AllocateResult {
  return {
    rotation_id: opt.rotation_id,
    rabi_crop: opt.rabi_crop,
    fit_score: opt.overall,
    deferred: opt.rabi_crop !== bestRabi,
    displaced,
  };
}

export function allocate(input: AllocateInput): AllocateResult {
  const options = [...input.options].sort(byScore);
  const best =
    options.find((o) => o.rotation_id === input.individual_best_rotation_id) ?? options[0];
  if (!best) {
    throw new Error("allocate requires at least one option");
  }

  if (input.priority) return assigned(best, best.rabi_crop, null);

  const others = input.holders.filter((h) => h.farm_id !== input.farm_id);
  if (!addingExceeds(best.rabi_crop, others, input.glut_crops)) {
    return assigned(best, best.rabi_crop, null);
  }

  const unlocked = others
    .filter((h) => h.rabi_crop === best.rabi_crop && !h.priority)
    .sort((a, b) => a.fit_score - b.fit_score || a.farm_id.localeCompare(b.farm_id));
  const weakest = unlocked[0];

  if (weakest && weakest.options.length && best.overall > weakest.fit_score) {
    const remaining = others
      .filter((h) => h.farm_id !== weakest.farm_id)
      .map((h) => ({ rabi_crop: h.rabi_crop }));
    remaining.push({ rabi_crop: best.rabi_crop });
    const next = pickNext(weakest.options, remaining, input.glut_crops, best.rabi_crop);
    return assigned(best, best.rabi_crop, {
      farm_id: weakest.farm_id,
      rotation_id: next.rotation_id,
      rabi_crop: next.rabi_crop,
      fit_score: next.overall,
      deferred: next.rabi_crop !== weakest.individual_best_rabi,
    });
  }

  const next = pickNext(options, others, input.glut_crops, best.rabi_crop);
  return assigned(next, best.rabi_crop, null);
}

export function bucketCounts(rows: { crop: string; n: number }[]): { crop: string; n: number }[] {
  const buckets = { mustard: 0, lentil: 0, maize: 0, other: 0 };
  for (const row of rows) {
    if (row.crop === "mustard" || row.crop === "lentil" || row.crop === "maize") {
      buckets[row.crop] += row.n;
    } else {
      buckets.other += row.n;
    }
  }
  return [
    { crop: "mustard", n: buckets.mustard },
    { crop: "lentil", n: buckets.lentil },
    { crop: "maize", n: buckets.maize },
    { crop: "other", n: buckets.other },
  ];
}
