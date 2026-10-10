import type { AdviceLang } from "./advice-copy";

export const SESSION_KEY = "fieldshift_last_advice";

export type StoredAdvice = {
  advice: unknown;
  meta: unknown;
  context: {
    soil?: unknown;
    climate?: unknown;
    satellite?: unknown;
    location?: { lat: number; lon: number; union: string; upazila: string };
  };
  farmer: unknown;
  /** Language the advice sentences were written in. */
  lang?: AdviceLang;
};

export function saveAdvice(data: StoredAdvice) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

export function loadAdvice(): StoredAdvice | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAdvice;
  } catch {
    return null;
  }
}
