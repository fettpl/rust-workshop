import { openDB, type IDBPDatabase } from "idb";
import type { UserState } from "@/domain/types";
import { migrateState } from "./state";

export const STATE_DATABASE = "rust-workshop-state";
export const STATE_STORE = "user-state";
const STATE_KEY = "current";

class PersistenceError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "PersistenceError";
  }
}

let database:
  | Promise<IDBPDatabase<{ [STATE_STORE]: { key: string; value: unknown } }>>
  | undefined;

function openStateDatabase() {
  if (typeof indexedDB === "undefined")
    throw new PersistenceError(
      "IndexedDB jest niedostępny; postępu nie można wczytać ani zapisać.",
    );
  database ??= openDB(STATE_DATABASE, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STATE_STORE))
        db.createObjectStore(STATE_STORE);
    },
  });
  return database;
}

export async function loadState(): Promise<UserState | null> {
  try {
    const stored = await (
      await openStateDatabase()
    ).get(STATE_STORE, STATE_KEY);
    if (stored === undefined) return null;
    return migrateState(stored);
  } catch (error) {
    if (error instanceof PersistenceError) throw error;
    throw new PersistenceError(
      "Nie można wczytać postępu. Zapisane dane pozostały bez zmian.",
      { cause: error },
    );
  }
}

export async function saveState(state: UserState): Promise<void> {
  const checked = migrateState(state);
  try {
    await (await openStateDatabase()).put(STATE_STORE, checked, STATE_KEY);
  } catch (error) {
    if (error instanceof PersistenceError) throw error;
    throw new PersistenceError(
      "Nie można zapisać postępu. Bieżący postęp w pamięci nadal jest dostępny.",
      { cause: error },
    );
  }
}

export { PersistenceError };
