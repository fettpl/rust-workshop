import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import * as rawCurrentCourse from "./course";
import { historicalBeforeA11 } from "./file-schema-evolution-compatibility-fixture";
const currentCourse = historicalBeforeA11(rawCurrentCourse);
import {
  acceptedPreFoundationRegistry,
  acceptedPreFoundationCourseSha256,
  historicalBeforeOwnershipFoundation,
  ownershipFoundationLessonId,
  ownershipFoundationStepIds,
} from "./ownership-foundation-compatibility-fixture";
import { historicalBeforeA10ThenA9ThenA8ThenA7ThenExistingContractRepair as historicalBeforeExistingContractRepair } from "./file-schema-evolution-compatibility-fixture";
import {
  ownershipFoundationModel,
  ownershipFoundationTransferLesson,
  ownershipFoundationTransferSteps,
} from "./ownership-foundation-transfer";
import {
  conditionalDropCanonical,
  conditionalDropHarness,
  conditionalDropStarter,
  dropSupportModule,
  nestedDropCanonical,
  nestedDropHarness,
  nestedDropStarter,
  ownershipFoundationDropSteps,
} from "./ownership-foundation-drop";
import { ownershipFoundationValueSteps } from "./ownership-foundation-values";
import { courseEvidencePolicy } from "./learning-context";
import { evaluate } from "../engine/evaluate";
import { independentCodingTaskIds } from "../engine/learning";
import {
  createInitialState,
  createStepProgress,
  stepKey,
} from "../persistence/state";

const hashJson = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

function serializedRegistry(course: typeof currentCourse) {
  return Object.fromEntries(
    acceptedPreFoundationRegistry.registryKeys.map((key) => [
      key,
      (course as unknown as Record<string, unknown>)[key],
    ]),
  );
}

