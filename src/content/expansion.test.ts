import { describe, expect, it } from "vitest";
import * as course from "./course";
import { validateContent } from "./validate";
import { createInitialState } from "../persistence/state";
import { moduleGate, recordEvidence } from "../engine/learning";

describe("collections, errors and Todo learning path", () => {
  it("connects the new stages and does not award mastery just for visiting", () => {
    for (const [id, prerequisite] of [
      ["collections", "data-modeling"],
      ["error-handling", "collections"],
      ["todo-project", "error-handling"],
    ]) {
      const stage = course.modules.find((item) => item.id === id);
      expect(stage, id).toBeDefined();
      expect(stage!.prerequisites).toEqual([prerequisite]);
      expect(
        moduleGate(createInitialState(), course.lessons, stage!).passed,
      ).toBe(false);
      for (const criterion of stage!.gateCriteria!) {
        expect(criterion.taskRefs.length).toBeGreaterThanOrEqual(2);
        for (const ref of criterion.taskRefs) {
          const step = course.lessons
            .find((item) => item.id === ref.lessonId)!
            .steps.find((item) => item.id === ref.stepId)!;
          expect(step.evidenceGate).toBe(true);
          expect(step.evaluator?.kind).toBe("tests");
        }
      }
    }
  });

  it("offers both spiral projects and validates every project reference", () => {
    expect("projects" in course).toBe(true);
    const projects = (
      course as typeof course & { projects: (typeof course.project)[] }
    ).projects;
    expect(projects?.map((item) => item.id)).toContain("todo-command-session");
    expect(projects?.map((item) => item.id)).toContain(course.project.id);
    const broken = {
      ...course,
      projects: [
        course.project,
        {
          ...course.project,
          id: "broken-project",
          lessonId: "missing-project-lesson",
        },
      ],
    };
    expect(
      validateContent(broken).some((error) =>
        error.includes("missing-project-lesson"),
      ),
    ).toBe(true);
  });

  it("requires listing and strict-session evidence in addition to mutations and tolerant execution", () => {
    const stage = course.modules.find((item) => item.id === "todo-project")!;
    let state = createInitialState();
    const pass = (lessonId: string, stepId: string, revealed = false) => {
      state = recordEvidence(state, {
        id: `${lessonId}/${stepId}/${revealed}`,
        conceptIds: [],
        lessonId,
        stepId,
        kind: "transfer",
        evaluator: "tests",
        gate: true,
        passed: true,
        hints: 0,
        revealed,
        at: state.updatedAt + 1,
      });
    };
    pass("todo-command-parser", "parser-add-gate");
    pass("todo-state-invariants", "state-add-done-gate");
    pass("todo-session-project", "session-run-gate");
    pass("todo-session-project", "session-blank", true);
    expect(moduleGate(state, course.lessons, stage).passed).toBe(false);
    expect(
      moduleGate(state, course.lessons, stage).criteria.filter(
        (item) => !item.passed,
      ),
    ).toHaveLength(2);
    pass("todo-state-invariants", "state-list-gate");
    pass("todo-session-project", "session-strict-gate");
    expect(moduleGate(state, course.lessons, stage).passed).toBe(true);
  });
});
