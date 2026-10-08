import { describe, expect, it } from "vitest";
import { foundationsLessons } from "./foundations";
import {
  courseMastery,
  evidenceForLessonStep,
  recordCourseEvidence,
} from "./learning-context";
import { evaluate } from "../engine/evaluate";
import { createInitialState } from "../persistence/state";

const outputTasks = [
  { lesson: "bindings-types", step: "mut-error" },
  { lesson: "bindings-types", step: "shadow-types" },
  { lesson: "control-flow", step: "flow-modify" },
  { lesson: "control-flow", step: "flow-transfer" },
];

describe("foundation coding evidence", () => {
  it.each(outputTasks)(
    "rejects literal output as proof of $step",
    ({ lesson, step }) => {
      const task = foundationsLessons
        .find((item) => item.id === lesson)!
        .steps.find((item) => item.id === step)!;
      const evaluator = task.evaluator!;
      if (evaluator.kind !== "exact-output")
        throw new Error("Expected output task");
      const result = {
        status: "success" as const,
        stdout: evaluator.expected,
        stderr: "",
        diagnostics: [],
        durationMs: 1,
      };
      expect(
        evaluate(evaluator, {
          code: `fn main() { print!(${JSON.stringify(evaluator.expected)}); }`,
          result,
        }).passed,
      ).toBe(false);
      expect(evaluate(evaluator, { code: task.solution, result }).passed).toBe(
        true,
      );
    },
  );

  it("requires the alternative binding task to retain mutation and control flow", () => {
    const task = foundationsLessons
      .find((item) => item.id === "control-flow")!
      .steps.find((item) => item.id === "flow-transfer")!;
    expect(
      evaluate(task.evaluator!, {
        code: 'fn main() { let band = "retry"; println!("{band}"); println!("2\\n3\\n4"); }',
        result: {
          status: "success",
          stdout: "retry\n2\n3\n4\n",
          stderr: "",
          diagnostics: [],
          durationMs: 1,
        },
      }).passed,
    ).toBe(false);
  });
});

