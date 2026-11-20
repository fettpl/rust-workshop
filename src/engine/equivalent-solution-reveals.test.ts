import { describe, expect, it } from "vitest";
import { lessons, modules } from "@/content/course";
import { todoLessons, todoModule } from "@/content/todo-project";
import {
  assistanceForLessonStep,
  courseModuleGate,
  courseGateRecovery,
  recordSuppliedSolutions,
  recordCourseLessonExposure,
} from "@/content/learning-context";
import type { EvidenceEvent, Lesson, ProjectPackage } from "@/domain/types";
import { revealProjectPackageVariant } from "@/domain/project-package";
import {
  createInitialState,
  createStepProgress,
  exportState,
  importState,
  stepKey,
} from "@/persistence/state";
import {
  gateRecovery,
  hasEquivalentSolutionReveal,
  moduleGate,
} from "./learning";

const cases = [
  ["todo-command-parser", "parser-debug", "parser-add-gate", 0],
  ["todo-state-invariants", "state-debug", "state-add-done-gate", 1],
  ["todo-state-invariants", "state-debug", "state-list-gate", 2],
  ["todo-session-project", "session-debug", "session-run-gate", 3],
  ["todo-session-project", "session-debug", "session-strict-gate", 4],
] as const;

function context(lessonId: string, sourceId: string, targetId: string) {
  const lesson = lessons.find((item) => item.id === lessonId)!;
  return {
    lesson,
    source: lesson.steps.find((item) => item.id === sourceId)!,
    target: lesson.steps.find((item) => item.id === targetId)!,
  };
}

function clean(lesson: Lesson, stepId: string, at = 200): EvidenceEvent {
  const step = lesson.steps.find((item) => item.id === stepId)!;
  return {
    id: `clean:${stepId}:${at}`,
    lessonId: lesson.id,
    stepId,
    conceptIds: [...lesson.conceptIds],
    evaluator: "tests",
    kind: step.evidenceKind,
    passed: true,
    hints: 0,
    revealed: false,
    at,
  };
}

