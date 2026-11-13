import fs from "fs";
import os from "os";
import path from "path";
import { dataPath } from "./paths";
import { allocate, bucketCounts, type CropOption, type ZoneHolder } from "./zone";
import type { PersistInput, SavedDecision } from "./db";
import { farmId } from "./farm-id";

/**
 * File-backed zone store used when Postgres is not reachable.
 * Same rules as the Postgres path (lib/db.ts): one row per farm per season,
 * the zone cap from lib/zone.ts, and last-season deferrals give priority.
 */

type Farm = { id: string; farm_name: string; upazila: string; union_name: string };
type Assignment = {
  farm_id: string;
  season: string;
  rotation_id: string;
  rabi_crop: string;
  individual_best_rotation_id: string;
  fit_score: number;
  deferred: boolean;
  confidence: number | null;
  unsure: boolean;
  options: CropOption[];
  updated_at: string;
};
type StoreFile = { farms: Record<string, Farm>; assignments: Assignment[] };

function storeFile(): string {
  const override = process.env.FIELDSHIFT_LOCAL_STORE?.trim();
  if (override) return override;
  if (process.env.VERCEL) return path.join(os.tmpdir(), "fieldshift-zone-store.json");
  return dataPath("cache", "zone-store.json");
}

function read(): StoreFile {
  const file = storeFile();
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8")) as StoreFile;
    return { farms: raw.farms ?? {}, assignments: raw.assignments ?? [] };
  } catch {
    return { farms: {}, assignments: [] };
  }
}

function write(store: StoreFile) {
  const file = storeFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2));
  fs.renameSync(tmp, file);
}

function bestRabi(options: CropOption[], rotationId: string, fallback: string): string {
  return options.find((o) => o.rotation_id === rotationId)?.rabi_crop ?? fallback;
}

let queue: Promise<unknown> = Promise.resolve();

export function persistDecisionLocal(input: PersistInput): Promise<SavedDecision> {
  const run = async (): Promise<SavedDecision> => {
    const store = read();
    const id = farmId(input.upazila, input.farmName);
    store.farms[id] = {
      id,
      farm_name: input.farmName.trim(),
      upazila: input.upazila,
      union_name: input.unionName,
    };
    const find = (fid: string, season: string) =>
      store.assignments.find((a) => a.farm_id === fid && a.season === season);
    const priority = Boolean(find(id, input.previousSeason)?.deferred);

    const holders: ZoneHolder[] = store.assignments
      .filter(
        (a) =>
          a.season === input.season &&
          a.farm_id !== id &&
          store.farms[a.farm_id]?.upazila === input.upazila
      )
      .map((a) => ({
        farm_id: a.farm_id,
        rotation_id: a.rotation_id,
        rabi_crop: a.rabi_crop,
        fit_score: a.fit_score,
        priority: Boolean(find(a.farm_id, input.previousSeason)?.deferred),
        individual_best_rabi: bestRabi(a.options, a.individual_best_rotation_id, a.rabi_crop),
        options: a.options,
      }));

    const result = allocate({
      farm_id: id,
      individual_best_rotation_id: input.individualBestRotationId,
      priority,
      options: input.options,
      holders,
      glut_crops: input.glutCrops,
    });

    const now = new Date().toISOString();
    const row: Assignment = {
      farm_id: id,
      season: input.season,
      rotation_id: result.rotation_id,
      rabi_crop: result.rabi_crop,
      individual_best_rotation_id: input.individualBestRotationId,
      fit_score: result.fit_score,
      deferred: result.deferred,
      confidence: input.confidence,
      unsure: input.unsure,
      options: input.options,
      updated_at: now,
    };
    const existing = store.assignments.findIndex(
      (a) => a.farm_id === id && a.season === input.season
    );
    if (existing >= 0) store.assignments[existing] = row;
    else store.assignments.push(row);

    if (result.displaced) {
      const d = result.displaced;
      const other = find(d.farm_id, input.season);
      if (other) {
        other.rotation_id = d.rotation_id;
        other.rabi_crop = d.rabi_crop;
        other.fit_score = d.fit_score;
        other.deferred = d.deferred;
        other.updated_at = now;
      }
    }

    const tally = new Map<string, number>();
    for (const a of store.assignments) {
      if (a.season !== input.season) continue;
      if (store.farms[a.farm_id]?.upazila !== input.upazila) continue;
      tally.set(a.rabi_crop, (tally.get(a.rabi_crop) ?? 0) + 1);
    }
    write(store);
    return {
      result,
      priority,
      counts: bucketCounts([...tally].map(([crop, n]) => ({ crop, n }))),
    };
  };
  const next = queue.then(run, run);
  queue = next.catch(() => undefined);
  return next;
}
