export function farmId(upazila: string, name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]/gu, "");
  return `${upazila.trim().toLowerCase()}:${slug || "farm"}`;
}
