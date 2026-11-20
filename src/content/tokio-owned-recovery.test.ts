/** Fixed authored safe-behavior fixtures, using the pinned Tokio Cargo profile. */
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { expect, it } from "vitest";
import type { EvidenceEvent, LessonStep, UserState } from "../domain/types";
import { revealAuthoredStepSolutions } from "../domain/project-package";
import { appendHiddenTests } from "../runner";
import {
  cargoExecutable,
  testCounts,
  behavioralRejection,
} from "../../scripts/cargo-observation";
import {
  createInitialState,
  createStepProgress,
  exportState,
  importState,
  stepKey,
} from "../persistence/state";
import { lessons, modules } from "./course";
import {
  assistanceForLessonStep,
  courseGateRecovery,
  courseModuleGate,
  evidenceForLessonStep,
  recordCourseEvidence,
  recordSuppliedSolutions,
} from "./learning-context";

const lessonId = "tokio-spawn-blocking-boundary";
const primary = "tokio-spawn-blocking-boundary-owned-gate";
const blank = "tokio-spawn-blocking-boundary-blank";
const fresh = "tokio-spawn-blocking-boundary-map-transfer";
const lesson = lessons.find((item) => item.id === lessonId)!;
const stage = modules.find((item) => item.id === "tokio-blocking-work")!;
const criterion = stage.gateCriteria!.find(
  (item) => item.id === "tokio-blocking-owned-boundary",
)!;
const index = stage.gateCriteria!.indexOf(criterion);
const stepAt = (id: string) => lesson.steps.find((step) => step.id === id)!;
const passed = (state: UserState) =>
  courseModuleGate(state, lessons, stage).criteria[index].passed;
function event(stepId: string, at: number): EvidenceEvent {
  const step = stepAt(stepId);
  return {
    id: `tokio-owned-recovery/${stepId}/${at}`,
    lessonId,
    stepId,
    at,
    ...evidenceForLessonStep(lesson, step),
    kind: step.evidenceKind,
    evaluator: step.evaluator?.kind,
    gate: true,
    passed: true,
    hints: 0,
    revealed: false,
  };
}
function submit(state: UserState, stepId: string, at: number) {
  return recordCourseEvidence(state, {
    ...event(stepId, at),
    ...assistanceForLessonStep(state, lesson, stepAt(stepId)),
  });
}
function reveal(state: UserState, stepId: string, at: number) {
  return recordSuppliedSolutions(
    revealAuthoredStepSolutions(state, [{ lessonId, stepId }], lessons, at),
    stepAt(stepId),
    "solution",
    at,
  );
}

for (const shown of [primary, blank]) {
  for (const explicit of [false, true]) {
    it(`offers a fresh blocking-pool contract after ${shown} ${explicit ? "explicit reveal" : "restored flag"}`, () => {
      let state = createInitialState();
      state.steps[stepKey(lessonId, primary)] =
        createStepProgress("// mój helper");
      state.steps[stepKey(lessonId, blank)] =
        createStepProgress("// mój consumer");
      state.resume = {
        ...state.resume,
        view: "lesson",
        lessonId,
        stepIndex: 4,
        panel: "code",
      };
      state.notes[lessonId] = "Closure musi posiadać pracę i wynik.";
      if (explicit) state = reveal(state, shown, 10);
      else state.steps[stepKey(lessonId, shown)].revealed = true;
      state = importState(exportState(state));
      const snapshots = {
        steps: structuredClone(state.steps),
        resume: structuredClone(state.resume),
        notes: structuredClone(state.notes),
      };
      expect(assistanceForLessonStep(state, lesson, stepAt(primary))).toEqual({
        hints: 0,
        revealed: true,
      });
      expect(passed(state)).toBe(false);
      expect(courseGateRecovery(state, criterion, lessons)).toEqual({
        status: "available",
        task: { lessonId, stepId: fresh },
      });
      state = submit(state, primary, 20);
      state = submit(state, blank, 30);
      expect(passed(state)).toBe(false);
      expect(assistanceForLessonStep(state, lesson, stepAt(fresh))).toEqual({
        hints: 0,
        revealed: false,
      });
      state = submit(state, fresh, 40);
      const restored = importState(exportState(state));
      expect(passed(restored)).toBe(true);
      expect(courseGateRecovery(restored, criterion, lessons)).toEqual({
        status: "complete",
      });
      expect(restored.events).toEqual(state.events);
      expect(restored.steps).toEqual(snapshots.steps);
      expect(restored.resume).toEqual(snapshots.resume);
      expect(restored.notes).toEqual(snapshots.notes);
      expect(restored.steps[stepKey(lessonId, primary)].code).toBe(
        "// mój helper",
      );
      expect(restored.steps[stepKey(lessonId, blank)].code).toBe(
        "// mój consumer",
      );
    });
  }
  const other = shown === primary ? blank : primary;
  it(`preserves independent ${other} evidence before ${shown} is revealed`, () => {
    let state = submit(createInitialState(), other, 10);
    const historical = structuredClone(state.events);
    state = reveal(state, shown, 20);
    const restored = importState(exportState(state));
    expect(passed(restored)).toBe(true);
    expect(restored.events.slice(0, historical.length)).toEqual(historical);
  });
  it(`rejects a raw ${other} pass after ${shown} supplies the component`, () => {
    let state = reveal(createInitialState(), shown, 10);
    state.events.push(event(other, 20));
    state = importState(exportState(state));
    expect(passed(state)).toBe(false);
    expect(courseGateRecovery(state, criterion, lessons)).toEqual({
      status: "available",
      task: { lessonId, stepId: fresh },
    });
  });
}

