import { describe, expect, it } from "vitest";
import { collectionsLessons, collectionsModule } from "@/content/collections";
import { courseModuleGate } from "@/content/learning-context";
import type {
  EvidenceEvent,
  Lesson,
  LessonStep,
  UserState,
} from "@/domain/types";
import {
  createInitialState,
  exportState,
  importState,
} from "@/persistence/state";
import { moduleGate } from "./learning";

const lesson = collectionsLessons.find(
  (item) => item.id === "vec-and-borrowing",
)!;
const step = lesson.steps.find((item) => item.id === "vec-last-gate")!;
const ordinaryModule = {
  ...collectionsModule,
  gateCriteria: [collectionsModule.gateCriteria![0]],
};

function success(overrides: Partial<EvidenceEvent> = {}): EvidenceEvent {
  return {
    id: "clean",
    lessonId: lesson.id,
    stepId: step.id,
    conceptIds: [...lesson.conceptIds],
    evaluator: "tests",
    kind: "transfer",
    passed: true,
    hints: 0,
    revealed: false,
    gate: true,
    at: 200,
    ...overrides,
  };
}

function restored(events: EvidenceEvent[]): UserState {
  const state = { ...createInitialState(), events };
  return importState(exportState(state));
}

function expectOrdinaryCredit(
  state: UserState,
  passed: boolean,
  authoredStep: LessonStep = step,
) {
  const authoredLesson: Lesson = { ...lesson, steps: [authoredStep] };
  const before = JSON.stringify(state);
  expect(courseModuleGate(state, [authoredLesson], ordinaryModule).passed).toBe(
    passed,
  );
  expect(moduleGate(state, [authoredLesson]).passed).toBe(passed);
  expect(JSON.stringify(state)).toBe(before);
}

describe("ordinary authored gate evidence", () => {
  it.each([
    "choice",
    "answer",
    "compilation",
    "exact-output",
    "manifest-contract",
  ] as const)(
    "rejects imported %s evidence for the authored collections tests gate",
    (evaluator) => {
      expectOrdinaryCredit(restored([success({ evaluator })]), false);
    },
  );

  it.each(["prediction", "fix", "recall", "assessment"] as const)(
    "rejects imported %s kind for the authored collections transfer gate",
    (kind) => {
      expectOrdinaryCredit(restored([success({ kind })]), false);
    },
  );

  it.each(["tests", undefined] as const)(
    "retains valid historical collections success with evaluator %s",
    (evaluator) => {
      expectOrdinaryCredit(restored([success({ evaluator })]), true);
    },
  );

  it.each([{ hints: 1 }, { revealed: true }])(
    "rejects clean flags after earlier saved assistance %o",
    (assistance) => {
      const earlier = success({
        id: "earlier-assistance",
        kind: "exposure",
        evaluator: undefined,
        passed: false,
        at: 100,
        ...assistance,
      });
      expectOrdinaryCredit(restored([earlier, success()]), false);
      // Imported records need not be stored in timestamp order.
      expectOrdinaryCredit(restored([success(), earlier]), false);
    },
  );

  it("does not remove a clean success earned before later assistance", () => {
    const state = restored([
      success(),
      success({ id: "later-reveal", at: 300, revealed: true }),
    ]);
    expectOrdinaryCredit(state, true);
  });

  it("does not let assistance on another ordinary ref contaminate clean credit", () => {
    const state = restored([
      success({ id: "other-ref", stepId: "vec-transfer", hints: 1, at: 100 }),
      success(),
    ]);
    expectOrdinaryCredit(state, true);
  });

  it("retains legacy ordinary v1 attribution while checking authored kind and evaluator", () => {
    const versioned = {
      ...step,
      evidence: { version: 1, conceptIds: ["ordinary-test"] },
    };
    expectOrdinaryCredit(
      restored([success({ evaluator: undefined })]),
      true,
      versioned,
    );
    expectOrdinaryCredit(
      restored([success({ evaluator: "answer" })]),
      false,
      versioned,
    );
    expectOrdinaryCredit(
      restored([success({ kind: "recall" })]),
      false,
      versioned,
    );
  });

  it("keeps exact versioned attribution requirements for ordinary gates", () => {
    const versioned = {
      ...step,
      evidence: { version: 2, conceptIds: ["ordinary-test"] },
    };
    const current = success({
      evidenceVersion: 2,
      conceptIds: ["ordinary-test"],
    });
    expectOrdinaryCredit(restored([current]), true, versioned);
    for (const overrides of [
      { evaluator: undefined },
      { evidenceVersion: undefined },
      { evidenceVersion: 1 },
      { conceptIds: [] },
      { conceptIds: ["ordinary-test", "unrelated"] },
    ]) {
      expectOrdinaryCredit(
        restored([{ ...current, ...overrides }]),
        false,
        versioned,
      );
    }
  });

  it("requires manifest-contract evidence for an authored manifest gate", () => {
    const manifest: LessonStep = {
      ...step,
      evaluator: {
        kind: "manifest-contract",
        contract: {
          document: "package",
          assertions: [{ kind: "path-present", path: ["package"] }],
        },
      },
    };
    expectOrdinaryCredit(
      restored([success({ evaluator: "manifest-contract" })]),
      true,
      manifest,
    );
    expectOrdinaryCredit(
      restored([success({ evaluator: undefined })]),
      false,
      manifest,
    );
    expectOrdinaryCredit(restored([success()]), false, manifest);
  });

  it("does not award ordinary credit for a ref with no authored step", () => {
    const state = restored([success()]);
    expect(courseModuleGate(state, [], ordinaryModule).passed).toBe(false);
  });
});
