"use client";

import { useId, useRef, useState } from "react";
import { lessons, modules } from "@/content/course";
import { moduleGate } from "@/engine/learning";
import { searchModules } from "@/engine/module-search";
import { useLearning } from "./learning-provider";

export function ModulePicker({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const { state } = useLearning();
  const [query, setQuery] = useState("");
  const searchId = useId();
  const input = useRef<HTMLInputElement>(null);
  const matches = searchModules(query, modules, lessons);
  const selected = modules.find((module) => module.id === selectedId)!;
  const selectionHidden = !matches.some((module) => module.id === selectedId);
  const clearSearch = () => {
    setQuery("");
    input.current?.focus();
  };

  return (
    <section className="module-browser" aria-label="Moduły kursu">
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
        Moduły: {matches.length} z {modules.length}
        {matches.length === 0 && ". Spróbuj krótszej nazwy lub innego tematu."}
      </p>
      {matches.length > 0 && (
        <div className="module-picker" aria-label="Wybierz moduł">
          {matches.map((module) => (
            <button
              key={module.id}
              className={module.id === selectedId ? "selected" : ""}
              aria-pressed={module.id === selectedId}
              onClick={() => onSelect(module.id)}
            >
              <span className="micro">
                MODUŁ {String(modules.indexOf(module) + 1).padStart(2, "0")}
              </span>
              <strong>{module.title}</strong>
              <small>
                Lekcje: {module.lessonIds.length} ·{" "}
                {moduleGate(state, lessons, module).passed
                  ? "Samodzielność potwierdzona"
                  : "Dostępny"}
              </small>
            </button>
          ))}
        </div>
      )}
      {selectionHidden && (
        <p className="module-selection-note">
          Poniżej wybrany moduł: <strong>{selected.title}</strong>.{" "}
          <button className="text-button" onClick={clearSearch}>
            Pokaż wszystkie moduły
          </button>
        </p>
      )}
    </section>
  );
}
