"use client";

import { Fragment, useId, useRef, useState } from "react";
import { lessons, modules } from "@/content/course";
import { getLocalizedCourse } from "@/i18n/course";
import { courseModuleGate } from "@/content/learning-context";
import { searchModules } from "@/engine/module-search";
import {
  COURSE_MAP_MODES,
  EXTENSION_GROUPS,
  mapModeForModule,
  modulesForMode,
  normalizeMapPreference,
  type CourseMapMode,
} from "@/engine/course-route";
import { useLearning } from "./learning-provider";
import { useLocale } from "./locale-provider";

export function ModulePicker({
  selectedId,
  onSelect,
  mode,
  onModeChange,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
  mode: CourseMapMode;
  onModeChange: (mode: CourseMapMode) => void;
}) {
  const { t, courseText, locale } = useLocale();
  const { state } = useLearning();
  const [query, setQuery] = useState("");
  const searchId = useId();
  const input = useRef<HTMLInputElement>(null);
  const normalizedQuery = query.trim();
  const localized = getLocalizedCourse(locale);
  const matchIds = normalizedQuery
    ? new Set(
        [
          ...searchModules(query, localized.modules, localized.lessons),
          // Older course links and notes may refer to the original module titles.
          ...searchModules(query, modules, lessons),
        ].map(({ id }) => id),
      )
    : null;
  const matches = matchIds
    ? modules.filter((module) => matchIds.has(module.id))
    : modulesForMode(normalizeMapPreference(mode), modules);
  const selected = modules.find((module) => module.id === selectedId)!;
  const selectionHidden = !matches.some((module) => module.id === selectedId);
  const clearSearch = () => {
    setQuery("");
    input.current?.focus();
  };
  const showAllModules = () => {
    setQuery("");
    onModeChange("all");
    input.current?.focus();
  };

  return (
    <section className="module-browser" aria-label={t("Moduły kursu")}>
      <div className="segmented map-mode-picker" aria-label={t("Tryb mapy")}>
        {COURSE_MAP_MODES.map((item) => (
          <button
            key={item.id}
            className={mode === item.id ? "selected" : ""}
            aria-pressed={mode === item.id}
            onClick={() => onModeChange(item.id)}
          >
            {courseText(item.label)}
          </button>
        ))}
      </div>
      <p className="module-mode-description">
        {courseText(
          COURSE_MAP_MODES.find((item) => item.id === mode)?.description,
        )}
      </p>
      <div className="module-search">
        <label htmlFor={searchId}>
          {t("Znajdź moduł lub temat")}
          <input
            ref={input}
            id={searchId}
            type="search"
            value={query}
            placeholder={t("np. własność, testy, Mutex")}
            onChange={(event) => setQuery(event.target.value)}
            aria-describedby={`${searchId}-results`}
          />
        </label>
        {query.length > 0 && (
          <button className="secondary" onClick={clearSearch}>
            {t("Wyczyść wyszukiwanie")}
          </button>
        )}
      </div>
      <p id={`${searchId}-results`} className="module-results" role="status">
        {normalizedQuery
          ? t(
              "Moduły: {0} z {1} · zakres: cały kurs (Podstawy: {2}, Rozszerzenia: {3})",
              matches.length,
              modules.length,
              matches.filter((item) => mapModeForModule(item.id) === "core")
                .length,
              matches.filter(
                (item) => mapModeForModule(item.id) === "extensions",
              ).length,
            )
          : t(
              "Widok {0}: {1} modułów",
              courseText(
                COURSE_MAP_MODES.find((item) => item.id === mode)?.label,
              ),
              matches.length,
            )}
        {matches.length === 0 &&
          t(". Spróbuj krótszej nazwy lub innego tematu.")}
      </p>
      {matches.length > 0 && (
        <div className="module-picker" aria-label={t("Wybierz moduł")}>
          {matches.map((module, index) => {
            const group =
              !normalizedQuery && mode === "extensions"
                ? EXTENSION_GROUPS.find((item) =>
                    (item.moduleIds as readonly string[]).includes(module.id),
                  )
                : undefined;
            const previous = matches[index - 1];
            const previousGroup = previous
              ? EXTENSION_GROUPS.find((item) =>
                  (item.moduleIds as readonly string[]).includes(previous.id),
                )
              : undefined;
            return (
              <Fragment key={module.id}>
                {group && group.id !== previousGroup?.id && (
                  <h3 className="module-group-heading">
                    {courseText(group.title)}
                  </h3>
                )}
                <button
                  className={module.id === selectedId ? "selected" : ""}
                  aria-pressed={module.id === selectedId}
                  onClick={() => onSelect(module.id)}
                >
                  <span className="micro">
                    {mapModeForModule(module.id) === "core"
                      ? t("PODSTAWY")
                      : t("ROZSZERZENIE")}{" "}
                    {t("· MODUŁ")}{" "}
                    {String(modules.indexOf(module) + 1).padStart(2, "0")}
                  </span>
                  <strong>{courseText(module.title)}</strong>
                  <small>
                    {t("Lekcje: ")}
                    {module.lessonIds.length} ·{" "}
                    {courseModuleGate(state, lessons, module).passed
                      ? t("Samodzielność potwierdzona")
                      : t("Dostępny")}
                  </small>
                </button>
              </Fragment>
            );
          })}
        </div>
      )}
      {selectionHidden && (
        <p className="module-selection-note">
          {t("Poniżej wybrany moduł: ")}
          <strong>{courseText(selected.title)}</strong>.{" "}
          <button className="text-button" onClick={showAllModules}>
            {t("Pokaż wszystkie moduły")}
          </button>
        </p>
      )}
    </section>
  );
}
