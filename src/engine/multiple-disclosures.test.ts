import { expect, it } from "vitest";
import { submitPassingExercise as submit } from "../content/gate-recovery-test-helpers";
import { lessons, modules } from "../content/course";
import {
  courseGateRecovery,
  courseModuleGate,
  courseNextGateTask,
  recordCourseEvidence,
  recordCourseLessonExposure,
  recordSuppliedSolutions,
} from "../content/learning-context";
import type {
  CourseModule,
  ModuleGateCriterion,
  ModuleGateTaskRef,
  UserState,
} from "../domain/types";
import {
  createInitialState,
  createStepProgress,
  exportState,
  importState,
  stepKey,
} from "../persistence/state";

function task(ref: ModuleGateTaskRef) {
  const lesson = lessons.find((item) => item.id === ref.lessonId)!;
  return { lesson, step: lesson.steps.find((item) => item.id === ref.stepId)! };
}

function disclose(
  state: UserState,
  ref: ModuleGateTaskRef,
  at: number,
  visible: boolean,
) {
  const { lesson, step } = task(ref);
  const key = stepKey(ref.lessonId, ref.stepId);
  const explicit = visible && Boolean(step.solution);
  state.steps[key] = {
    ...(state.steps[key] ?? createStepProgress("// mój szkic")),
    revealed: true,
    hints: explicit ? 2 : 0,
  };
  if (!explicit) return state;
  return recordCourseLessonExposure(
    recordSuppliedSolutions(state, step, "solution", at),
    {
      ...ref,
      conceptIds: step.evidence?.conceptIds ?? lesson.conceptIds,
      at,
      revealed: true,
    },
    "supplied-solution",
  );
}

// Measure progress by trying each candidate against the assessment, independently of navigation.
function credits(
  state: UserState,
  stage: CourseModule,
  criterion: ModuleGateCriterion,
) {
  const required = criterion.requiredIndependentCodingTasks ?? 1;
  const thresholds = Array.from({ length: required }, (_, i) => ({
    ...criterion,
    supplementaryStepRefs: undefined,
    requiredIndependentCodingTasks:
      criterion.requiredIndependentCodingTasks === undefined
        ? undefined
        : i + 1,
  }));
  return courseModuleGate(state, lessons, {
    ...stage,
    gateCriteria: thresholds,
  }).criteria.filter((row) => row.passed).length;
}

function checkMap(
  initial: UserState,
  stage: CourseModule,
  criterion: ModuleGateCriterion,
  label: string,
) {
  let state = initial;
  const required = criterion.requiredIndependentCodingTasks ?? 1;
  for (let turn = 0; turn <= required + 1; turn++) {
    const recovery = courseGateRecovery(state, criterion);
    const link = courseNextGateTask(state, criterion);
    if (
      courseModuleGate(state, lessons, { ...stage, gateCriteria: [criterion] })
        .passed
    ) {
      expect(recovery, label).toEqual({ status: "complete" });
      expect(link, label).toBeUndefined();
      return;
    }
    const before = credits(state, stage, criterion);
    const at = 20 + turn;
    const fresh =
      before === required
        ? criterion.supplementaryStepRefs!
        : criterion.taskRefs.filter(
            (ref) => credits(submit(state, ref, at), stage, criterion) > before,
          );
    if (!fresh.length) {
      expect(recovery, label).toEqual({ status: "exhausted" });
      expect(link, label).toBeUndefined();
      return;
    }
    expect(recovery.status, label).toBe("available");
    expect(fresh, label).toContainEqual(link);
    expect(recovery, label).toEqual({ status: "available", task: link });
    state = submit(state, link!, at);
  }
  throw new Error("Recovery did not terminate: " + label);
}

const cases = modules.flatMap((stage) =>
  (stage.gateCriteria ?? []).map((criterion) => ({ stage, criterion })),
);
const subsets = (refs: ModuleGateTaskRef[]) =>
  Array.from({ length: 2 ** refs.length }, (_, mask) =>
    refs.filter((_, i) => mask & (1 << i)),
  ).filter((group) => group.length >= 2);

it("covers every multi-disclosure subset in the d7dee3b catalog", () => {
  expect(cases).toHaveLength(240);
  expect(
    cases.reduce(
      (sum, { criterion }) => sum + subsets(criterion.taskRefs).length,
      0,
    ),
  ).toBe(497);
});

it.each(cases)(
  "$stage.id / $criterion.id routes to work that can earn additional credit",
  ({ stage, criterion }) => {
    for (const shown of subsets(criterion.taskRefs)) {
      for (const mode of ["visible", "restored", "mixed"] as const) {
        const order = mode === "restored" ? [...shown].reverse() : shown;
        const state = order.reduce(
          (current, ref, i) =>
            disclose(
              current,
              ref,
              i + 2,
              mode === "visible" || (mode === "mixed" && i % 2 === 1),
            ),
          createInitialState(),
        );
        checkMap(
          importState(exportState(state)),
          stage,
          criterion,
          shown.map((ref) => ref.stepId).join(" + "),
        );
      }
    }
  },
);

