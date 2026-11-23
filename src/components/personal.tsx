"use client";
import { sourceClassificationLabels } from "@/i18n/ui-locale";
import { useRef, useState } from "react";
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
import { lessons, concepts, sources } from "@/content/course";
import { courseNoteTitle } from "@/content/course-notes";
import { courseMastery } from "@/content/learning-context";
import { useOpenLesson } from "./overview";
import { Eyebrow, MasteryBadge } from "./ui";
import type { UserState } from "@/domain/types";
import { useLocale } from "./locale-provider";
const ownershipConceptIds = new Set(
  lessons
    .filter((lesson) => lesson.moduleId === "ownership")
    .flatMap((lesson) => lesson.conceptIds),
);
export function Journal() {
  const { t, courseText } = useLocale();
  const { state, update } = useLearning();
  const open = useOpenLesson();
  const saved = lessons.filter((l) => state.bookmarks.includes(l.id));
  const entries = Object.entries(state.notes).filter(
    ([id, note]) => id !== "personal" && note.trim(),
  );
  return (
    <div className="journal-page">
      <Eyebrow>{t("NOTATNIK / WŁASNE MODELE")}</Eyebrow>
      <h1>
        {t("Twoje odkrycia.")}
        <br />
        <span className="muted">{t("Twoimi słowami.")}</span>
      </h1>
      <p className="lede">
        {t(
          "Nie musisz notować wszystkiego. Zachowaj zdanie, które pomogło Ci zrozumieć błąd.",
        )}
      </p>
      <section className="journal-bookmarks">
        <h2>
          <Bookmark size={20} />
          {t("Zapisane lekcje")}
        </h2>
        {saved.length ? (
          saved.map((l) => (
            <button
              className="bookmark-link"
              key={l.id}
              onClick={() => open(l.id)}
            >
              {courseText(l.title)}
              <ArrowUpRight size={18} />
            </button>
          ))
        ) : (
          <p className="empty-note">
            {t("Zakładka w prawym górnym rogu lekcji zapisze ją tutaj.")}
          </p>
        )}
      </section>
      <section>
        <h2>
          <NotebookPen size={20} />
          {t("Notatki")}
        </h2>
        {entries.length ? (
          entries.map(([id, note]) => (
            <div className="journal-entry" key={id}>
              <h3>{courseText(courseNoteTitle(id))}</h3>
              <label className="sr-only" htmlFor={`note-${id}`}>
                {t("Notatka ")}
                {courseText(courseNoteTitle(id))}
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
            {t("Twoje obserwacje z lekcji i projektu pojawią się tutaj.")}
          </p>
        )}
        <label>
          {t("Nowa myśl")}
          <textarea
            value={state.notes.personal ?? ""}
            onChange={(e) =>
              update((s) => ({
                ...s,
                notes: { ...s.notes, personal: e.target.value },
              }))
            }
            placeholder={t("Dziś zauważyłem, że…")}
          />
        </label>
      </section>
    </div>
  );
}
export function SettingsView() {
  const { t, courseText } = useLocale();
  const { state, update, replace, storageError } = useLearning();
  const [message, setMessage] = useState("");
  const [candidate, setCandidate] = useState<UserState | null>(null);
  const uploadRequest = useRef(0);
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
    const request = ++uploadRequest.current;
    setCandidate(null);
    setMessage("Sprawdzanie pliku…");
    try {
      if (file.size > MAX_IMPORT_BYTES) throw new Error("too big");
      const imported = importState(await file.text());
      if (request !== uploadRequest.current) return;
      setCandidate(imported);
      setMessage(
        "Plik sprawdzony. Możesz teraz zatwierdzić zastąpienie bieżącego postępu.",
      );
    } catch {
      if (request !== uploadRequest.current) return;
      setCandidate(null);
      setMessage(
        "Plik ma niepoprawny format, nieobsługiwaną wersję lub przekracza limit 20 MB. Bieżące dane pozostały bez zmian.",
      );
    }
  }
  return (
    <div className="settings-page">
      <Eyebrow>{t("USTAWIENIA / TWOJE DANE")}</Eyebrow>
      <h1>{t("Warsztat na Twoich zasadach.")}</h1>
      <section className="settings-section">
        <div>
          <h2>{t("Wygląd i dostępność")}</h2>
          <p>{t("Wybierz ustawienia, które pomagają Ci myśleć.")}</p>
        </div>
        <div className="settings-controls">
          <fieldset>
            <legend>{t("Motyw")}</legend>
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
                  {theme === "light" ? t("Jasny") : t("Ciemny")}
                </button>
              ))}
            </div>
          </fieldset>
          <label>
            {t("Rozmiar tekstu edytora: ")}
            {state.settings.editorFontSize}px
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
            {t("Używaj prostego edytora tekstowego")}
          </label>
          <p className="footnote">
            {t(
              "Monaco także obsługuje czytnik ekranu. Tab przenosi fokus do kolejnego elementu. Animacje respektują preferencję ograniczonego ruchu systemu.",
            )}
          </p>
        </div>
      </section>
      <section className="settings-section">
        <div>
          <h2>{t("Postęp jest Twój")}</h2>
          <p>
            {t(
              "Bez konta i synchronizacji w chmurze. Przenieś swoją naukę plikiem JSON.",
            )}
          </p>
        </div>
        <div className="settings-controls">
          <div className="button-row">
            <button className="secondary" onClick={download}>
              <Download size={17} />
              {t("Eksportuj postęp")}
            </button>
            <label className="secondary file-button">
              <Upload size={17} />
              {t("Importuj postęp")}
              <input
                type="file"
                aria-label={t("Importuj postęp")}
                accept="application/json,.json"
                onChange={(e) => {
                  void upload(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <p role="status" className="import-message">
            {t(message)}
          </p>
          {candidate && (
            <div className="import-preview">
              <h3>
                <Check size={18} />
                {t("Gotowy do importu")}
              </h3>
              <p>
                {candidate.events.length} {t("prób ·")}{" "}
                {Object.keys(candidate.notes).length} {t("notatek ·")}{" "}
                {candidate.bookmarks.length} {t("zakładek")}
              </p>
              <p>
                {t(
                  "Aktualny zapis zostanie zastąpiony. Najpierw możesz go wyeksportować.",
                )}
              </p>
              <div className="button-row">
                <button
                  className="primary"
                  onClick={() => {
                    replace(candidate);
                    setCandidate(null);
                  }}
                >
                  {t("Zastąp postęp tym plikiem")}
                </button>
                <button
                  className="secondary"
                  onClick={() => setCandidate(null)}
                >
                  {t("Anuluj")}
                </button>
              </div>
            </div>
          )}
          <p className="footnote">
            {t("Wersja danych: ")}
            {state.schemaVersion} {t("· Aplikacja: ")}
            {state.appVersion}
            {t(". Starsze obsługiwane zapisy migrują bez kasowania danych.")}
          </p>
          {storageError && <p role="alert">{storageError}</p>}
        </div>
      </section>
      <section className="settings-section">
        <div>
          <h2>{t("Jak działa ten warsztat?")}</h2>
          <p>
            {t(
              "Treść i postęp są lokalne. Tylko kod wysłany przyciskiem „Uruchom” trafia do kompilatora.",
            )}
          </p>
        </div>
        <div>
          <p>
            {t(
              "Rust Playground wykonuje kod w izolowanym środowisku z ograniczonymi zasobami. Do uruchomienia kodu potrzebujesz internetu. Przy awarii Twoje rozwiązanie nie otrzymuje negatywnej oceny.",
            )}
          </p>
          <p>
            {t(
              "Po pierwszym otwarciu wersji produkcyjnej aplikacja udostępnia materiały i szkice offline. Możesz dodać ją do ekranu głównego przez menu przeglądarki.",
            )}
          </p>
          <details className="sources">
            <summary>{t("Źródła kursu")}</summary>
            {sources.map((source) => (
              <p key={source.id}>
                <a href={source.url} target="_blank" rel="noreferrer">
                  {courseText(source.title)}
                </a>
                <small>
                  {t(sourceClassificationLabels[source.classification])} {t("· sprawdzono ")}
                  {source.reviewedAt} · {courseText(source.recheckPolicy)}
                </small>
              </p>
            ))}
          </details>
        </div>
      </section>
      <section className="settings-section danger-section">
        <div>
          <h2>{t("Zacznij od nowa")}</h2>
          <p>
            {t("Najpierw wyeksportuj postęp, jeśli chcesz do niego wrócić.")}
          </p>
        </div>
        <button
          className="secondary"
          onClick={() => {
            if (
              window.confirm(
                t(
                  "Usunąć cały lokalny postęp, szkice, notatki i ustawienia? Tej operacji nie można cofnąć bez eksportu.",
                ),
              )
            )
              replace(createInitialState());
          }}
        >
          {t("Wyzeruj cały postęp")}
        </button>
      </section>
      {process.env.NODE_ENV === "development" && (
        <details className="developer-inspector">
          <summary>{t("Inspektor nauki · development")}</summary>
          <p>
            {t(
              "Dlaczego zmieniło się mastery i dlaczego zadanie wraca do kolejki?",
            )}
          </p>
          {concepts.map((c) => (
            <div className="inspector-row" key={c.id}>
              <strong>{c.id}</strong>
              <MasteryBadge
                level={courseMastery(state, c.id).level}
                scope={
                  c.evidenceCalibration
                    ? ownershipConceptIds.has(c.id)
                      ? "ownership"
                      : "calibrated"
                    : undefined
                }
              />
              <p>{courseText(courseMastery(state, c.id).reason)}</p>
              <small>
                {t(
                  courseText(
                    state.review.find((r) => r.conceptId === c.id)?.reason,
                  ) || "Brak zaplanowanej powtórki",
                )}
              </small>
            </div>
          ))}
          <pre>{JSON.stringify(state.events.slice(-10), null, 2)}</pre>
        </details>
      )}
    </div>
  );
}
