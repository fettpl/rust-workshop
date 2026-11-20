/** Local execution is restricted to the fixed authored controls in this file. */
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { lessons, modules } from "./course";
import {
  courseGateRecovery,
  recordSuppliedSolutions,
} from "./learning-context";
import { revealAuthoredStepSolutions } from "../domain/project-package";
import {
  createInitialState,
  createStepProgress,
  stepKey,
} from "../persistence/state";
import { appendHiddenTests } from "../runner";

const criteria = [
  "function-boundary-v1",
  "shared-borrow-pair-v1",
  "testing-documentation-repair-gate",
];

// Removing a spare family makes a full required-count path fail after assistance.
it.each(criteria)(
  "%s retains its full independent family requirement after any one primary solution",
  (id) => {
    const criterion = modules
      .flatMap((m) => m.gateCriteria ?? [])
      .find((c) => c.id === id)!;
    for (const revealed of criterion.taskRefs) {
      for (const visible of [false, true]) {
        let state = createInitialState();
        state.steps[stepKey(revealed.lessonId, revealed.stepId)] = {
          ...createStepProgress(),
          revealed: true,
        };
        if (visible) {
          const source = lessons
            .find((l) => l.id === revealed.lessonId)!
            .steps.find((s) => s.id === revealed.stepId)!;
          state = revealAuthoredStepSolutions(state, [revealed], lessons, 1);
          state = recordSuppliedSolutions(state, source, "solution", 1);
        }
        const accepted = new Set<string>();
        for (let at = 2; at < 20; at++) {
          const next = courseGateRecovery(state, criterion, lessons);
          if (next.status !== "available") break;
          const step = lessons
            .find((l) => l.id === next.task.lessonId)!
            .steps.find((s) => s.id === next.task.stepId)!;
          const family = step.evidence?.codingTaskId;
          if (family) accepted.add(family);
          state.events.push({
            id: `fixed-${at}`,
            ...next.task,
            conceptIds: step.evidence?.conceptIds ?? [],
            evidenceVersion: step.evidence?.version,
            kind:
              step.evaluator?.kind === "rubric"
                ? "self-rating"
                : step.evidenceKind,
            evaluator: step.evaluator?.kind,
            passed: true,
            hints: 0,
            revealed: false,
            at,
          });
        }
        expect(
          accepted.size,
          `${id}/${revealed.stepId}/${visible}`,
        ).toBeGreaterThanOrEqual(criterion.requiredIndependentCodingTasks!);
        expect(courseGateRecovery(state, criterion, lessons).status).toBe(
          "complete",
        );
      }
    }
  },
);

const controls = [
  {
    lesson: "function-ownership-calibration",
    step: "function-split-owned",
    equivalent: `fn split_owned(text: String) -> (String, usize) { let count=text.chars().count(); (text,count) } fn main() {}`,
    mutant: `fn split_owned(text: String) -> (String, usize) { let count=text.len(); (text,count) } fn main() {}`,
  },
  {
    lesson: "shared-borrow-calibration",
    step: "shared-character-count",
    equivalent: `fn character_count(text: &str) -> usize { text.chars().fold(0, |count,_| count+1) } fn main() {}`,
    mutant: `fn character_count(text: &str) -> usize { text.len() } fn main() {}`,
  },
  {
    lesson: "documentation-guided-repair",
    step: "docs-keyed-setting",
    equivalent: `fn setting_value<'a>(text: &'a str, key: &str) -> Option<&'a str> { if key.is_empty() {return None} match text.split_once('=') { Some((actual,value)) if actual==key => Some(value), _=>None } } fn main() {}`,
    mutant: `fn setting_value<'a>(text: &'a str, _key: &str) -> Option<&'a str> { text.split_once('=').map(|(_,value)|value) } fn main() {}`,
  },
];

// A byte count, whitespace normalization or ignored key must fail executable checks.
it.each(controls)(
  "validates distinct recovery contract $step and rejects a plausible mutation",
  ({ lesson, step: id, equivalent, mutant }) => {
    const step = lessons
      .find((l) => l.id === lesson)!
      .steps.find((s) => s.id === id);
    expect(step, id).toBeDefined();
    if (!step || step.evaluator?.kind !== "tests")
      throw new Error("Missing fixed authored test contract");
    const dir = mkdtempSync(join(tmpdir(), "counted-recovery-"));
    try {
      for (const [source, passes] of [
        [step.solution!, true],
        [equivalent, true],
        ...(id === "docs-keyed-setting" ? [[step.code!, false] as const] : []),
        [mutant, false],
      ] as const) {
        const file = join(dir, "control.rs"),
          binary = join(dir, "control");
        writeFileSync(file, appendHiddenTests(source, step.evaluator.tests));
        const compile = spawnSync(
          "rustc",
          ["--edition=2024", "--test", file, "-o", binary],
          { encoding: "utf8", timeout: 60_000 },
        );
        if (compile.error) throw compile.error;
        expect(compile.status, compile.stderr).toBe(0);
        const run = spawnSync(binary, [], {
          encoding: "utf8",
          timeout: 10_000,
        });
        if (run.error) throw run.error;
        expect(run.status, run.stdout + run.stderr).toBe(passes ? 0 : 101);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  },
);

it.each(["function-split-owned", "shared-character-count"])(
  "%s requires correcting the actual ownership boundary in the starter",
  (id) => {
    const step = lessons
      .flatMap((lesson) => lesson.steps)
      .find((step) => step.id === id)!;
    if (step.evaluator?.kind !== "tests")
      throw new Error("Missing fixed contract");
    const dir = mkdtempSync(join(tmpdir(), "counted-boundary-starter-"));
    try {
      const file = join(dir, "starter.rs");
      writeFileSync(file, appendHiddenTests(step.code!, step.evaluator.tests));
      const result = spawnSync(
        "rustc",
        ["--test", "--edition=2024", file, "-o", join(dir, "starter")],
        { encoding: "utf8", timeout: 60_000 },
      );
      if (result.error) throw result.error;
      expect(result.status, result.stderr).toBe(1);
      expect(result.stderr).toContain("error[E0308]");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  },
);
