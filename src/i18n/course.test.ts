import { describe, expect, it } from "vitest";
import { lessons, modules, reviewExercises } from "@/content/course";
import { evaluate } from "@/engine/evaluate";
import {
  courseTextInventory,
  getLocalizedCourse,
  translateCourseText,
} from "./course";

describe("English course presentation", () => {
  it("localizes prose while preserving code and the evidence contract", () => {
    const english = getLocalizedCourse("en");
    const polish = getLocalizedCourse("pl");
    expect(polish.lessons.map((lesson) => lesson.id)).toEqual(lessons.map((lesson) => lesson.id));
    expect(english.modules.map((module) => module.id)).toEqual(
      modules.map((module) => module.id),
    );
    const source = lessons.find((lesson) => lesson.id === "first-program")!;
    const localized = english.lessons.find(
      (lesson) => lesson.id === source.id,
    )!;
    expect(localized.title).not.toBe(source.title);
    expect(localized.steps[0].prompt).not.toBe(source.steps[0].prompt);
    expect(localized.steps[0].code).toBe(source.steps[0].code);
    expect(localized.steps[0].expectedStatus).toBe(
      source.steps[0].expectedStatus,
    );
    expect(localized.steps[0].evidence).toEqual(source.steps[0].evidence);
  });

  it("preserves previously saved rubric selections", () => {
    const polish = reviewExercises["scope-drop"].evaluator!;
    const english =
      getLocalizedCourse("en").reviewExercises["scope-drop"].evaluator!;
    expect(polish.kind).toBe("rubric");
    if (polish.kind !== "rubric") return;
    expect(translateCourseText(polish.criteria[0], "en")).not.toBe(
      polish.criteria[0],
    );
    expect(
      evaluate(english, {
        answer: "My reasoning",
        rubricChecks: polish.criteria,
      }).passed,
    ).toBe(true);
  });

  it("keeps literal Rust output in English prediction choices", () => {
    const english = getLocalizedCourse("en");
    const entry = english.lessons.find(
      (lesson) => lesson.id === "first-program",
    )!;
    expect(
      entry.steps.find((step) => step.id === "entry-discover")?.choices?.[0]
        .label,
    ).toBe("`fn main()`, then `Witaj, Rust!`");
    const capture = english.lessons
      .flatMap((lesson) => lesson.steps)
      .find((step) => step.id === "capture-predict");
    expect(capture?.choices?.[0].label).toBe(
      "`miasto: Łódź`, then `po wywołaniu: Łódź`",
    );
  });

  it("preserves authored fenced Rust and inline code verbatim", () => {
    const missingSpans = [];
    for (const source of courseTextInventory()) {
      const english = translateCourseText(source, "en");
      const codeSpans = source.match(/```[\s\S]*?```|`[^`\n]+`/g) ?? [];
      for (const code of new Set(codeSpans)) {
        const sourceCount = source.split(code).length - 1;
        const englishCount = english.split(code).length - 1;
        if (englishCount < sourceCount) missingSpans.push(code);
      }
    }
    expect(missingSpans).toEqual([]);
  });

  it("keeps unformatted public API scaffolds intact in English", () => {
    const scaffolds = courseTextInventory().flatMap((source) =>
      source
        .split("\n\n")
        .filter((part) =>
          /^(?:Kontrakt publiczny:\n)?#\[derive\(|^use std::ops::Range;/.test(
            part,
          ),
        )
        .map((scaffold) => ({
          source,
          scaffold: scaffold.replace(/^Kontrakt publiczny:\n/, ""),
        })),
    );
    expect(scaffolds.length).toBeGreaterThan(0);
    for (const { source, scaffold } of scaffolds) {
      expect(translateCourseText(source, "en")).toContain(scaffold);
    }
  });

  it("distinguishes empty and nonempty Vec cases in the repair contract", () => {
    const prompt = courseTextInventory().find((text) =>
      text.startsWith("Funkcja push_and_read otrzymuje"),
    )!;
    const english = translateCourseText(prompt, "en");
    expect(english).toMatch(/for a nonempty Vec/i);
    expect(english).toMatch(/for an empty Vec/i);
    expect(english).toContain("E0502");
  });

  it("preserves exact punctuation, spaces, and Unicode in input examples", () => {
    const prompt = courseTextInventory().find((text) =>
      text.startsWith("V1 zawiera wiersze"),
    )!;
    expect(translateCourseText(prompt, "en")).toContain("  plan⇥A  ");
    const mark = courseTextInventory().find((text) =>
      text.startsWith("Funkcja mark dopisuje emoji"),
    )!;
    expect(translateCourseText(mark, "en")).toContain("🦀");
  });

  it("preserves the inclusive upper bound in the release budget check", () => {
    const prompt = courseTextInventory().find((text) =>
      text.startsWith("Uzupełnij `decide`. `Keep` wymaga"),
    )!;
    expect(translateCourseText(prompt, "en")).toContain(
      "candidate <= baseline",
    );
  });

  it("does not expose machine translation artifacts", () => {
    const artifacts = courseTextInventory().filter((source) =>
      /<unk>|♪|�/.test(translateCourseText(source, "en")),
    );
    expect(artifacts.map((text) => text.slice(0, 50))).toEqual([]);
  });

  it("translates saved feedback while preserving identifiers and diagnostic details", () => {
    expect(translateCourseText("To zadanie wymaga użycia: as_ref.", "en")).toBe(
      "This task requires: as_ref.",
    );
    expect(
      translateCourseText(
        "Składnia TOML (wiersz 3, kolumna 7): Unexpected token.",
        "en",
      ),
    ).toBe("TOML syntax (line 3, column 7): Unexpected token.");
  });
});
