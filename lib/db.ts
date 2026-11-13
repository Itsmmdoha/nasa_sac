import { Pool, type PoolClient } from "pg";
import {
  allocate,
  bucketCounts,
  type AllocateResult,
  type CropOption,
  type ZoneHolder,
} from "./zone";
import { farmId } from "./farm-id";

let pool: Pool | null = null;
let ready: Promise<void> | null = null;

export function getPool(): Pool {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL is not set");
  if (!pool) pool = new Pool({ connectionString: url, connectionTimeoutMillis: 10000 });
  return pool;
}

let pgDownUntil = 0;

export function isPostgresAvailable(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim()) && Date.now() > pgDownUntil;
}

export function markPostgresDown(): void {
  pgDownUntil = Date.now() + 60_000;
}

async function createSchema(): Promise<void> {
  const p = getPool();
  await p.query(`CREATE TABLE IF NOT EXISTS farms (
    id TEXT PRIMARY KEY,
    farm_name TEXT NOT NULL,
    upazila TEXT NOT NULL,
    union_name TEXT NOT NULL
  )`);
  await p.query(`CREATE TABLE IF NOT EXISTS assignments (
    farm_id TEXT NOT NULL REFERENCES farms(id),
    season TEXT NOT NULL,
    rotation_id TEXT NOT NULL,
    rabi_crop TEXT NOT NULL,
    individual_best_rotation_id TEXT NOT NULL,
    fit_score INT NOT NULL,
    deferred BOOLEAN NOT NULL DEFAULT FALSE,
    confidence REAL,
    unsure BOOLEAN NOT NULL DEFAULT FALSE,
    options JSONB NOT NULL DEFAULT '[]',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (farm_id, season)
  )`);
  await p.query(`CREATE TABLE IF NOT EXISTS app_cache (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
}

export async function ensureSchema(): Promise<void> {
  if (!ready) {
    ready = createSchema().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

export { farmId };

export async function readDbCache<T>(key: string): Promise<T | null> {
  await ensureSchema();
  const { rows } = await getPool().query<{ value: T }>(
    `SELECT value FROM app_cache WHERE key = $1`,
    [key]
  );
  return rows[0] == null ? null : rows[0].value;
}

export async function writeDbCache<T>(key: string, value: T): Promise<void> {
  await ensureSchema();
  await getPool().query(
    `INSERT INTO app_cache (key, value, updated_at)
     VALUES ($1, $2::jsonb, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, JSON.stringify(value)]
  );
}

export function isDbDown(e: unknown): boolean {
  if (e instanceof AggregateError) return e.errors.some((err) => isDbDown(err));
  const code = (e as { code?: string }).code;
  const message = e instanceof Error ? e.message : String(e);
  return (
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    code === "ETIMEDOUT" ||
    code === "ECONNRESET" ||
    code === "EPIPE" ||
    code === "ENETUNREACH" ||
    code === "EAI_AGAIN" ||
    code === "57P01" ||
    message.includes("DATABASE_URL") ||
    message.includes("connect") ||
    message.includes("timeout")
  );
}

type HolderRow = {
  farm_id: string;
  rotation_id: string;
  rabi_crop: string;
  fit_score: number;
  individual_best_rotation_id: string;
  options: CropOption[];
  priority: boolean;
};

function bestRabi(options: CropOption[], rotationId: string, fallback: string): string {
  return options.find((o) => o.rotation_id === rotationId)?.rabi_crop ?? fallback;
}

