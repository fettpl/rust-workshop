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

export class StateConflictError extends PersistenceError {
  constructor() {
    super(
      "Postęp zmienił się w innej karcie. Wyeksportuj bieżącą sesję przed odświeżeniem. Następnie wczytaj zapis lub świadomie zastąp go importem.",
    );
    this.name = "StateConflictError";
  }
}

// The raw snapshot is a compare-and-swap token, including for supported older
// schemas. Migration never changes the stored record merely by reading it.
let observedRecord: string | undefined;
let hasObservedRecord = false;

type StateDatabase = { [STATE_STORE]: { key: string; value: unknown } };
let database: Promise<IDBPDatabase<StateDatabase>> | undefined;

function openStateDatabase(): Promise<IDBPDatabase<StateDatabase>> {
  if (typeof indexedDB === "undefined")
    throw new PersistenceError(
      "IndexedDB jest niedostępny; postępu nie można wczytać ani zapisać.",
    );
  return (database ??= openDB<StateDatabase>(STATE_DATABASE, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STATE_STORE))
        db.createObjectStore(STATE_STORE);
    },
    terminated() {
      database = undefined;
    },
  }).catch((error: unknown) => {
    database = undefined;
    throw error;
  }));
}

export async function loadState(): Promise<UserState | null> {
  try {
    const stored = await (
      await openStateDatabase()
    ).get(STATE_STORE, STATE_KEY);
    const state = stored === undefined ? null : migrateState(stored);
    observedRecord = JSON.stringify(stored);
    hasObservedRecord = true;
    return state;
  } catch (error) {
    if (error instanceof PersistenceError) throw error;
    throw new PersistenceError(
      "Nie można wczytać postępu. Zapisane dane pozostały bez zmian.",
      { cause: error },
    );
  }
}

export async function saveState(
  state: UserState,
  options: { replace?: boolean } = {},
): Promise<void> {
  const checked = migrateState(state);
  try {
    const transaction = (await openStateDatabase()).transaction(
      STATE_STORE,
      "readwrite",
    );
    // Observe the completion promise even when a request throws synchronously
    // (for example QuotaExceededError), so an abort cannot go unhandled.
    const completed = transaction.done;
    void completed.catch(() => {});
    const stored = await transaction.store.get(STATE_KEY);
    if (
      !options.replace &&
      (hasObservedRecord
        ? JSON.stringify(stored) !== observedRecord
        : stored !== undefined)
    ) {
      transaction.abort();
      throw new StateConflictError();
    }
    await transaction.store.put(checked, STATE_KEY);
    await completed;
    observedRecord = JSON.stringify(checked);
    hasObservedRecord = true;
  } catch (error) {
    if (error instanceof PersistenceError) throw error;
    throw new PersistenceError(
      "Nie można zapisać postępu. Bieżący postęp w pamięci nadal jest dostępny.",
      { cause: error },
    );
  }
}

export { PersistenceError };