describe("foundation attribution and learner-owned parcel work", () => {
  it("attributes early steps to the prompt-intent concept only", () => {
    const expected: Record<string, Record<string, string[]>> = {
      "first-program": {
        "entry-discover": ["program-entry"],
        "entry-run": ["program-entry"],
        "entry-modify": ["program-entry"],
        "entry-recall": ["program-entry"],
        "cargo-sequence": ["cargo-workflow"],
        "toolchain-check": ["cargo-workflow"],
      },
      "bindings-types": {
        "bindings-discover": ["bindings-mutability"],
        "scalar-predict": ["scalar-types"],
        "mut-error": ["bindings-mutability"],
        "mut-run": ["bindings-mutability"],
        "shadow-types": ["bindings-mutability"],
        "bindings-recall": ["bindings-mutability"],
      },
    };

    for (const [lessonId, steps] of Object.entries(expected)) {
      const lesson = foundationsLessons.find((item) => item.id === lessonId)!;
      for (const [stepId, conceptIds] of Object.entries(steps)) {
        expect(lesson.steps.find((step) => step.id === stepId)?.evidence).toEqual(
          { version: 1, conceptIds },
        );
      }
    }
  });

  it("records narrow current attribution without rewriting broad legacy events", () => {
    const firstProgram = foundationsLessons.find(
      (lesson) => lesson.id === "first-program",
    )!;
    const entryModify = firstProgram.steps.find(
      (step) => step.id === "entry-modify",
    )!;
    const bindings = foundationsLessons.find(
      (lesson) => lesson.id === "bindings-types",
    )!;
    const shadowTypes = bindings.steps.find(
      (step) => step.id === "shadow-types",
    )!;
    const legacyEntry = {
      id: "legacy-entry-broad",
      lessonId: "first-program",
      stepId: "entry-modify",
      conceptIds: ["program-entry", "cargo-workflow"],
      kind: "transfer" as const,
      evaluator: "exact-output" as const,
      passed: true,
      hints: 0,
      revealed: false,
      at: 1,
    };
    const legacyShadow = {
      id: "legacy-shadow-broad",
      lessonId: "bindings-types",
      stepId: "shadow-types",
      conceptIds: ["bindings-mutability", "scalar-types"],
      kind: "transfer" as const,
      evaluator: "exact-output" as const,
      passed: true,
      hints: 0,
      revealed: false,
      at: 1,
    };

    const entryEvidence = evidenceForLessonStep(firstProgram, entryModify);
    expect(entryEvidence).toEqual({
      conceptIds: ["program-entry"],
      evidenceVersion: 1,
    });
    const currentEntry = recordCourseEvidence(createInitialState(), {
      id: "current-entry-narrow",
      lessonId: "first-program",
      stepId: "entry-modify",
      ...entryEvidence,
      kind: "transfer",
      evaluator: "exact-output",
      passed: true,
      hints: 0,
      revealed: false,
      at: 1,
    });
    expect(courseMastery(currentEntry, "cargo-workflow").level).toBe("new");

    const entryState = createInitialState();
    entryState.events = [legacyEntry];
    const afterEntry = recordCourseEvidence(entryState, {
      id: "current-entry-after-legacy",
      lessonId: "first-program",
      stepId: "entry-modify",
      ...entryEvidence,
      kind: "transfer",
      evaluator: "exact-output",
      passed: true,
      hints: 0,
      revealed: false,
      at: 2,
    });
    expect(afterEntry.events[0]).toEqual(legacyEntry);
    expect(afterEntry.events.at(-1)?.conceptIds).toEqual(["program-entry"]);
    expect(courseMastery(afterEntry, "cargo-workflow").level).toBe(
      courseMastery(entryState, "cargo-workflow").level,
    );

    const shadowEvidence = evidenceForLessonStep(bindings, shadowTypes);
    expect(shadowEvidence).toEqual({
      conceptIds: ["bindings-mutability"],
      evidenceVersion: 1,
    });
    const currentShadow = recordCourseEvidence(createInitialState(), {
      id: "current-shadow-narrow",
      lessonId: "bindings-types",
      stepId: "shadow-types",
      ...shadowEvidence,
      kind: "transfer",
      evaluator: "exact-output",
      passed: true,
      hints: 0,
      revealed: false,
      at: 1,
    });
    expect(courseMastery(currentShadow, "scalar-types").level).toBe("new");

    const shadowState = createInitialState();
    shadowState.events = [legacyShadow];
    const afterShadow = recordCourseEvidence(shadowState, {
      id: "current-shadow-after-legacy",
      lessonId: "bindings-types",
      stepId: "shadow-types",
      ...shadowEvidence,
      kind: "transfer",
      evaluator: "exact-output",
      passed: true,
      hints: 0,
      revealed: false,
      at: 2,
    });
    expect(afterShadow.events[0]).toEqual(legacyShadow);
    expect(afterShadow.events.at(-1)?.conceptIds).toEqual([
      "bindings-mutability",
    ]);
    expect(courseMastery(afterShadow, "scalar-types").level).toBe(
      courseMastery(shadowState, "scalar-types").level,
    );
  });

  it("describes the parcel milestone as an open self-rated local check", () => {
    const firstProgram = foundationsLessons.find(
      (lesson) => lesson.id === "first-program",
    )!;
    const assessment = foundationsLessons.find(
      (lesson) => lesson.id === "foundations-assessment",
    )!;
    const parcel = assessment.steps.find(
      (step) => step.id === "foundations-local-parcel-program",
    );

    expect(firstProgram.transferTask).toMatch(/pacz|przesył/i);
    expect(parcel).toBeDefined();
    expect(parcel).toMatchObject({
      id: "foundations-local-parcel-program",
      kind: "apply",
      evidenceKind: "self-rating",
    });
    expect(parcel?.evidenceGate).not.toBe(true);
    expect(parcel?.evidence?.codingTaskId).toBeUndefined();
    expect(parcel?.evaluator?.kind).toBe("rubric");

    if (parcel?.evaluator?.kind !== "rubric")
      throw new Error("Expected an open rubric self-assessment");
    const learnerBrief = [
      parcel.prompt,
      ...parcel.evaluator.criteria,
      ...(parcel.rubric ?? []),
    ].join(" ");

    expect(learnerBrief).toMatch(/(?:1\s*(?:–|-)\s*5|od 1 do 5)[^.!?\n]{0,50}8/i);
    expect(learnerBrief).toMatch(/(?:6\s*(?:–|-)\s*20|od 6 do 20)[^.!?\n]{0,50}12/i);
    for (const weight of ["0", "1", "5", "6", "20", "21"])
      expect(learnerBrief).toContain(weight);
    expect(learnerBrief).toMatch(/nazw(?:ę|a).*funkcj|funkcj.*nazw/i);
    expect(learnerBrief).toMatch(/typ.*zwrac|zwrac.*typ/i);
    expect(learnerBrief).toMatch(/main/);
    expect(learnerBrief).toMatch(/cargo new/);
    expect(learnerBrief).toMatch(/cargo check/);
    expect(learnerBrief).toMatch(/cargo run/);
    expect(learnerBrief).toMatch(/cargo test/);
    expect(learnerBrief).toMatch(/#\[test\]/);
    expect(learnerBrief).toMatch(/assert_eq!/);
    expect(learnerBrief).toMatch(/5\s*[/–-]\s*6|granicy.*5.*6/i);
    expect(learnerBrief).toMatch(/invalid|nieprawidł|niepopraw/i);
    expect(learnerBrief).toMatch(/zmień|zmien|przywróć|przywroc/i);
    expect(learnerBrief).not.toMatch(/Java|Python/);
  });
});
