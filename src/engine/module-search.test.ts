import { describe, expect, it } from "vitest";
import { searchModules } from "./module-search";

const modules = [
  { id: "start", title: "Początek", capabilities: ["Pierwszy program"] },
  {
    id: "state",
    title: "Współdzielenie danych",
    capabilities: ["Zarządzasz pożyczkami"],
  },
  { id: "work", title: "Praca równoległa", capabilities: ["Kończysz pracę"] },
];
const lessons = [
  {
    moduleId: "state",
    title: "Strażnik dostępu",
    subtitle: "Bezpieczna zmiana",
    outcomes: ["Rozpoznasz zatruty Mutex"],
    conceptIds: ["mutex-recovery"],
    solution: "secret_solution_only",
  },
  {
    moduleId: "work",
    title: "Pożycz dane",
    subtitle: "Krótkie zadanie",
    outcomes: ["Przekaż wynik"],
    conceptIds: ["scoped-threads"],
    solution: "another_secret",
  },
];

describe("searchModules", () => {
  it("keeps the original order and identities for an empty query", () => {
    expect(searchModules(" \n ", modules, lessons)).toEqual(modules);
    expect(searchModules("", modules, lessons)[1]).toBe(modules[1]);
  });
  it("matches Polish diacritics, ł, mixed case and extra spaces", () => {
    expect(
      searchModules("  WSPOLDZIELENIE   pozyczkami ", modules, lessons),
    ).toEqual([modules[1]]);
  });
  it("finds lesson topics without requiring them in the module title", () => {
    expect(searchModules("mutex", modules, lessons)).toEqual([modules[1]]);
    expect(searchModules("scoped", modules, lessons)).toEqual([modules[2]]);
  });
  it("requires every query word within the same module and its lessons", () => {
    expect(searchModules("mutex wynik", modules, lessons)).toEqual([]);
    expect(searchModules("praca pożycz", modules, lessons)).toEqual([
      modules[2],
    ]);
  });
  it("does not index solutions or mutate catalog data", () => {
    const original = structuredClone({ modules, lessons });
    expect(searchModules("secret_solution_only", modules, lessons)).toEqual([]);
    expect(searchModules("nieistniejacy temat", modules, lessons)).toEqual([]);
    expect({ modules, lessons }).toEqual(original);
  });
});
