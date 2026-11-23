import { describe, expect, it } from "vitest";
import type { LessonStep } from "@/domain/types";
import {
  courseTextInventory,
  getLocalizedCourse,
  translateCourseText,
} from "./course";

function localizedStep(lessonId: string, stepId: string): LessonStep {
  const step = getLocalizedCourse("en")
    .lessons.find((lesson) => lesson.id === lessonId)
    ?.steps.find((item) => item.id === stepId);
  if (!step) throw new Error(`Missing course step ${lessonId}/${stepId}`);
  return step;
}

describe("English course exercise literals", () => {
  it("shows the same exact messages specified by the club exercise's Rust tests", () => {
    const step = localizedStep("cargo-package-integration", "cargo-blank");
    expect(step.evaluator?.kind).toBe("tests");
    if (step.evaluator?.kind !== "tests") return;

    for (const literal of ["Witaj, {}!", "brak nazwy", "nazwa zajęta"]) {
      expect(step.evaluator.tests).toContain(JSON.stringify(literal));
      expect(step.prompt).toContain(literal.replace("{}", "NAME"));
    }
  });

  it("predicts the undelivered value actually used by the sender", () => {
    const step = localizedStep("channel-backpressure", "backpressure-predict");
    expect(step.code).toContain('String::from("drugi")');
    const correctId =
      step.evaluator?.kind === "choice" && step.evaluator.correct;
    expect(step.choices?.find(({ id }) => id === correctId)?.label).toContain(
      'TrySendError::Full("drugi")',
    );
  });

  it("refers to the same join method in the thread code and prediction", () => {
    const step = localizedStep("thread-move", "move-predict");
    expect(step.code).toContain("handle.join()");
    expect(step.prompt).toMatch(/\bjoin\b/);
    const correctId =
      step.evaluator?.kind === "choice" && step.evaluator.correct;
    expect(step.choices?.find(({ id }) => id === correctId)?.label).toMatch(
      /\bjoin\b/,
    );
  });

  it.each([
    ["module-tree-paths", "paths-modify", ["Notatka:"]],
    ["module-tree-paths", "paths-transfer", ["Gość:"]],
    ["imports-and-reexports", "imports-debug", ["Wiadomość:"]],
    [
      "cargo-package-integration",
      "cargo-modify",
      ["przyjęto: LABEL", "brak etykiety", "jedna linia"],
    ],
    ["trait-contracts", "contracts-tags", ["<ukryte>"]],
    ["trait-contracts", "contracts-status", ["gotowy", "czeka", "wstrzymano:"]],
    ["testing-regressions", "regressions-debug-gate", ["łagodnie"]],
    [
      "testing-regressions",
      "regressions-discover",
      ["zimno", "łagodnie", "gorąco"],
    ],
    ["trait-dispatch", "dispatch-blank", ["LABEL: ok"]],
    [
      "dependency-source-license-policy",
      "dependency-source-license-policy-reason-transfer",
      ["registry"],
    ],
    ["blank-page-repair", "blank-code", ["status: ready", "status: waiting"]],
    [
      "property-generated-inputs",
      "property-generated-inputs-repair",
      ["0 INFO ok", "bad INFO broken", "1 WARN retry"],
    ],
  ] as const)(
    "preserves the fixture literals for %s/%s",
    (lessonId, stepId, literals) => {
      const { prompt } = localizedStep(lessonId, stepId);
      for (const literal of literals) expect(prompt).toContain(`\`${literal}`);
    },
  );

  it.each([
    ["review-module-paths", ["Roślina:"]],
    ["review-cargo-targets", ["pusty", "aktywny"]],
    ["review-trait-contract", ["usunięto:"]],
  ] as const)(
    "preserves the Rust review exercise's literals in %s",
    (id, literals) => {
      const { prompt, evaluator } =
        getLocalizedCourse("en").reviewExercisesById[id];
      expect(evaluator?.kind).toBe("tests");
      if (evaluator?.kind !== "tests") return;

      for (const literal of literals) {
        expect(evaluator.tests).toContain(literal);
        expect(prompt).toContain(`\`${literal}`);
      }
    },
  );

  it("keeps Rust's expect method in restrictions on unwrap and expect", () => {
    const restrictions = courseTextInventory().filter((source) =>
      /\bunwrap\s+(?:ani|albo|lub|i|oraz)\s+expect\b/.test(source),
    );
    expect(restrictions.length).toBeGreaterThan(0);

    const changed = restrictions.filter(
      (source) => !/\bexpect\b/.test(translateCourseText(source, "en")),
    );
    expect(changed).toEqual([]);
  });
});
