import path from "path";

export const ROOT = process.cwd();

export function dataPath(...parts: string[]) {
  return path.join(ROOT, "data", ...parts);
}

export function samplesPath(...parts: string[]) {
  return path.join(ROOT, "samples", ...parts);
}
