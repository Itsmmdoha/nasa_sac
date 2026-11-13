import {
  isDbDown,
  isPostgresAvailable,
  markPostgresDown,
  persistDecision,
  type PersistInput,
  type SavedDecision,
} from "./db";
import { persistDecisionLocal } from "./local-store";

export type StoreKind = "postgres" | "local";

/**
 * Save a decision in Postgres when DATABASE_URL is set and the server answers.
 * Otherwise fall back to the local file store so advice still works.
 */
export async function saveDecision(
  input: PersistInput
): Promise<SavedDecision & { store: StoreKind }> {
  if (isPostgresAvailable()) {
    try {
      return { ...(await persistDecision(input)), store: "postgres" };
    } catch (e) {
      if (!isDbDown(e)) throw e;
      markPostgresDown();
      console.warn("[fieldshift db] Postgres unreachable, using local zone store");
    }
  }
  return { ...(await persistDecisionLocal(input)), store: "local" };
}