it.each(
  cases.filter(
    ({ criterion }) => (criterion.requiredIndependentCodingTasks ?? 1) > 1,
  ),
)(
  "$criterion.id keeps previously earned family credit across later disclosures",
  ({ stage, criterion }) => {
    for (const earned of criterion.taskRefs) {
      for (const shown of subsets(criterion.taskRefs)) {
        let state = submit(createInitialState(), earned, 1);
        expect(credits(state, stage, criterion)).toBe(1);
        state = shown.reduce(
          (current, ref, i) => disclose(current, ref, i + 2, true),
          state,
        );
        state = importState(exportState(state));
        expect(credits(state, stage, criterion)).toBe(1);
        checkMap(
          state,
          stage,
          criterion,
          earned.stepId +
            " before " +
            shown.map((ref) => ref.stepId).join(" + "),
        );
      }
    }
  },
);

it("keeps a later submission from earning ordinary credit through an event-only disclosed family", () => {
  const stage = modules.find((item) => item.id === "ownership")!;
  const criterion = stage.gateCriteria!.find(
    (item) => item.id === "unseen-task",
  )!;
  const [project, blank, alias, repair] = criterion.taskRefs;
  let state = [project, blank, alias].reduce(
    (s, ref, index) => disclose(s, ref, index + 1, true),
    createInitialState(),
  );
  // Historical exports can retain the exposure event without a step entry.
  delete state.steps[stepKey(alias.lessonId, alias.stepId)];
  state = importState(exportState(state));
  expect(courseNextGateTask(state, criterion)).toBeUndefined();
  expect(credits(submit(state, repair, 10), stage, criterion)).toBe(0);
});

it.each([10, 11])(
  "preserves earlier component credit when restored help is observed at %i",
  (at) => {
    const stage = modules.find((item) => item.id === "collections")!;
    const criterion = stage.gateCriteria!.find(
      (item) => item.id === "string-gate",
    )!;
    const [component, combined, fresh] = criterion.taskRefs;
    const before = submit(createInitialState(), combined, 10);
    before.events.at(-1)!.id = "earlier-independent";
    const restored = [component, fresh].reduce(
      (state, ref) => disclose(state, ref, 10, false),
      before,
    );
    const next = submit(importState(exportState(restored)), combined, at);
    expect(credits(next, stage, criterion)).toBe(1);
    const laterOnly = {
      ...next,
      events: next.events.filter(
        (event) => event.id !== before.events.at(-1)!.id,
      ),
    };
    expect(credits(laterOnly, stage, criterion)).toBe(0);
    const fact = next.events.find(
      (event) =>
        event.id.startsWith("supplied-solution:") &&
        event.stepId === component.stepId,
    );
    expect(fact?.at).toBe(at);
    expect(recordCourseEvidence(next, next.events.at(-1)!)).toBe(next);
  },
);

it.each(["source event", "source flag"] as const)(
  "uses the upstream Todo I/O %s when qualifying a combined Todo session",
  (source) => {
    const stage = modules.find((item) => item.id === "todo-project")!;
    const criterion = stage.gateCriteria!.find(
      (item) => item.id === "state-invariant-gate",
    )!;
    const [, combined, edits] = criterion.taskRefs;
    const sourceRef = {
      lessonId: "todo-storage-format",
      stepId: "format-debug",
    };
    let state = createInitialState();
    state = disclose(
      state,
      { lessonId: "todo-command-parser", stepId: "parser-add-gate" },
      1,
      false,
    );
    if (source === "source event") {
      state = recordCourseLessonExposure(
        state,
        {
          ...sourceRef,
          conceptIds: task(sourceRef).lesson.conceptIds,
          at: 2,
          revealed: true,
        },
        "supplied-solution",
      );
    } else {
      state = disclose(state, sourceRef, 2, false);
    }
    state = importState(exportState(state));
    expect(courseNextGateTask(state, criterion)).toEqual(edits);
    state = submit(state, combined, 20);
    expect(credits(state, stage, criterion)).toBe(0);
    const session = stage.gateCriteria!.find((item) =>
      item.taskRefs.some((ref) => ref.stepId === "session-run-gate"),
    )!;
    expect(credits(state, stage, session)).toBe(1);
    expect(credits(submit(state, edits, 21), stage, criterion)).toBe(1);
  },
);

it("qualifies counted attempts by disclosure time even if imported events are out of order", () => {
  const stage = modules.find((item) => item.id === "ownership")!;
  const criterion = stage.gateCriteria!.find(
    (item) => item.id === "borrowing",
  )!;
  const [first, second, remaining] = criterion.taskRefs;
  let state = submit(submit(createInitialState(), first, 20), second, 30);
  state = recordCourseLessonExposure(
    state,
    {
      ...first,
      conceptIds: task(first).lesson.conceptIds,
      at: 10,
      revealed: true,
    },
    "supplied-solution",
  );
  state = importState(exportState(state));
  expect(credits(state, stage, criterion)).toBe(1);
  expect(courseNextGateTask(state, criterion)).toEqual(remaining);
  expect(credits(submit(state, remaining, 40), stage, criterion)).toBe(2);
});
