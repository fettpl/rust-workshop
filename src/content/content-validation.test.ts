import { describe, expect, it } from "vitest";
import { evaluate } from "../engine/evaluate";
import {
  lessons,
  concepts,
  competencies,
  ownershipModule,
  modules,
  reviewExercises,
  sources,
  traces,
  project,
  projects,
  roadmap,
} from "./course";
import { validateContent, type ContentBundle } from "./validate";

const bundle: ContentBundle = {
  lessons,
  concepts,
  competencies,
  modules,
  reviewExercises,
  sources,
  traces,
  project,
  projects,
  roadmap,
};

describe("curriculum content contract", () => {
  it("ships a valid, connected learning graph", () => {
    expect(validateContent(bundle)).toEqual([]);
    expect(lessons.length).toBeGreaterThanOrEqual(6);
    expect(ownershipModule.lessonIds.length).toBeLessThanOrEqual(9);
    expect(
      lessons.every(
        (lesson) => lesson.steps.length >= 5 && lesson.steps.length <= 8,
      ),
    ).toBe(true);
    expect(
      lessons.some((lesson) =>
        lesson.steps.some((step) => step.evidenceKind === "recall"),
      ),
    ).toBe(true);
    expect(lessons.some((lesson) => lesson.id.includes("adversarial"))).toBe(
      true,
    );
    expect(project.adversarialInject.toLowerCase()).toContain("clone");
  });

  it("reports duplicate IDs and missing references instead of silently accepting them", () => {
    const broken: ContentBundle = {
      ...bundle,
      lessons: [...lessons, lessons[0]],
      modules: [
        {
          ...ownershipModule,
          lessonIds: [...ownershipModule.lessonIds, "missing-lesson"],
        },
      ],
    };
    const errors = validateContent(broken);
    expect(errors.some((error) => error.includes("duplicate lesson id"))).toBe(
      true,
    );
    expect(errors.some((error) => error.includes("unknown lesson id"))).toBe(
      true,
    );
  });

  it("rejects authored code without an expected compiler contract", () => {
    const lesson = lessons.find((item) =>
      item.steps.some((step) => step.code),
    )!;
    const step = lesson.steps.find((item) => item.code)!;
    const broken: ContentBundle = {
      ...bundle,
      lessons: lessons.map((item) =>
        item.id === lesson.id
          ? {
              ...item,
              steps: item.steps.map((candidate) =>
                candidate.id === step.id
                  ? { ...candidate, expectedStatus: undefined }
                  : candidate,
              ),
            }
          : item,
      ),
    };
    expect(
      validateContent(broken).some((error) => error.includes("expectedStatus")),
    ).toBe(true);
  });

  it("catches prerequisite cycles and missing transfer evidence", () => {
    const broken: ContentBundle = {
      ...bundle,
      concepts: concepts.map((concept) =>
        concept.id === "stack-heap"
          ? { ...concept, prerequisites: ["scope-drop"] }
          : concept,
      ),
      lessons: lessons.map((lesson) =>
        lesson.id === "memory-intro"
          ? { ...lesson, transferTask: "", evidenceGate: "" }
          : lesson,
      ),
    };
    const errors = validateContent(broken);
    expect(
      errors.some((error) => error.includes("concept prerequisite cycle")),
    ).toBe(true);
    expect(errors.some((error) => error.includes("missing transferTask"))).toBe(
      true,
    );
    expect(errors.some((error) => error.includes("missing evidenceGate"))).toBe(
      true,
    );
  });

  it("requires executable tests rather than a prose test placeholder", () => {
    const lesson = lessons.find((item) => item.id === "blank-page-repair")!;
    const broken: ContentBundle = {
      ...bundle,
      lessons: lessons.map((item) =>
        item.id === lesson.id
          ? {
              ...item,
              steps: item.steps.map((candidate) =>
                candidate.id === "blank-code"
                  ? {
                      ...candidate,
                      evaluator: {
                        kind: "tests" as const,
                        tests: "expected output",
                      },
                    }
                  : candidate,
              ),
            }
          : item,
      ),
    };
    expect(
      validateContent(broken).some((error) =>
        error.includes("must contain a Rust #[test]"),
      ),
    ).toBe(true);
  });

  it("validates module gate task references and keeps rubric refs supplementary", () => {
    const broken: ContentBundle = {
      ...bundle,
      modules: [
        {
          ...ownershipModule,
          gateCriteria: [
            {
              id: "broken",
              label: "Broken",
              taskRefs: [{ lessonId: "missing", stepId: "task" }],
              supplementaryStepRefs: [
                { lessonId: "move-copy-discovery", stepId: "move-predict" },
              ],
            },
          ],
        },
      ],
    };
    const errors = validateContent(broken);
    expect(errors.some((error) => error.includes("unknown lesson id"))).toBe(
      true,
    );
    expect(
      errors.some(
        (error) => error.includes("supplementary") && error.includes("rubric"),
      ),
    ).toBe(true);
  });

  it("keeps repair gates tied to a changed solution and an observable result", () => {
    const repairIds = [
      "move-error",
      "function-error",
      "borrow-conflict",
      "project-error",
      "blank-error",
      "adversarial-conflict",
      "assessment-repair",
    ];
    for (const id of repairIds) {
      const step = lessons
        .flatMap((lesson) => lesson.steps)
        .find((candidate) => candidate.id === id);
      expect(step?.code, id).toBeTruthy();
      expect(step?.solution, id).toBeTruthy();
      expect(step?.solution, id).not.toBe(step?.code);
      expect(step?.expectedStatus, id).toBe("compile-error");
      expect(step?.expectedError, id).toMatch(/^E0/);
      expect(
        step?.evaluator &&
          evaluate(step.evaluator, {
            code: step.code,
            result: {
              status: "compile-error",
              stdout: "",
              stderr: "borrow of moved value",
              diagnostics: [
                {
                  level: "error",
                  code: step.expectedError,
                  message: "borrow of moved value",
                },
              ],
              durationMs: 0,
            },
          }).passed,
        id,
      ).toBe(false);
    }
  });

  it("validates every module and rejects cross-module ownership and cycles", () => {
    const second = {
      ...ownershipModule,
      id: "second",
      lessonIds: [],
      prerequisites: [ownershipModule.id],
      assessmentId: `${lessons[0].id}/${lessons[0].steps[0].id}`,
      gateCriteria: [],
    };
    const errors = validateContent({
      ...bundle,
      modules: [{ ...ownershipModule, prerequisites: [second.id] }, second],
    } as ContentBundle);
    expect(
      errors.some((error) => error.includes("module prerequisite cycle")),
    ).toBe(true);
    expect(
      errors.some((error) => error.includes("assessment outside module")),
    ).toBe(true);
  });

  it("rejects a lesson listed under a different module", () => {
    const errors = validateContent({
      ...bundle,
      modules: [
        ownershipModule,
        {
          ...ownershipModule,
          id: "other-module",
          lessonIds: [lessons[0].id],
          prerequisites: [],
        },
      ],
    } as ContentBundle);
    expect(
      errors.some((error) => error.includes("declares another module")),
    ).toBe(true);
  });

  it("rejects repeated retrieval placeholders and missing active reviews", () => {
    const errors = validateContent({
      ...bundle,
      concepts: concepts.map((concept) => ({
        ...concept,
        reviewAnswer: "A generic answer for everything.",
      })),
      reviewExercises: {},
    });
    expect(
      errors.some((error) => error.includes("duplicate retrieval answer")),
    ).toBe(true);
    expect(
      errors.some((error) => error.includes("no active review exercise")),
    ).toBe(true);
  });
});
