import { describe, expect, it } from "vitest";
import { lessons, modules, project, projects } from "./course";
import { project as legacyProject } from "./catalog";
import { revealProjectSolution } from "../domain/project-package";
import {
  createInitialState,
  createStepProgress,
  exportState,
  importState,
  stepKey,
} from "../persistence/state";
import { moduleGate, recordEvidence } from "../engine/learning";

describe("Number Guessing+ extends the existing portfolio project", () => {
  it("preserves the original project lessons and their saved step order", () => {
    const previous = [
      [
        "number-guessing-transfer",
        [
          "project-contract",
          "project-result-run",
          "project-blank",
          "project-error",
          "project-reasoning",
          "project-check",
        ],
      ],
      [
        "adversarial-no-clone",
        [
          "adversarial-diagnose",
          "adversarial-code",
          "adversarial-conflict",
          "adversarial-reason",
          "adversarial-trace",
          "adversarial-transfer",
        ],
      ],
    ] as const;
    const positions = previous.map(([id, stepIds]) => {
      const index = lessons.findIndex((lesson) => lesson.id === id);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(lessons[index].steps.map((step) => step.id)).toEqual(stepIds);
      return project.lessonIds!.indexOf(id);
    });
    expect(positions).toEqual([0, 1]);
  });

  it("retains the original project identity, notes and exact old lesson resume", () => {
    expect(project.id).toBe(legacyProject.id);
    expect(projects[0]).toBe(project);
    expect(
      projects.filter((item) => item.id === legacyProject.id),
    ).toHaveLength(1);
    expect(project.package?.id).toBe("number-guessing-workshop");
    expect(project.lessonIds).toEqual(
      expect.arrayContaining([
        legacyProject.lessonId,
        legacyProject.adversarialLessonId,
        "guess-input-contract",
        "guess-round-state",
        "guess-session-io",
        "guess-random-boundary",
      ]),
    );
    const initial = createInitialState();
    const key = stepKey("number-guessing-transfer", "project-blank");
    initial.resume = {
      ...initial.resume,
      view: "lesson",
      lessonId: legacyProject.lessonId,
      stepIndex: 2,
      panel: "code",
    };
    initial.notes[legacyProject.id] = "Moja wcześniejsza decyzja o własności.";
    initial.steps[key] = {
      ...createStepProgress("fn my_original_draft() {}"),
      hints: 1,
    };
    const restored = importState(exportState(initial));
    expect(restored.resume).toEqual(initial.resume);
    expect(restored.notes[project.id]).toBe(initial.notes[legacyProject.id]);
    expect(restored.steps[key]).toEqual(initial.steps[key]);
    expect(project.lessonIds).toContain(restored.resume.lessonId);
  });

  it("keeps all four new blank tasks independent after the package reference is shown", () => {
    const stage = modules.find((item) => item.id === "number-guessing-plus");
    expect(stage).toBeDefined();
    expect(stage!.prerequisites).toEqual(["testing-quality"]);
    expect(stage!.gateCriteria).toHaveLength(4);
    const archive = project.package!;
    expect(archive.revealStepRefs.map((ref) => ref.stepId)).toEqual(
      stage!.lessonIds.map((id) => `${id}-gate`),
    );
    const initial = createInitialState();
    const oldKey = stepKey("number-guessing-transfer", "project-blank");
    initial.steps[oldKey] = {
      ...createStepProgress("fn saved_draft() {}"),
      completed: true,
    };
    let state = revealProjectSolution(
      initial,
      archive,
      lessons,
      initial.updatedAt + 1,
    );
    expect(state.steps[oldKey]).toEqual(initial.steps[oldKey]);
    expect(moduleGate(state, lessons, stage!).passed).toBe(false);
    expect(state.events).toHaveLength(4);
    for (const criterion of stage!.gateCriteria!) {
      expect(criterion.taskRefs).toHaveLength(2);
      const fresh = criterion.taskRefs.filter(
        (ref) => !state.steps[stepKey(ref.lessonId, ref.stepId)]?.revealed,
      );
      expect(fresh).toHaveLength(1);
      const ref = fresh[0];
      const lesson = lessons.find((item) => item.id === ref.lessonId)!;
      const step = lesson.steps.find((item) => item.id === ref.stepId)!;
      expect(step.kind).toBe("blank");
      expect(step.code).toBeUndefined();
      expect(step.evaluator?.kind).toBe("tests");
      state = recordEvidence(state, {
        id: `guessing-independent/${step.id}`,
        lessonId: lesson.id,
        stepId: step.id,
        conceptIds: lesson.conceptIds,
        kind: step.evidenceKind,
        evaluator: "tests",
        gate: true,
        passed: true,
        hints: 0,
        revealed: false,
        at: state.updatedAt + 1,
      });
    }
    expect(moduleGate(state, lessons, stage!).passed).toBe(true);
  });
});