describe("explicit reveal of equivalent authored implementations", () => {
  it.each(cases)(
    "%s/%s marks future %s submissions assisted",
    (lessonId, sourceId, targetId) => {
      const { lesson, source, target } = context(lessonId, sourceId, targetId);
      const state = createInitialState();
      state.steps[stepKey(lesson.id, source.id)] = {
        ...createStepProgress(),
        revealed: true,
      };
      expect(
        assistanceForLessonStep(
          importState(exportState(state)),
          lesson,
          target,
        ),
      ).toEqual({ hints: 0, revealed: true });
    },
  );

  it.each(cases)(
    "%s/%s rejects later clean-looking %s credit",
    (lessonId, sourceId, targetId, index) => {
      const { lesson } = context(lessonId, sourceId, targetId);
      let state = createInitialState();
      state.events.push(
        { ...clean(lesson, sourceId, 100), revealed: true },
        clean(lesson, targetId),
      );
      state = importState(exportState(state));
      const before = JSON.stringify(state);
      expect(
        courseModuleGate(state, todoLessons, todoModule).criteria[index].passed,
      ).toBe(false);
      expect(
        moduleGate(state, todoLessons, todoModule).criteria[index].passed,
      ).toBe(false);
      expect(JSON.stringify(state)).toBe(before);
    },
  );

  it("preserves clean credit before a later explicit peer reveal", () => {
    const { lesson } = context(
      "todo-command-parser",
      "parser-debug",
      "parser-add-gate",
    );
    const state = createInitialState();
    state.events.push(clean(lesson, "parser-add-gate", 50));
    const revealed = {
      ...state,
      events: [
        ...state.events,
        { ...clean(lesson, "parser-debug", 100), revealed: true },
      ],
    };
    revealed.steps[stepKey(lesson.id, "parser-debug")] = {
      ...createStepProgress(),
      revealed: true,
    };
    expect(
      courseModuleGate(revealed, todoLessons, todoModule).criteria[0].passed,
    ).toBe(true);
  });

  it("keeps individual hints and ambiguous older peer exposures local", () => {
    const { lesson, target } = context(
      "todo-command-parser",
      "parser-debug",
      "parser-add-gate",
    );
    const state = recordCourseLessonExposure(createInitialState(), {
      lessonId: lesson.id,
      stepId: "parser-debug",
      conceptIds: lesson.conceptIds,
      at: 100,
      revealed: true,
    });
    state.steps[stepKey(lesson.id, "parser-debug")] = {
      ...createStepProgress(),
      hints: 2,
    };
    expect(assistanceForLessonStep(state, lesson, target)).toEqual({
      hints: 0,
      revealed: false,
    });
    state.events.push(clean(lesson, target.id));
    expect(
      courseModuleGate(state, todoLessons, todoModule).criteria[0].passed,
    ).toBe(true);
  });

  it("does not remove historical credit solely because a peer is currently marked revealed", () => {
    const { lesson } = context(
      "todo-command-parser",
      "parser-debug",
      "parser-add-gate",
    );
    const state = createInitialState();
    state.events.push(clean(lesson, "parser-add-gate"));
    state.steps[stepKey(lesson.id, "parser-debug")] = {
      ...createStepProgress(),
      revealed: true,
    };
    expect(
      courseModuleGate(state, todoLessons, todoModule).criteria[0].passed,
    ).toBe(true);
  });

  it("uses package implementation reveal for future submissions while a starter without refs reveals nothing", () => {
    const { lesson, target } = context(
      "todo-command-parser",
      "parser-debug",
      "parser-add-gate",
    );
    const project: ProjectPackage = {
      id: "solution-peer",
      title: "Package",
      description: "Test",
      instructions: ["cargo test"],
      revealStepRefs: [{ lessonId: lesson.id, stepId: "parser-debug" }],
      files: [
        { path: "Cargo.toml", starter: "[package]" },
        {
          path: "src/lib.rs",
          starter: "",
          solution: lesson.steps.find((s) => s.id === "parser-debug")!.solution,
        },
      ],
    };
    const starter = revealProjectPackageVariant(
      createInitialState(),
      project,
      todoLessons,
      "starter",
      100,
    );
    expect(starter.events).toHaveLength(0);
    const solution = revealProjectPackageVariant(
      starter,
      project,
      todoLessons,
      "solution",
      200,
    );
    expect(solution.events[0]).toMatchObject({
      kind: "exposure",
      revealed: true,
    });
    expect(assistanceForLessonStep(solution, lesson, target).revealed).toBe(
      true,
    );
    solution.events.push({
      ...clean(lesson, target.id, 300),
      ...assistanceForLessonStep(solution, lesson, target),
    });
    expect(
      courseModuleGate(solution, todoLessons, todoModule).criteria[0].passed,
    ).toBe(false);
  });

  it("scopes exact implementations to executable peers in the same module and invalidates edited catalogs", () => {
    const { lesson, source, target } = context(
      "todo-command-parser",
      "parser-debug",
      "parser-add-gate",
    );
    const sourceLesson = { ...lesson, id: "source", steps: [{ ...source }] };
    const targetLesson = { ...lesson, id: "target", steps: [{ ...target }] };
    const authored = [sourceLesson, targetLesson];
    const state = createInitialState();
    const ref = { lessonId: targetLesson.id, stepId: target.id };
    state.steps[stepKey(sourceLesson.id, source.id)] = {
      ...createStepProgress(),
      revealed: true,
    };
    expect(hasEquivalentSolutionReveal(state, ref, authored)).toBe(true);
    sourceLesson.moduleId = "other-module";
    expect(hasEquivalentSolutionReveal(state, ref, authored)).toBe(false);
    sourceLesson.moduleId = lesson.moduleId;
    sourceLesson.steps[0].solution = source.solution + "\n";
    expect(hasEquivalentSolutionReveal(state, ref, authored)).toBe(true);
    sourceLesson.steps[0].solution = source.solution!.replace(
      "parse_command",
      "read_entry",
    );
    expect(hasEquivalentSolutionReveal(state, ref, authored)).toBe(false);
    sourceLesson.steps[0].solution = source.solution;
    expect(hasEquivalentSolutionReveal(state, ref, authored)).toBe(true);
    sourceLesson.id = "renamed-source";
    expect(hasEquivalentSolutionReveal(state, ref, authored)).toBe(false);
    sourceLesson.id = "source";
    sourceLesson.steps[0].evaluator = {
      kind: "answer",
      accepted: ["yes"],
      feedback: "",
    };
    expect(hasEquivalentSolutionReveal(state, ref, authored)).toBe(false);
  });
});

