import { describe, expect, it } from "vitest";
import {
  lessons,
  concepts,
  modules,
  projects,
  project,
  reviewExercises,
} from "./course";
import { recordCourseEvidence } from "./learning-context";
import { createInitialState } from "../persistence/state";
import { moduleGate } from "../engine/learning";
import { auditLessonEvidence } from "../domain/lesson-evidence-role";
import type { EvidenceEvent, LessonStep } from "../domain/types";

describe("bounded client retry policy", () => {
  it("gives both authored lessons a non-rubric primary evidence gate", () => {
    const audit = auditLessonEvidence({
      lessons,
      modules,
      projects: [...projects, project],
    });
    expect(audit.lessonsWithoutEvidence).toEqual([]);
    expect(audit.errors).toEqual([]);

    const primaryByLesson = {
      "service-client-bounded-retry": [
        "service-client-retry-next-action",
        "service-client-retry-budget-reservation",
      ],
      "service-client-ambiguous-driver": [
        "service-client-immutable-frame-replay",
        "service-client-aggregate-uncertainty",
      ],
    } as const;
    for (const [lessonId, expectedIds] of Object.entries(primaryByLesson)) {
      const lesson = lessons.find((item) => item.id === lessonId)!;
      const primary = lesson.steps.filter(
        (step) => step.evidenceGate === true,
      );
      expect(primary.map((step) => step.id)).toEqual(expectedIds);
      expect(
        primary.every(
          (step) =>
            step.kind !== "recall" && step.evaluator?.kind !== "rubric",
        ),
      ).toBe(true);
      expect(
        lesson.steps
          .filter(
            (step) =>
              step.kind === "recall" || step.evaluator?.kind === "rubric",
          )
          .every((step) => step.evidenceGate !== true),
      ).toBe(true);
    }
    for (const id of [
      "service-client-retry-policy",
      "service-client-ambiguity-contract",
    ])
      expect(reviewExercises[id]?.evidenceGate).not.toBe(true);
  });

  it("appends exactly the two lessons with four primary and four recovery families", () => {
    const added = lessons.filter((lesson) => lesson.moduleId === "service-client-retry");
    expect(added.map((lesson) => lesson.id)).toEqual([
      "service-client-bounded-retry",
      "service-client-ambiguous-driver",
    ]);
    expect(modules.find((module) => module.id === "service-client-retry")?.lessonIds).toEqual(added.map((lesson) => lesson.id));
    expect(concepts.filter((concept) => concept.id.startsWith("service-client-")).map((concept) => concept.id)).toEqual([
      "service-client-retry-policy",
      "service-client-ambiguity-contract",
    ]);
    expect(added.flatMap((lesson) => lesson.steps).filter((step) => step.evidence?.codingTaskId).map((step) => step.evidence?.codingTaskId)).toEqual([
      "service-client/retry-next-action-v1",
      "service-client/retry-budget-reservation-v1",
      "service-client/retry-next-action-v1",
      "service-client/retry-budget-reservation-v1",
      "service-client/retry-ready-queue-v1",
      "service-client/retry-time-windows-v1",
      "service-client/immutable-frame-replay-v1",
      "service-client/aggregate-uncertainty-v1",
      "service-client/immutable-frame-replay-v1",
      "service-client/aggregate-uncertainty-v1",
      "service-client/retry-replica-frame-v1",
      "service-client/retry-receipt-ledger-v1",
    ]);
    const primarySteps = added.flatMap((lesson) => lesson.steps).filter((step) => step.evidence?.codingTaskId && step.kind !== "recall");
    expect(primarySteps.every((step) => step.code && step.solution && step.code !== step.solution)).toBe(true);
    expect(primarySteps.map((step) => step.solution)).toEqual(expect.arrayContaining([
      expect.stringContaining("NotAttempted"),
      expect.stringContaining("attempts_started"),
      expect.stringContaining("FnMut"),
      expect.stringContaining("Final::Unknown"),
    ]));
    expect(new Set(primarySteps.map((step) => step.evidence?.codingTaskId)).size).toBe(8);
    expect(added.every((lesson) => lesson.steps.some((step) => step.kind === "predict" && step.evidenceKind === "prediction"))).toBe(true);
    expect(added.every((lesson) => lesson.steps.some((step) => step.kind === "recall" && step.evaluator?.kind === "rubric" && step.evidenceKind === "self-rating"))).toBe(true);
    const byFamily = new Map(primarySteps.map((step) => [step.evidence?.codingTaskId, step.solution ?? ""]));
    expect(byFamily.get("service-client/retry-next-action-v1")).toMatch(/QUEUE_FULL|NotAttempted|attempts_started/);
    expect(byFamily.get("service-client/retry-budget-reservation-v1")).toMatch(/Reservation|StopReason|checked_add|attempts_started/);
    expect(byFamily.get("service-client/immutable-frame-replay-v1")).toMatch(/Receipt|Inserted|Duplicate|Delivered|Refused|Transport|NotAttempted/);
    expect(byFamily.get("service-client/aggregate-uncertainty-v1")).toMatch(/Receipt|Inserted|Duplicate|TerminalRefusal|Unknown|NotAttempted|LastObservation/);
  });

  it("binds four fresh coding families and supplementary rubrics to the real course gate", () => {
    const stage = modules.find((module) => module.id === "service-client-retry")!;
    const stepFor = (lessonId: string, stepId: string): LessonStep =>
      lessons.find((lesson) => lesson.id === lessonId)!.steps.find((step) => step.id === stepId)!;
    const eventFor = (id: string, lessonId: string, stepId: string, at: number, overrides: Partial<EvidenceEvent> = {}): EvidenceEvent => {
      const step = stepFor(lessonId, stepId);
      return {
        id,
        lessonId,
        stepId,
        conceptIds: [...step.evidence!.conceptIds],
        evidenceVersion: step.evidence!.version,
        kind: step.evidenceKind,
        passed: true,
        hints: 0,
        revealed: false,
        gate: true,
        evaluator: step.evaluator?.kind,
        at,
        ...overrides,
      };
    };

    let state = createInitialState();
    state = recordCourseEvidence(state, eventFor("same-family-primary", "service-client-bounded-retry", "service-client-retry-next-action", 1));
    state = recordCourseEvidence(state, eventFor("same-family-blank", "service-client-bounded-retry", "bounded-retry-blank", 2));
    state = recordCourseEvidence(state, eventFor("same-family-recall", "service-client-bounded-retry", "bounded-retry-recall", 3));
    state = recordCourseEvidence(state, eventFor("same-family-help", "service-client-bounded-retry", "service-client-retry-budget-reservation", 4, { hints: 1 }));
    state = recordCourseEvidence(state, eventFor("same-family-revealed", "service-client-bounded-retry", "service-client-retry-budget-reservation", 5, { revealed: true }));
    state = recordCourseEvidence(state, eventFor("same-family-rubric", "service-client-bounded-retry", "bounded-retry-observe", 6, { kind: "self-rating", evaluator: "rubric", gate: false }));
    expect(moduleGate(state, lessons, stage).passed).toBe(false);
    expect(moduleGate(state, lessons, stage).criteria.filter((criterion) => criterion.passed)).toHaveLength(1);

    state = createInitialState();
    for (const [index, ref] of stage.gateCriteria!.map((criterion) => criterion.taskRefs[0]).entries()) {
      state = recordCourseEvidence(state, eventFor(`fresh-family-${index}`, ref.lessonId, ref.stepId, 10 + index));
    }
    for (const [index, ref] of stage.gateCriteria!.flatMap((criterion) => criterion.supplementaryStepRefs ?? []).entries()) {
      state = recordCourseEvidence(state, eventFor(`supplementary-rubric-${index}`, ref.lessonId, ref.stepId, 20 + index, { kind: "self-rating", evaluator: "rubric", gate: false }));
    }
    expect(moduleGate(state, lessons, stage).passed).toBe(true);
    expect(moduleGate(state, lessons, stage).criteria.every((criterion) => criterion.passed)).toBe(true);
  });
});