async function loadHolders(
  client: PoolClient,
  upazila: string,
  season: string,
  previousSeason: string,
  selfId: string
): Promise<ZoneHolder[]> {
  const { rows } = await client.query<HolderRow>(
    `SELECT a.farm_id, a.rotation_id, a.rabi_crop, a.fit_score,
            a.individual_best_rotation_id, a.options,
            COALESCE(prev.deferred, FALSE) AS priority
     FROM assignments a
     JOIN farms f ON f.id = a.farm_id
     LEFT JOIN assignments prev ON prev.farm_id = a.farm_id AND prev.season = $2
     WHERE f.upazila = $1 AND a.season = $3 AND a.farm_id <> $4`,
    [upazila, previousSeason, season, selfId]
  );
  return rows.map((row) => {
    const options = Array.isArray(row.options) ? row.options : [];
    return {
      farm_id: row.farm_id,
      rotation_id: row.rotation_id,
      rabi_crop: row.rabi_crop,
      fit_score: row.fit_score,
      priority: row.priority,
      individual_best_rabi: bestRabi(options, row.individual_best_rotation_id, row.rabi_crop),
      options,
    };
  });
}

export type SavedDecision = {
  result: AllocateResult;
  counts: { crop: string; n: number }[];
  priority: boolean;
};

export type PersistInput = {
  farmName: string;
  upazila: string;
  unionName: string;
  season: string;
  previousSeason: string;
  individualBestRotationId: string;
  options: CropOption[];
  confidence: number | null;
  unsure: boolean;
  glutCrops: string[];
};

export async function persistDecision(input: PersistInput): Promise<SavedDecision> {
  await ensureSchema();
  const id = farmId(input.upazila, input.farmName);
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO farms (id, farm_name, upazila, union_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET farm_name = EXCLUDED.farm_name, union_name = EXCLUDED.union_name`,
      [id, input.farmName.trim(), input.upazila, input.unionName]
    );
    const prev = await client.query<{ deferred: boolean }>(
      `SELECT deferred FROM assignments WHERE farm_id = $1 AND season = $2`,
      [id, input.previousSeason]
    );
    const priority = Boolean(prev.rows[0]?.deferred);
    const holders = await loadHolders(client, input.upazila, input.season, input.previousSeason, id);
    const result = allocate({
      farm_id: id,
      individual_best_rotation_id: input.individualBestRotationId,
      priority,
      options: input.options,
      holders,
      glut_crops: input.glutCrops,
    });
    await client.query(
      `INSERT INTO assignments (
         farm_id, season, rotation_id, rabi_crop, individual_best_rotation_id,
         fit_score, deferred, confidence, unsure, options
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (farm_id, season) DO UPDATE SET
         rotation_id = EXCLUDED.rotation_id,
         rabi_crop = EXCLUDED.rabi_crop,
         individual_best_rotation_id = EXCLUDED.individual_best_rotation_id,
         fit_score = EXCLUDED.fit_score,
         deferred = EXCLUDED.deferred,
         confidence = EXCLUDED.confidence,
         unsure = EXCLUDED.unsure,
         options = EXCLUDED.options,
         updated_at = now()`,
      [
        id,
        input.season,
        result.rotation_id,
        result.rabi_crop,
        input.individualBestRotationId,
        result.fit_score,
        result.deferred,
        input.confidence,
        input.unsure,
        JSON.stringify(input.options),
      ]
    );
    if (result.displaced) {
      const d = result.displaced;
      await client.query(
        `UPDATE assignments
         SET rotation_id = $3, rabi_crop = $4, fit_score = $5, deferred = $6, updated_at = now()
         WHERE farm_id = $1 AND season = $2`,
        [d.farm_id, input.season, d.rotation_id, d.rabi_crop, d.fit_score, d.deferred]
      );
    }
    const counts = await client.query<{ crop: string; n: string }>(
      `SELECT a.rabi_crop AS crop, COUNT(*)::text AS n
       FROM assignments a
       JOIN farms f ON f.id = a.farm_id
       WHERE f.upazila = $1 AND a.season = $2
       GROUP BY a.rabi_crop`,
      [input.upazila, input.season]
    );
    await client.query("COMMIT");
    return {
      result,
      priority,
      counts: bucketCounts(counts.rows.map((r) => ({ crop: r.crop, n: Number(r.n) }))),
    };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
