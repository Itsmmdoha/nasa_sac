import crypto from "crypto";
import fs from "fs";
import path from "path";
import { dataPath } from "./paths";

function cacheDir() {
  const dir = dataPath("cache");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function cacheKey(source: string, params: unknown): string {
  const raw = `${source}:${JSON.stringify(params)}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function readCache<T>(key: string): T | null {
  const file = path.join(cacheDir(), `${key}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, value: T): void {
  const file = path.join(cacheDir(), `${key}.json`);
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}
