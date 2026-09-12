"use client";
import { useState } from "react";
import {
  Download,
  Upload,
  Bookmark,
  NotebookPen,
  ArrowUpRight,
  Sun,
  Moon,
  Check,
} from "lucide-react";
import { useLearning } from "./learning-provider";
import {
  exportState,
  importState,
  createInitialState,
  MAX_IMPORT_BYTES,
} from "@/persistence/state";
import { lessons, concepts, sources, projects } from "@/content/course";
import { useOpenLesson } from "./overview";
import { Eyebrow, MasteryBadge } from "./ui";
import type { UserState } from "@/domain/types";
export function Journal() {
  const { state, update } = useLearning();
  const open = useOpenLesson();
  const saved = lessons.filter((l) => state.bookmarks.includes(l.id));
  const entries = Object.entries(state.notes).filter(
    ([id, note]) => id !== "personal" && note.trim(),
  );
  return (
    <div className="journal-page">
      <Eyebrow>NOTATNIK / WŁASNE MODELE</Eyebrow>
      <h1>
        Twoje odkrycia.
        <br />
        <span className="muted">Twoimi słowami.</span>
      </h1>
      <p className="lede">
        Nie musisz notować wszystkiego. Zachowaj zdanie, które pomogło Ci
        zrozumieć błąd.
      </p>
      <section className="journal-bookmarks">
        <h2>
          <Bookmark size={20} />
          Zapisane lekcje
        </h2>
        {saved.length ? (
          saved.map((l) => (
            <button
              className="bookmark-link"
              key={l.id}
              onClick={() => open(l.id)}
            >
              {l.title}
              <ArrowUpRight size={18} />
            </button>
          ))
        ) : (
          <p className="empty-note">
            Zakładka w prawym górnym rogu lekcji zapisze ją tutaj.
          </p>
        )}
      </section>
      <section>
        <h2>
          <NotebookPen size={20} />
          Notatki
        </h2>
        {entries.length ? (
          entries.map(([id, note]) => (
            <div className="journal-entry" key={id}>
              <h3>
                {lessons.find((l) => l.id === id)?.title ??
                  projects.find((project) => project.id === id)?.title ??
                  (id === "personal" ? "Luźne myśli" : id)}
              </h3>
              <label className="sr-only" htmlFor={`note-${id}`}>
                Notatka {id}
              </label>
              <textarea
                id={`note-${id}`}
                value={note}
                onChange={(e) =>
                  update((s) => ({
                    ...s,
                    notes: { ...s.notes, [id]: e.target.value },
                  }))
                }
              />
            </div>
          ))
        ) : (
          <p className="empty-note">
            Twoje obserwacje z lekcji i projektu pojawią się tutaj.
          </p>
        )}
        <label>
          Nowa myśl
          <textarea
            value={state.notes.personal ?? ""}
            onChange={(e) =>
              update((s) => ({
                ...s,
                notes: { ...s.notes, personal: e.target.value },
              }))
            }
            placeholder="Dziś zauważyłem, że…"
          />
        </label>
      </section>
    </div>
  );
}
export function SettingsView() {
  const { state, update, replace, storageError } = useLearning();
  const [message, setMessage] = useState("");
  const [candidate, setCandidate] = useState<UserState | null>(null);
  function download() {
    try {
      const blob = new Blob([exportState(state)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rust-workshop-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("Eksport zawiera kod, odpowiedzi, notatki i cały postęp.");
    } catch {
      setMessage(
        "Nie udało się przygotować eksportu. Bieżąca sesja pozostaje otwarta.",
      );
    }
  }
  async function upload(file?: File) {
    if (!file) return;
    try {
      if (file.size > MAX_IMPORT_BYTES) throw new Error("too big");
      const imported = importState(await file.text());
      setCandidate(imported);
      setMessage(
        "Plik sprawdzony. Możesz teraz zatwierdzić zastąpienie bieżącego postępu.",
      );
    } catch {
      setCandidate(null);
      setMessage(
        "Plik ma niepoprawny format, nieobsługiwaną wersję lub przekracza limit 20 MB. Bieżące dane pozostały bez zmian.",
      );
    }
  }
  return (
    <div className="settings-page">
      <Eyebrow>USTAWIENIA / TWOJE DANE</Eyebrow>
      <h1>Warsztat na Twoich zasadach.</h1>
      <section className="settings-section">
        <div>
          <h2>Wygląd i dostępność</h2>
          <p>Wybierz ustawienia, które pomagają Ci myśleć.</p>
        </div>
        <div className="settings-controls">
          <fieldset>
            <legend>Motyw</legend>
            <div className="segmented">
              {(["light", "dark"] as const).map((theme) => (
                <button
                  key={theme}
                  className={state.settings.theme === theme ? "selected" : ""}
                  aria-pressed={state.settings.theme === theme}
                  onClick={() =>
                    update((s) => ({
                      ...s,
                      settings: { ...s.settings, theme },
                    }))
                  }
                >
                  {theme === "light" ? <Sun size={16} /> : <Moon size={16} />}{" "}
                  {theme === "light" ? "Jasny" : "Ciemny"}
                </button>
              ))}
            </div>
          </fieldset>
          <label>
            Rozmiar tekstu edytora: {state.settings.editorFontSize}px
            <input
              type="range"
              min="12"
              max="24"
              value={state.settings.editorFontSize}
              onChange={(e) =>
                update((s) => ({
                  ...s,
                  settings: {
                    ...s.settings,
                    editorFontSize: Number(e.target.value),
                  },
                }))
              }
            />
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={state.settings.accessibleEditor}
              onChange={(e) =>
                update((s) => ({
                  ...s,
                  settings: {
                    ...s.settings,
                    accessibleEditor: e.target.checked,
                  },
                }))
              }
            />
            Używaj prostego edytora tekstowego
          </label>
          <p className="footnote">
            Monaco także obsługuje czytnik ekranu. Tab przenosi fokus do
            kolejnego elementu. Animacje respektują preferencję ograniczonego
            ruchu systemu.
          </p>
        </div>
      </section>
      <section className="settings-section">
        <div>
          <h2>Postęp jest Twój</h2>
          <p>
            Bez konta i synchronizacji w chmurze. Przenieś swoją naukę plikiem
            JSON.
          </p>
        </div>
        <div className="settings-controls">
          <div className="button-row">
            <button className="secondary" onClick={download}>
              <Download size={17} />
              Eksportuj postęp
            </button>
            <label className="secondary file-button">
              <Upload size={17} />
              Importuj postęp
              <input
                type="file"
                aria-label="Importuj postęp"
                accept="application/json,.json"
                onChange={(e) => {
                  void upload(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <p role="status" className="import-message">
            {message}
          </p>
          {candidate && (
            <div className="import-preview">
              <h3>
                <Check size={18} />
                Gotowy do importu
              </h3>
              <p>
                {candidate.events.length} prób ·{" "}
                {Object.keys(candidate.notes).length} notatek ·{" "}
                {candidate.bookmarks.length} zakładek
              </p>
              <p>
                Aktualny zapis zostanie zastąpiony. Najpierw możesz go
                wyeksportować.
              </p>
              <div className="button-row">
                <button
                  className="primary"
                  onClick={() => {
                    replace(candidate);
                    setCandidate(null);
                  }}
                >
                  Zastąp postęp tym plikiem
                </button>
                <button
                  className="secondary"
                  onClick={() => setCandidate(null)}
                >
                  Anuluj
                </button>
              </div>
            </div>
          )}
          <p className="footnote">
            Wersja danych: {state.schemaVersion} · Aplikacja: {state.appVersion}
            . Starsze obsługiwane zapisy migrują bez kasowania danych.
          </p>
          {storageError && <p role="alert">{storageError}</p>}
        </div>
      </section>
      <section className="settings-section">
        <div>
          <h2>Jak działa ten warsztat?</h2>
          <p>
            Treść i postęp są lokalne. Tylko kod wysłany przyciskiem „Uruchom”
            trafia do kompilatora.
          </p>
        </div>
        <div>
          <p>
            Rust Playground wykonuje kod w izolowanym środowisku z ograniczonymi
            zasobami. Do uruchomienia kodu potrzebujesz internetu. Przy awarii
            Twoje rozwiązanie nie otrzymuje negatywnej oceny.
          </p>
          <p>
            Po pierwszym otwarciu wersji produkcyjnej aplikacja udostępnia
            materiały i szkice offline. Możesz dodać ją do ekranu głównego przez
            menu przeglądarki.
          </p>
          <details className="sources">
            <summary>Źródła kursu</summary>
            {sources.map((source) => (
              <p key={source.id}>
                <a href={source.url} target="_blank" rel="noreferrer">
                  {source.title}
                </a>
                <small>
                  {source.classification} · sprawdzono {source.reviewedAt} ·{" "}
                  {source.recheckPolicy}
                </small>
              </p>
            ))}
          </details>
        </div>
      </section>
      <section className="settings-section danger-section">
        <div>
          <h2>Zacznij od nowa</h2>
          <p>Najpierw wyeksportuj postęp, jeśli chcesz do niego wrócić.</p>
        </div>
        <button
          className="secondary"
          onClick={() => {
            if (
              window.confirm(
                "Usunąć cały lokalny postęp, szkice, notatki i ustawienia? Tej operacji nie można cofnąć bez eksportu.",
              )
            )
              replace(createInitialState());
          }}
        >
          Wyzeruj cały postęp
        </button>
      </section>
      {process.env.NODE_ENV === "development" && (
        <details className="developer-inspector">
          <summary>Inspektor nauki · development</summary>
          <p>
            Dlaczego zmieniło się mastery i dlaczego zadanie wraca do kolejki?
          </p>
          {concepts.map((c) => (
            <div className="inspector-row" key={c.id}>
              <strong>{c.id}</strong>
              <MasteryBadge level={state.mastery[c.id]?.level} />
              <p>{state.mastery[c.id]?.reason ?? "Brak dowodów"}</p>
              <small>
                {state.review.find((r) => r.conceptId === c.id)?.reason ??
                  "Brak zaplanowanej powtórki"}
              </small>
            </div>
          ))}
          <pre>{JSON.stringify(state.events.slice(-10), null, 2)}</pre>
        </details>
      )}
    </div>
  );
}
