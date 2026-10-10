import { fill } from "./text";

export function formatWaterChange(
  changePct: number,
  copy: { same: string; less: string; more: string }
): string {
  if (changePct === 0) return copy.same;
  if (changePct < 0) return fill(copy.less, { pct: Math.abs(changePct) });
  return fill(copy.more, { pct: changePct });
}
