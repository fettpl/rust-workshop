"use client";

import { Fragment, useId, useRef, useState } from "react";
import { lessons, modules } from "@/content/course";
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
  const { state } = useLearning();
  const [query, setQuery] = useState("");
  const searchId = useId();
  const input = useRef<HTMLInputElement>(null);
  const normalizedQuery = query.trim();
  const matches = normalizedQuery
    ? searchModules(query, modules, lessons)
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
    <section className="module-browser" aria-label="Moduły kursu">
      <div className="segmented map-mode-picker" aria-label="Tryb mapy">
        {COURSE_MAP_MODES.map((item) => (
          <button
            key={item.id}
            className={mode === item.id ? "selected" : ""}
            aria-pressed={mode === item.id}
            onClick={() => onModeChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <p className="module-mode-description">
        {COURSE_MAP_MODES.find((item) => item.id === mode)?.description}
      </p>
      <div className="module-search">
        <label htmlFor={searchId}>
          Znajdź moduł lub temat
          <input
            ref={input}
            id={searchId}
            type="search"
            value={query}
            placeholder="np. pożyczanie, testy, Mutex"
            onChange={(event) => setQuery(event.target.value)}
            aria-describedby={`${searchId}-results`}
          />
        </label>
        {query.length > 0 && (
          <button className="secondary" onClick={clearSearch}>
            Wyczyść wyszukiwanie
          </button>
        )}
      </div>
      <p id={`${searchId}-results`} className="module-results" role="status">
        {normalizedQuery
          ? `Moduły: ${matches.length} z ${modules.length} · zakres: cały kurs (Podstawy: ${matches.filter((item) => mapModeForModule(item.id) === "core").length}, Rozszerzenia: ${matches.filter((item) => mapModeForModule(item.id) === "extensions").length})`
          : `Widok ${COURSE_MAP_MODES.find((item) => item.id === mode)?.label}: ${matches.length} modułów`}
        {matches.length === 0 && ". Spróbuj krótszej nazwy lub innego tematu."}
      </p>
      {matches.length > 0 && (
        <div className="module-picker" aria-label="Wybierz moduł">
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
                  <h3 className="module-group-heading">{group.title}</h3>
                )}
                <button
                  className={module.id === selectedId ? "selected" : ""}
                  aria-pressed={module.id === selectedId}
                  onClick={() => onSelect(module.id)}
                >
                  <span className="micro">
                    {mapModeForModule(module.id) === "core"
                      ? "PODSTAWY"
                      : "ROZSZERZENIE"}{" "}
                    · MODUŁ{" "}
                    {String(modules.indexOf(module) + 1).padStart(2, "0")}
                  </span>
                  <strong>{module.title}</strong>
                  <small>
                    Lekcje: {module.lessonIds.length} ·{" "}
                    {courseModuleGate(state, lessons, module).passed
                      ? "Samodzielność potwierdzona"
                      : "Dostępny"}
                  </small>
                </button>
              </Fragment>
            );
          })}
        </div>
      )}
      {selectionHidden && (
        <p className="module-selection-note">
          Poniżej wybrany moduł: <strong>{selected.title}</strong>.{" "}
          <button className="text-button" onClick={showAllModules}>
            Pokaż wszystkie moduły
          </button>
        </p>
      )}
    </section>
  );
}
