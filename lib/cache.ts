import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import {
  isDbDown,
  isPostgresAvailable,
  markPostgresDown,
  readDbCache,
  writeDbCache,
} from "./db";
import { dataPath } from "./paths";

let resolvedCacheDir: string | null = null;
let fileCacheDisabled = false;

function cacheDir(): string | null {
  if (fileCacheDisabled) return null;
  if (resolvedCacheDir) return resolvedCacheDir;

  const tmpDir = path.join(os.tmpdir(), "fieldshift-cache");
  const candidates = process.env.VERCEL ? [tmpDir] : [dataPath("cache"), tmpDir];

  for (const dir of candidates) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      resolvedCacheDir = dir;
      return dir;
    } catch {
      // Read-only filesystems (EROFS on Vercel) must not crash API routes.
    }
  }

  fileCacheDisabled = true;
  return null;
}

export function cacheKey(source: string, params: unknown): string {
  const raw = `${source}:${JSON.stringify(params)}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function readFileCache<T>(key: string): T | null {
  const dir = cacheDir();
  if (!dir) return null;
  const file = path.join(dir, `${key}.json`);
  try {
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return null;
  }
}

function writeFileCache<T>(key: string, value: T): void {
  try {
    const dir = cacheDir();
    if (!dir) return;
    fs.writeFileSync(path.join(dir, `${key}.json`), JSON.stringify(value, null, 2));
  } catch {
    fileCacheDisabled = true;
  }
}

export async function readCache<T>(key: string): Promise<T | null> {
  if (isPostgresAvailable()) {
    try {
      const value = await readDbCache<T>(key);
      if (value != null) return value;
    } catch (e) {
      if (isDbDown(e)) {
        markPostgresDown();
        console.warn("[fieldshift db] Postgres unreachable, using file cache");
      }
    }
  }
  return readFileCache<T>(key);
}

export async function writeCache<T>(key: string, value: T): Promise<void> {
  if (isPostgresAvailable()) {
    try {
      await writeDbCache(key, value);
      return;
    } catch (e) {
      if (isDbDown(e)) {
        markPostgresDown();
        console.warn("[fieldshift db] Postgres unreachable, using file cache");
      }
    }
  }
  writeFileCache(key, value);
}