function nativeCases(
  cases: Array<{
    source: string;
    step: LessonStep;
    result: "pass" | "mutant" | "missing";
  }>,
) {
  const dir = mkdtempSync(join(tmpdir(), "tokio-owned-recovery-"));
  try {
    const profile = new URL(
      "../../scripts/fixtures/tokio-runtime-1.54.1/",
      import.meta.url,
    );
    copyFileSync(new URL("Cargo.toml", profile), join(dir, "Cargo.toml"));
    copyFileSync(new URL("Cargo.lock", profile), join(dir, "Cargo.lock"));
    mkdirSync(join(dir, "src"));
    writeFileSync(join(dir, "src/main.rs"), "fn main() {}\n");
    for (const fixture of cases) {
      if (fixture.step.evaluator?.kind !== "tests")
        throw new Error("Missing pinned native tests");
      writeFileSync(
        join(dir, "src/lib.rs"),
        appendHiddenTests(fixture.source, fixture.step.evaluator.tests),
      );
      const compile = spawnSync(
        "cargo",
        [
          "test",
          "--offline",
          "--locked",
          "--no-run",
          "--lib",
          "--message-format=json",
        ],
        {
          cwd: dir,
          encoding: "utf8",
          timeout: 60_000,
          env: { ...process.env, CARGO_TARGET_DIR: join(dir, "target") },
        },
      );
      expect(compile.error).toBeUndefined();
      expect(compile.signal).toBeNull();
      if (fixture.result === "missing") {
        expect(compile.status, compile.stdout + compile.stderr).toBe(101);
        expect(compile.stdout).toContain('"code":"E0425"');
        continue;
      }
      expect(compile.status, compile.stdout + compile.stderr).toBe(0);
      const binary = cargoExecutable(
        compile.stdout,
        "rust_workshop_tokio_fixtures",
      );
      expect(binary).toBeDefined();
      expect(resolve(binary!).startsWith(resolve(dir, "target") + sep)).toBe(
        true,
      );
      const run = spawnSync(binary!, ["--test-threads=1"], {
        cwd: dir,
        encoding: "utf8",
        timeout: 8_000,
      });
      expect(run.error).toBeUndefined();
      expect(run.signal).toBeNull();
      const counts = testCounts(run.stdout);
      expect(counts).toBeDefined();
      if (fixture.result === "mutant") {
        expect(run.status, run.stdout + run.stderr).toBe(101);
        expect(behavioralRejection(run)).toBe(true);
      } else {
        expect(run.status, run.stdout + run.stderr).toBe(0);
        expect(counts!.passed).toBeGreaterThan(0);
        expect(counts!.failed).toBe(0);
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

it("the later blank supplies the entire owned-gate body, while dropping the work fails natively", () => {
  const task = stepAt(primary);
  const supplied = stepAt(blank).solution!.match(
    /tokio::task::spawn_blocking\(work\)/,
  )![0];
  const copied = task
    .code!.replace("_work: F", "work: F")
    .replace('panic!("uruchom closure na puli blokującej Tokio")', supplied);
  nativeCases([
    { source: task.solution!, step: task, result: "pass" },
    { source: copied, step: task, result: "pass" },
    { source: task.code!, step: task, result: "mutant" },
    {
      source: task.solution!.replace(
        supplied,
        'tokio::task::spawn_blocking(move || { drop(work); panic!("work omitted") })',
      ),
      step: task,
      result: "mutant",
    },
  ]);
}, 90_000);

it("the fresh owned map accepts equivalent Rust and rejects reversing owned inputs", () => {
  const task = stepAt(fresh);
  expect(task?.evaluator?.kind).toBe("tests");
  const equivalent = `fn spawn_owned_map<T, U, F>(values: Vec<T>, mut transform: F) -> tokio::task::JoinHandle<Vec<U>>
where T: Send + 'static, U: Send + 'static, F: FnMut(T) -> U + Send + 'static,
{
    tokio::task::spawn_blocking(move || {
        let mut output = Vec::new();
        for value in values { output.push(transform(value)); }
        output
    })
}`;
  const mutant = equivalent.replace(
    "for value in values",
    "for value in values.into_iter().rev()",
  );
  nativeCases([
    { source: task.solution!, step: task, result: "pass" },
    { source: equivalent, step: task, result: "pass" },
    { source: mutant, step: task, result: "mutant" },
    { source: task.code!, step: task, result: "mutant" },
    { source: stepAt(blank).solution!, step: task, result: "missing" },
  ]);
}, 90_000);