describe("ownership foundation transfer integration", () => {
  it("assembles the one model plus five primary steps in the fixed order", () => {
    expect(ownershipFoundationTransferLesson.id).toBe(
      ownershipFoundationLessonId,
    );
    expect(ownershipFoundationTransferSteps.map((step) => step.id)).toEqual(
      ownershipFoundationStepIds,
    );
    expect(ownershipFoundationTransferLesson.steps).toEqual(
      ownershipFoundationTransferSteps,
    );
    expect(ownershipFoundationModel.evidenceKind).toBe("exposure");
    expect(ownershipFoundationModel.evidence?.codingTaskId).toBeUndefined();
    expect(ownershipFoundationModel.evidenceGate).toBeUndefined();

    expect(
      ownershipFoundationTransferSteps.slice(1).map((step) => step.evidence),
    ).toEqual([
      {
        version: 2,
        conceptIds: ["ownership-repair"],
        codingTaskId: "ownership/restore-after-rejection-v1",
      },
      {
        version: 2,
        conceptIds: ["scope-drop"],
        codingTaskId: "ownership/nested-drop-timeline-v1",
      },
      {
        version: 2,
        conceptIds: ["scope-drop"],
        codingTaskId: "ownership/conditional-drop-return-v1",
      },
      {
        version: 2,
        conceptIds: ["copy-semantics"],
        codingTaskId: "ownership/copy-counter-v1",
      },
      {
        version: 2,
        conceptIds: ["copy-semantics"],
        codingTaskId: "ownership/copy-array-snapshot-v1",
      },
    ]);
    expect(
      ownershipFoundationTransferSteps.slice(1).every((step) => {
        return step.evidenceGate === true && step.evaluator?.kind === "tests";
      }),
    ).toBe(true);
  });

  it("appends after the complete historical data-modeling lesson prefix", () => {
    const modeling = currentCourse.modules.find(
      (module) => module.id === "data-modeling",
    )!;
    expect(modeling.lessonIds.at(-1)).toBe(ownershipFoundationLessonId);
    expect(currentCourse.lessons.at(-1)?.id).toBe(ownershipFoundationLessonId);
    expect(ownershipFoundationTransferLesson.prerequisites).toEqual([
      "option-and-absence",
    ]);
    expect(ownershipFoundationTransferLesson.sessionStops).toEqual([
      {
        afterStepId: "ownership-restore-rejection-transfer",
        title: "Opcjonalna przerwa przed Drop i Copy",
        nextGoal:
          "Wróć do obserwacji logu i snapshotów Copy. Szacunek czasu lekcji jest orientacyjny; zachowaj zapisany postęp.",
      },
    ]);
  });

  it("projects the exact authentic pre-foundation registry without refreshing it", () => {
    const projected = historicalBeforeOwnershipFoundation(
      historicalBeforeExistingContractRepair(currentCourse),
    );
    expect(hashJson(serializedRegistry(projected))).toBe(
      acceptedPreFoundationCourseSha256,
    );
    for (const [key, expectedHash] of Object.entries(
      acceptedPreFoundationRegistry.registrySha256ByKey,
    )) {
      expect(
        hashJson((projected as unknown as Record<string, unknown>)[key]),
        key,
      ).toBe(expectedHash);
    }
    expect(projected.lessons.at(-1)?.id).toBe(
      acceptedPreFoundationRegistry.lessonQualifiedSteps.at(-1)?.lessonId,
    );
    expect(
      projected.modules.find((module) => module.id === "data-modeling")
        ?.lessonIds,
    ).toEqual(acceptedPreFoundationRegistry.module.lessonIds);
  });

  it("keeps near-miss stop edits visible instead of deleting them", () => {
    const mutated = {
      ...currentCourse,
      lessons: currentCourse.lessons.map((lesson) =>
        lesson.id !== "module-tree-paths"
          ? lesson
          : {
              ...lesson,
              sessionStops: lesson.sessionStops?.map((stop) =>
                stop.afterStepId === "paths-transfer"
                  ? { ...stop, title: `${stop.title} — zmiana` }
                  : stop,
              ),
            },
      ),
    };
    const projected = historicalBeforeOwnershipFoundation(
      historicalBeforeExistingContractRepair(mutated),
    );
    expect(hashJson(serializedRegistry(projected))).not.toBe(
      acceptedPreFoundationCourseSha256,
    );
    expect(
      projected.lessons.find((lesson) => lesson.id === "module-tree-paths")
        ?.sessionStops,
    ).toEqual([
      {
        afterStepId: "paths-transfer",
        title: "Opcjonalna przerwa po ścieżkach — zmiana",
        nextGoal:
          "Wróć do modułu, widoczności i importów, aby utrwalić granice API przed kolejną lekcją.",
      },
    ]);
  });

  it("retains the existing concept calibration and exposes exactly two families per new concept", () => {
    for (const [conceptId, familyIds] of [
      ["ownership-repair", ["ownership/restore-after-rejection-v1"]],
      [
        "scope-drop",
        [
          "ownership/nested-drop-timeline-v1",
          "ownership/conditional-drop-return-v1",
        ],
      ],
      [
        "copy-semantics",
        ["ownership/copy-counter-v1", "ownership/copy-array-snapshot-v1"],
      ],
    ] as const) {
      expect(
        currentCourse.concepts.find((concept) => concept.id === conceptId)
          ?.evidenceCalibration,
      ).toEqual({ version: 2, minimumCodingTasks: 2 });
      const actual = currentCourse.lessons
        .flatMap((lesson) => lesson.steps)
        .filter((step) => step.evidence?.conceptIds.includes(conceptId))
        .map((step) => step.evidence?.codingTaskId)
        .filter((family): family is string => family !== undefined);
      for (const family of familyIds) expect(actual).toContain(family);
    }
    const stackHeapFamilies = currentCourse.lessons
      .flatMap((lesson) => lesson.steps)
      .filter((step) => step.evidence?.conceptIds.includes("stack-heap"))
      .map((step) => step.evidence?.codingTaskId)
      .filter((family): family is string => family !== undefined)
      .filter((family) => family.startsWith("ownership/"));
    expect(stackHeapFamilies).toEqual([]);
  });

  it("adds the four Cargo stops at their exact resume boundaries", () => {
    const expected = [
      ["module-tree-paths", "paths-transfer"],
      ["module-visibility", "visibility-transfer"],
      ["imports-and-reexports", "imports-transfer"],
      ["cargo-package-integration", "cargo-modify"],
    ] as const;
    for (const [lessonId, afterStepId] of expected) {
      const lesson = currentCourse.lessons.find(
        (candidate) => candidate.id === lessonId,
      )!;
      expect(lesson.sessionStops).toEqual(
        expect.arrayContaining([expect.objectContaining({ afterStepId })]),
      );
    }
    expect(
      currentCourse.lessons.find(
        (candidate) => candidate.id === "cargo-package-integration",
      )?.sessionStops?.[0]?.afterStepId,
    ).toBe("cargo-modify");
  });

  it("keeps both Drop learners on the opaque bridge while evaluators own support", () => {
    const expected = [
      {
        step: ownershipFoundationDropSteps[0],
        starter: nestedDropStarter,
        solution: nestedDropCanonical,
        harness: nestedDropHarness,
      },
      {
        step: ownershipFoundationDropSteps[1],
        starter: conditionalDropStarter,
        solution: conditionalDropCanonical,
        harness: conditionalDropHarness,
      },
    ];
    for (const { step, starter, solution, harness } of expected) {
      expect(step.code).toBe(starter);
      expect(step.solution).toBe(solution);
      expect(step.code).toContain("__rust_workshop_hidden_tests::support");
      expect(step.code).toContain("support::DropLog");
      expect(step.solution).toContain("support::Marker");
      for (const learnerSource of [step.code, step.solution]) {
        expect(learnerSource).not.toMatch(
          /RefCell|impl\s+Drop|pub\s+mod\s+support|struct\s+DropLog|events\s*:/,
        );
      }
      expect(step.evaluator).toEqual({ kind: "tests", tests: harness });
      expect(harness).toContain(dropSupportModule);
    }
  });

  it("keeps an unavailable runner outside independent evidence", () => {
    const result = {
      status: "infrastructure-error" as const,
      stdout: "",
      stderr: "runner unavailable",
      diagnostics: [],
      durationMs: 1,
    };
    const evaluation = evaluate(repairStep().evaluator!, {
      code: repairStep().code,
      result,
    });
    expect(evaluation.passed).toBe(false);

    const state = createInitialState();
    const key = stepKey(
      ownershipFoundationLessonId,
      "ownership-restore-rejection-transfer",
    );
    state.steps[key] = {
      ...createStepProgress(repairStep().code),
      attempts: [
        {
          at: 1_000,
          code: repairStep().code ?? "",
          passed: false,
          feedback: "Próba nie wpływa na mastery.",
          result,
        },
      ],
    };
    expect(
      independentCodingTaskIds(state, "ownership-repair", courseEvidencePolicy),
    ).toEqual([]);
    expect(state.events).toEqual([]);
  });
});

function repairStep() {
  return ownershipFoundationTransferSteps[1];
}
