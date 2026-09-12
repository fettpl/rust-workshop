"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { UserState } from "@/domain/types";
import { createInitialState } from "@/persistence/state";
import { loadState, saveState } from "@/persistence/storage";
type Update = (fn: (state: UserState) => UserState) => void;
const LearningContext = createContext<{
  state: UserState;
  update: Update;
  saveStatus: string;
  storageError: string;
  replace: (state: UserState) => void;
  generation: () => number;
} | null>(null);
export function LearningProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<UserState>(createInitialState);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [saveStatus, setSaveStatus] = useState("Wczytywanie…");
  const current = useRef<UserState | null>(null);
  const writable = useRef(true);
  const epoch = useRef(0);
  const revision = useRef(0);
  const pending = useRef(false);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const persist = useCallback((next: UserState) => {
    if (!writable.current) return;
    const version = ++revision.current;
    pending.current = true;
    setSaveStatus("Zapisywanie…");
    queue.current = queue.current
      .then(() => saveState(next))
      .then(() => {
        if (version === revision.current) {
          pending.current = false;
          setSaveStatus("Zapisano na tym urządzeniu");
          setStorageError("");
        }
      })
      .catch(() => {
        if (version === revision.current) {
          pending.current = false;
          setSaveStatus("Zapis nie powiódł się");
          setStorageError(
            "Brak dostępu do lokalnego zapisu. Wyeksportuj postęp przed zamknięciem — sesja pozostaje w pamięci.",
          );
        }
      });
  }, []);
  useEffect(() => {
    let active = true;
    loadState()
      .then((saved) => {
        if (active) {
          const initial = saved ?? createInitialState();
          current.current = initial;
          setState(initial);
          setReady(true);
          setSaveStatus("Zapisano na tym urządzeniu");
        }
      })
      .catch(() => {
        if (active) {
          writable.current = false;
          const initial = createInitialState();
          current.current = initial;
          setState(initial);
          setStorageError(
            "Nie udało się odczytać zapisu. Nie nadpisujemy Twoich danych. Spróbuj ponownie otworzyć aplikację; bieżącą sesję możesz wyeksportować.",
          );
          setSaveStatus("Zapis jest niedostępny");
          setReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (pending.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = state.settings.theme;
    document.documentElement.style.colorScheme = state.settings.theme;
  }, [state.settings.theme]);
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => navigator.serviceWorker.ready)
        .then((registration) => {
          const urls = performance
            .getEntriesByType("resource")
            .map((entry) => entry.name)
            .filter((url) => url.startsWith(location.origin));
          registration.active?.postMessage({ type: "CACHE_RESOURCES", urls });
        })
        .catch(() => {});
    }
  }, []);
  const update: Update = useCallback(
    (fn) => {
      if (!current.current) return;
      const next = { ...fn(current.current), updatedAt: Date.now() };
      current.current = next;
      setState(next);
      persist(next);
    },
    [persist],
  );
  const replace = useCallback(
    (next: UserState) => {
      epoch.current += 1;
      writable.current = true;
      current.current = next;
      setState(next);
      persist(next);
    },
    [persist],
  );
  const generation = useCallback(() => epoch.current, []);
  if (!ready)
    return (
      <main className="loading">
        <span className="brand-mark">r.</span>
        <p>Otwieramy Twój warsztat…</p>
      </main>
    );
  return (
    <LearningContext.Provider
      value={{ state, update, saveStatus, storageError, replace, generation }}
    >
      {storageError && !state.onboarding.completed && (
        <div className="global-alert" role="alert">
          {storageError}
        </div>
      )}
      {children}
    </LearningContext.Provider>
  );
}
export function useLearning() {
  const context = useContext(LearningContext);
  if (!context) throw new Error("LearningProvider missing");
  return context;
}
