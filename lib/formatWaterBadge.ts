export function formatWaterChange(changePct: number): string {
  if (changePct === 0) return "Same water as now";
  if (changePct < 0) {
    return `${Math.abs(changePct)}% less water than your current rotation`;
  }
  return `${changePct}% more water than your current rotation`;
}
