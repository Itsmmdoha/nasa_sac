import { isDbDown, persistDecision, type PersistInput, type SavedDecision } from "./db";
import { persistDecisionLocal } from "./local-store";

export type StoreKind = "postgres" | "local";

let pgDownUntil = 0;

/**
 * Save a decision in Postgres when DATABASE_URL is set and the server answers.
 * Otherwise fall back to the local file store so advice still works.
 */
export async function saveDecision(
  input: PersistInput
): Promise<SavedDecision & { store: StoreKind }> {
  const hasDb = Boolean(process.env.DATABASE_URL?.trim());
  if (hasDb && Date.now() > pgDownUntil) {
    try {
      return { ...(await persistDecision(input)), store: "postgres" };
    } catch (e) {
      if (!isDbDown(e)) throw e;
      pgDownUntil = Date.now() + 60_000;
      console.warn("[fieldshift db] Postgres unreachable, using local zone store");
    }
  }
  return { ...(await persistDecisionLocal(input)), store: "local" };
}