describe("compound Todo gate components", () => {
  const stateLesson = todoLessons.find(
    (lesson) => lesson.id === "todo-state-invariants",
  )!;
  const sessionLesson = todoLessons.find(
    (lesson) => lesson.id === "todo-session-project",
  )!;
  const components = ["state-add-done-gate", "state-list-gate"];

  it("does not credit supplied state components from clean session code after their solutions were revealed", () => {
    const state = createInitialState();
    state.events = [
      ...components.map((id) => ({
        ...clean(stateLesson, id, 100),
        revealed: true,
      })),
      clean(sessionLesson, "session-blank", 200),
    ];
    const restored = importState(exportState(state));
    expect(
      courseModuleGate(restored, todoLessons, todoModule).criteria.map(
        (criterion) => criterion.passed,
      ),
    ).toEqual([false, false, false, true, true]);
  });

  it("routes disclosed state components to fresh edits while keeping session behavior available", () => {
    const state = createInitialState();
    for (const id of components) {
      state.steps[stepKey(stateLesson.id, id)] = {
        ...createStepProgress(),
        revealed: true,
      };
    }
    expect(
      gateRecovery(state, todoModule.gateCriteria![1], todoLessons),
    ).toEqual({
      status: "available",
      task: { lessonId: stateLesson.id, stepId: "todo-board-edits" },
    });
    expect(
      gateRecovery(state, todoModule.gateCriteria![2], todoLessons),
    ).toEqual({
      status: "available",
      task: { lessonId: stateLesson.id, stepId: "todo-board-edits" },
    });
    expect(
      gateRecovery(state, todoModule.gateCriteria![3], todoLessons),
    ).toEqual({
      status: "available",
      task: { lessonId: sessionLesson.id, stepId: "session-run-gate" },
    });
  });

  it("uses explicit supplied exposure facts without treating old hint exposures as component disclosures", () => {
    const state = createInitialState();
    const component = {
      ...clean(stateLesson, components[0], 100),
      kind: "exposure" as const,
      evaluator: undefined,
      revealed: true,
    };
    state.events = [component, clean(sessionLesson, "session-blank", 200)];
    expect(moduleGate(state, todoLessons, todoModule).criteria[1].passed).toBe(
      true,
    );
    state.events[0] = {
      ...component,
      id: "supplied-solution:authored-source:component:100",
    };
    const restored = importState(exportState(state));
    expect(
      moduleGate(restored, todoLessons, todoModule).criteria[1].passed,
    ).toBe(false);
    expect(
      moduleGate(restored, todoLessons, todoModule).criteria[3].passed,
    ).toBe(true);
  });

  it("preserves state component credit earned before a later reveal", () => {
    const state = createInitialState();
    state.events = [
      clean(sessionLesson, "session-blank", 50),
      ...components.map((id) => ({
        ...clean(stateLesson, id, 100),
        revealed: true,
      })),
    ];
    expect(
      courseModuleGate(state, todoLessons, todoModule).criteria.map(
        (criterion) => criterion.passed,
      ),
    ).toEqual([false, true, true, true, true]);
  });

  it("keeps hints on earlier component tasks local to those tasks", () => {
    const state = createInitialState();
    state.events = [
      ...components.map((id) => ({ ...clean(stateLesson, id, 100), hints: 1 })),
      clean(sessionLesson, "session-blank", 200),
    ];
    for (const id of components)
      state.steps[stepKey(stateLesson.id, id)] = {
        ...createStepProgress(),
        hints: 1,
      };
    expect(
      courseModuleGate(state, todoLessons, todoModule).criteria.map(
        (criterion) => criterion.passed,
      ),
    ).toEqual([false, true, true, true, true]);
  });

  it("recognizes a revealed larger implementation supplying an explicitly authored component", () => {
    const state = createInitialState();
    state.steps[stepKey(sessionLesson.id, "session-blank")] = {
      ...createStepProgress(),
      revealed: true,
    };
    expect(
      hasEquivalentSolutionReveal(
        state,
        { lessonId: stateLesson.id, stepId: "state-add-done-gate" },
        todoLessons,
      ),
    ).toBe(true);
  });
});

it.each([
  ["mut-slot-recall", "solution"],
  ["mut-slot-with-mut-transfer", "code"],
] as const)(
  "keeps the counted callback task reachable after displaying %s %s",
  (sourceId, variant) => {
    const stage = modules.find(
      (entry) => entry.id === "unsafe-miri-contracts",
    )!;
    const criterion = stage.gateCriteria!.find(
      (entry) => entry.id === "unsafe-miri-mut-slot-gate",
    )!;
    const lesson = lessons.find(
      (entry) => entry.id === "unsafe-miri-mut-slot",
    )!;
    const source = lesson.steps.find((step) => step.id === sourceId)!;
    const state = recordSuppliedSolutions(
      createInitialState(),
      source,
      variant,
      100,
    );
    const task = { lessonId: lesson.id, stepId: "mut-slot-with-mut-transfer" };
    expect(courseGateRecovery(state, criterion, lessons)).toEqual({
      status: "available",
      task,
    });
    expect(
      courseModuleGate(state, lessons, stage).criteria[
        stage.gateCriteria!.indexOf(criterion)
      ].passed,
    ).toBe(false);
  },
);
