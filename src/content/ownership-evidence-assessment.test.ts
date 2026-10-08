/** Compiles only maintained repository fixtures; never accepts learner/imported code. */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { lessons, concepts, reviewExercises, ownershipModule } from "./catalog";
import {
  lessons as courseLessons,
  delayedReviewExercises,
  reviewExercises as courseReviewExercises,
  reviewExercisesById,
  reviewExerciseForId,
} from "./course";
import { gateRecovery, moduleGate } from "../engine/learning";
import { createInitialState } from "../persistence/state";
import type { EvidenceEvent } from "../domain/types";
import { appendHiddenTests } from "../runner";
import { evaluate } from "../engine/evaluate";
import type { LessonStep } from "../domain/types";
import {
  functionOwnershipFixtures,
  mutationFixtures,
  readLengthFixtures,
} from "./ownership-evidence-assessment-fixtures";
import { frameTextContract } from "./ownership-evidence-contracts";

const ownershipIds = [
  "stack-heap",
  "scope-drop",
  "move-semantics",
  "copy-semantics",
  "function-ownership",
  "shared-borrow",
  "mutable-borrow",
  "ownership-repair",
];
function stepAt(lessonId: string, stepId: string): LessonStep {
  const step = lessons
    .find((lesson) => lesson.id === lessonId)
    ?.steps.find((step) => step.id === stepId);
  expect(step, `${lessonId}/${stepId}`).toBeDefined();
  return step!;
}
it("preserves all 48 ownership step IDs/order while narrowing each assessed concept claim", () => {
  expect(
    lessons.flatMap((lesson) =>
      lesson.steps.map((step) => [lesson.id, step.id]),
    ),
  ).toEqual(expectedAttribution.map(([lesson, step]) => [lesson, step]));
  for (const [lessonId, stepId, conceptIds] of expectedAttribution) {
    expect(stepAt(lessonId, stepId).evidence, stepId).toEqual(
      expect.objectContaining({ version: 2, conceptIds }),
    );
    expect(
      conceptIds.every((id) =>
        lessons
          .find((lesson) => lesson.id === lessonId)!
          .conceptIds.includes(id),
      ),
      stepId,
    ).toBe(true);
  }
});
it("calibrates exactly eight ownership concepts and gives reviews singleton attribution", () => {
  expect(
    concepts
      .filter((concept) => concept.evidenceCalibration)
      .map((concept) => concept.id),
  ).toEqual(ownershipIds);
  for (const id of ownershipIds) {
    expect(
      concepts.find((concept) => concept.id === id)?.evidenceCalibration,
    ).toEqual({ version: 2, minimumCodingTasks: 2 });
    expect(reviewExercises[id].evidence).toEqual(
      expect.objectContaining({ version: 2, conceptIds: [id] }),
    );
  }
});
it("uses tests and mutable-only claims for all three distinct mutation tasks", () => {
  for (const [lesson, step, task] of [
    ["borrow-intro", "borrow-conflict", "append"],
    ["borrow-intro", "borrow-mutable-run", "replace"],
    ["adversarial-no-clone", "adversarial-conflict", "surround"],
  ]) {
    const authored = stepAt(lesson, step);
    expect(authored.evaluator?.kind, step).toBe("tests");
    expect(authored.evidenceGate, step).toBe(true);
    expect(authored.evidence).toEqual({
      version: 2,
      conceptIds: ["mutable-borrow"],
      codingTaskId: `ownership/mutate-${task}`,
    });
  }
  expect(stepAt("borrow-intro", "borrow-mutable-run").evidenceKind).toBe(
    "transfer",
  );
});
it("requires two of three mutation families and retains reflection support", () => {
  const criterion = ownershipModule.gateCriteria?.find(
    (criterion) => criterion.id === "borrowing",
  );
  expect(criterion?.requiredIndependentCodingTasks).toBe(2);
  expect(criterion?.taskRefs).toEqual([
    { lessonId: "borrow-intro", stepId: "borrow-conflict" },
    { lessonId: "borrow-intro", stepId: "borrow-mutable-run" },
    { lessonId: "adversarial-no-clone", stepId: "adversarial-conflict" },
  ]);
  expect(criterion?.supplementaryStepRefs).toEqual([
    { lessonId: "borrow-intro", stepId: "borrow-explain" },
  ]);
});
it("registers the fresh function boundary criterion and gates on both authored tasks", () => {
  const boundaryCriterion = ownershipModule.gateCriteria?.find(
    (criterion) => criterion.id === "function-boundary-v1",
  );
  expect(boundaryCriterion).toEqual({
    id: "function-boundary-v1",
    label: "Dwie niezależne granice własności funkcji",
    requiredIndependentCodingTasks: 2,
    taskRefs: [
      {
        lessonId: "function-ownership-calibration",
        stepId: "function-is-empty-text",
      },
      {
        lessonId: "function-ownership-calibration",
        stepId: "function-add-mark",
      },
    ],
  });
  const eventFor = (
    stepId: string,
    id: string,
    overrides: Partial<EvidenceEvent> = {},
  ): EvidenceEvent => {
    const lesson = courseLessons.find(
      (candidate) => candidate.id === "function-ownership-calibration",
    )!;
    const step = lesson.steps.find((candidate) => candidate.id === stepId)!;
    return {
      id,
      lessonId: lesson.id,
      stepId,
      conceptIds: [...step.evidence!.conceptIds],
      evidenceVersion: step.evidence!.version,
      evaluator: step.evaluator!.kind,
      kind: step.evidenceKind!,
      passed: true,
      hints: 0,
      revealed: false,
      at: 10_000,
      gate: true,
      ...overrides,
    };
  };
  const oldEvent: EvidenceEvent = {
    ...eventFor("function-is-empty-text", "old-only"),
    lessonId: "scenario-assessment",
    stepId: "assessment-repair",
    conceptIds: [
      "function-ownership",
      "move-semantics",
      "shared-borrow",
      "ownership-repair",
    ],
    evidenceVersion: 2,
    evaluator: "tests",
    kind: "assessment",
  };
  const oneFresh = {
    ...createInitialState(),
    events: [eventFor("function-is-empty-text", "fresh-a")],
  };
  const bothFresh = {
    ...oneFresh,
    events: [...oneFresh.events, eventFor("function-add-mark", "fresh-b")],
  };
  const revealedFresh = {
    ...bothFresh,
    events: [{ ...bothFresh.events[0], revealed: true }, bothFresh.events[1]],
  };
  const oldOnly = { ...createInitialState(), events: [oldEvent] };
  const passed = (state: typeof oneFresh) =>
    moduleGate(state, courseLessons, {
      ...ownershipModule,
      gateCriteria: [boundaryCriterion!],
    }).criteria[0]?.passed;
  expect(passed(oneFresh)).toBe(false);
  expect(passed(bothFresh)).toBe(true);
  expect(passed(revealedFresh)).toBe(false);
  expect(passed(oldOnly)).toBe(false);
  expect(gateRecovery(oneFresh, boundaryCriterion!, courseLessons).status).toBe(
    "available",
  );
  expect(
    gateRecovery(bothFresh, boundaryCriterion!, courseLessons).status,
  ).toBe("complete");
  expect(
    gateRecovery(revealedFresh, boundaryCriterion!, courseLessons).status,
  ).toBe("exhausted");
  expect(gateRecovery(oldOnly, boundaryCriterion!, courseLessons).status).toBe(
    "available",
  );
});
it.each(["constructor", "__proto__", "toString"])(
  "returns undefined for unknown inherited review ID %s",
  (id) => expect(reviewExerciseForId(id)).toBeUndefined(),
);
it("combines ordinary and delayed reviews with distinct stable IDs", () => {
  const ordinaryFunctionOwnershipEntries = Object.entries(
    courseReviewExercises,
  ).filter(([key]) => key === "function-ownership");
  const delayedFunctionOwnershipEntries = Object.entries(
    delayedReviewExercises,
  ).filter(([key]) => key === "function-ownership");
  expect(ordinaryFunctionOwnershipEntries).toHaveLength(1);
  expect(ordinaryFunctionOwnershipEntries[0][1]).toBe(
    courseReviewExercises["function-ownership"],
  );
  expect(ordinaryFunctionOwnershipEntries[0][1].id).toBe(
    "review-function-ownership",
  );
  expect(delayedFunctionOwnershipEntries).toHaveLength(1);
  expect(delayedFunctionOwnershipEntries[0][1]).toBe(
    delayedReviewExercises["function-ownership"],
  );
  expect(delayedFunctionOwnershipEntries[0][1].id).toBe(
    "review-function-ownership-delayed-v1",
  );
  expect(reviewExercisesById["review-function-ownership"]).toBe(
    courseReviewExercises["function-ownership"],
  );
  expect(
    reviewExercisesById["review-function-ownership-delayed-v1"],
  ).toBeDefined();
  expect(Object.keys(reviewExercisesById)).toHaveLength(
    Object.keys(courseReviewExercises).length + 1,
  );
});
it("proves the delayed frame contract with an equivalent implementation and compiling mutants", () => {
  const step = delayedReviewExercises["function-ownership"];
  const fixture = functionOwnershipFixtures["function-frame-owned-v1"];
  const tests = `${testsOf(step)}
#[test]
fn preserves_leading_and_trailing_whitespace() {
    assert_eq!(frame_text(String::from("  ready!  ")), "<  ready!  >");
}`;
  const canonical = compileAndRun(
    "function-frame-owned-v1/canonical",
    step.solution!,
    tests,
    true,
  );
  expect(
    evaluate(step.evaluator!, { code: step.solution!, result: canonical })
      .passed,
  ).toBe(true);
  const equivalent = compileAndRun(
    "function-frame-owned-v1/equivalent",
    fixture.equivalent,
    tests,
    true,
  );
  expect(
    evaluate(step.evaluator!, { code: fixture.equivalent, result: equivalent })
      .passed,
  ).toBe(true);
  for (const [name, source] of Object.entries(fixture.mutants))
    compileAndRun(`function-frame-owned-v1/${name}`, source, tests, false);
  expect(step.code).toBe(frameTextContract.starter);
  expect(step.solution).toBe(frameTextContract.solution);
}, 75_000);
it("does not accept an answer without compiled mutation code", () => {
  const step = stepAt("borrow-intro", "borrow-mutable-run");
  expect(
    evaluate(step.evaluator!, { code: "invalid Rust", answer: "hi!" }).passed,
  ).toBe(false);
  expect(evaluate(step.evaluator!, { answer: "hi!" }).passed).toBe(false);
});
it("rejects the literal-output bypass at the real catalog evaluator boundary", () => {
  const directory = mkdtempSync(join(tmpdir(), "ownership-literal-"));
  try {
    const file = join(directory, "literal.rs"),
      binary = join(directory, "literal");
    const code = 'fn main() { println!("hi!"); }';
    writeFileSync(file, code);
    const compiled = spawnSync(
      "rustc",
      ["--edition=2024", file, "-o", binary],
      { encoding: "utf8", timeout: 60_000 },
    );
    expect(compiled.error).toBeUndefined();
    expect(compiled.status, compiled.stderr).toBe(0);
    const run = spawnSync(binary, [], { encoding: "utf8", timeout: 8_000 });
    expect(run.status).toBe(0);
    expect(
      evaluate(stepAt("borrow-intro", "borrow-conflict").evaluator!, {
        code,
        result: {
          status: "success",
          stdout: run.stdout,
          stderr: run.stderr,
          diagnostics: [],
          durationMs: 0,
        },
      }).passed,
    ).toBe(false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}, 75_000);

const expectedAttribution: [string, string, string[]][] = [
  ["memory-intro", "memory-predict", ["stack-heap"]],
  ["memory-intro", "memory-run", ["stack-heap"]],
  ["memory-intro", "memory-trace", []],
  ["memory-intro", "memory-explain", ["scope-drop"]],
  ["memory-intro", "memory-modify", []],
  ["memory-intro", "memory-transfer", ["scope-drop"]],
  ["move-copy-discovery", "move-predict", ["move-semantics", "copy-semantics"]],
  ["move-copy-discovery", "move-error", ["move-semantics"]],
  ["move-copy-discovery", "move-string-run", ["move-semantics"]],
  ["move-copy-discovery", "copy-int-run", ["copy-semantics"]],
  ["move-copy-discovery", "copy-trace", ["copy-semantics"]],
  ["move-copy-discovery", "copy-clone-trace", ["move-semantics"]],
  ["functions-and-ownership", "function-call-run", ["function-ownership"]],
  ["functions-and-ownership", "function-error", ["function-ownership"]],
  ["functions-and-ownership", "return-ownership", ["function-ownership"]],
  ["functions-and-ownership", "function-expression-run", []],
  ["functions-and-ownership", "function-explain", ["function-ownership"]],
  ["functions-and-ownership", "function-transfer", ["function-ownership"]],
  ["borrow-intro", "borrow-read-run", ["shared-borrow"]],
  ["borrow-intro", "borrow-trace", ["shared-borrow"]],
  ["borrow-intro", "borrow-conflict", ["mutable-borrow"]],
  ["borrow-intro", "borrow-mutable-run", ["mutable-borrow"]],
  ["borrow-intro", "borrow-explain", ["shared-borrow"]],
  ["borrow-intro", "borrow-transfer", ["mutable-borrow"]],
  ["number-guessing-transfer", "project-contract", []],
  ["number-guessing-transfer", "project-result-run", []],
  ["number-guessing-transfer", "project-blank", ["function-ownership"]],
  [
    "number-guessing-transfer",
    "project-error",
    ["function-ownership", "shared-borrow", "ownership-repair"],
  ],
  [
    "number-guessing-transfer",
    "project-reasoning",
    ["function-ownership", "shared-borrow", "ownership-repair"],
  ],
  ["number-guessing-transfer", "project-check", []],
  ["blank-page-repair", "blank-plan", ["function-ownership"]],
  ["blank-page-repair", "blank-code", ["function-ownership"]],
  [
    "blank-page-repair",
    "blank-error",
    ["move-semantics", "function-ownership", "ownership-repair"],
  ],
  ["blank-page-repair", "blank-test", ["function-ownership"]],
  [
    "blank-page-repair",
    "blank-reason",
    ["move-semantics", "function-ownership", "ownership-repair"],
  ],
  [
    "blank-page-repair",
    "blank-transfer",
    ["function-ownership", "ownership-repair"],
  ],
  [
    "adversarial-no-clone",
    "adversarial-diagnose",
    ["shared-borrow", "ownership-repair"],
  ],
  [
    "adversarial-no-clone",
    "adversarial-code",
    ["shared-borrow", "ownership-repair"],
  ],
  ["adversarial-no-clone", "adversarial-conflict", ["mutable-borrow"]],
  [
    "adversarial-no-clone",
    "adversarial-reason",
    ["shared-borrow", "ownership-repair"],
  ],
  ["adversarial-no-clone", "adversarial-trace", ["shared-borrow"]],
  ["adversarial-no-clone", "adversarial-transfer", ["ownership-repair"]],
  ["scenario-assessment", "assessment-unseen-copy", ["copy-semantics"]],
  ["scenario-assessment", "assessment-unseen-move", ["move-semantics"]],
  [
    "scenario-assessment",
    "assessment-repair",
    [
      "move-semantics",
      "function-ownership",
      "shared-borrow",
      "ownership-repair",
    ],
  ],
  [
    "scenario-assessment",
    "assessment-reasoning",
    [
      "move-semantics",
      "function-ownership",
      "shared-borrow",
      "ownership-repair",
    ],
  ],
  [
    "scenario-assessment",
    "assessment-retrieval",
    ["shared-borrow", "ownership-repair"],
  ],
  [
    "scenario-assessment",
    "assessment-transfer",
    ["function-ownership", "ownership-repair"],
  ],
];

function testsOf(step: LessonStep): string {
  expect(step.evaluator?.kind, step.id).toBe("tests");
  if (step.evaluator?.kind !== "tests")
    throw new Error(`${step.id}: missing tests`);
  return step.evaluator.tests;
}
function compileAndRun(
  id: string,
  source: string,
  tests: string,
  expected: boolean,
) {
  const directory = mkdtempSync(join(tmpdir(), "ownership-contract-"));
  try {
    const file = join(directory, "fixture.rs"),
      binary = join(directory, "fixture");
    writeFileSync(file, appendHiddenTests(source, tests));
    const compiled = spawnSync(
      "rustc",
      ["--edition=2024", "--test", file, "-o", binary],
      { cwd: directory, encoding: "utf8", timeout: 60_000 },
    );
    expect(compiled.error, `${id}: compiler timeout/error`).toBeUndefined();
    // A compile failure cannot stand in for detecting an incorrect behavior.
    expect(compiled.status, `${id}: ${compiled.stderr}`).toBe(0);
    const executed = spawnSync(binary, ["--test-threads=1"], {
      cwd: directory,
      encoding: "utf8",
      timeout: 8_000,
    });
    expect(executed.error, `${id}: runner timeout/error`).toBeUndefined();
    expect(
      executed.status === 0,
      `${id}: ${executed.stdout}${executed.stderr}`,
    ).toBe(expected);
    const counts = executed.stdout.match(
      /test result:.*?(\d+) passed; (\d+) failed/,
    );
    expect(counts, `${id}: test counts`).not.toBeNull();
    return {
      status:
        executed.status === 0
          ? ("success" as const)
          : ("test-failure" as const),
      stdout: executed.stdout,
      stderr: executed.stderr,
      diagnostics: [],
      durationMs: 0,
      tests: { passed: Number(counts![1]), failed: Number(counts![2]) },
    };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
const mutationCases = [
  {
    step: stepAt("borrow-intro", "borrow-conflict"),
    fixture: mutationFixtures["borrow-conflict"],
  },
  {
    step: stepAt("borrow-intro", "borrow-mutable-run"),
    fixture: mutationFixtures["borrow-mutable-run"],
  },
  {
    step: stepAt("adversarial-no-clone", "adversarial-conflict"),
    fixture: mutationFixtures["adversarial-conflict"],
  },
  {
    step: reviewExercises["mutable-borrow"],
    fixture: mutationFixtures["review-mutable-borrow"],
  },
];

for (const { step, fixture } of mutationCases) {
  it(`${step.id}: accepts canonical and equivalent caller-buffer implementations`, () => {
    const canonicalResult = compileAndRun(
      `${step.id}/canonical`,
      step.solution!,
      testsOf(step),
      true,
    );
    expect(
      evaluate(step.evaluator!, {
        code: step.solution!,
        result: canonicalResult,
      }).passed,
    ).toBe(true);
    const equivalentResult = compileAndRun(
      `${step.id}/equivalent`,
      fixture.equivalent,
      testsOf(step),
      true,
    );
    expect(
      evaluate(step.evaluator!, {
        code: fixture.equivalent,
        result: equivalentResult,
      }).passed,
    ).toBe(true);
    // Correct code needs no answer, unlike the legacy modify evaluator.
    expect(
      evaluate(step.evaluator!, {
        code: step.solution!,
        result: canonicalResult,
        answer: "wrong answer",
      }).passed,
    ).toBe(true);
  }, 30_000);
  for (const [name, source] of Object.entries(fixture.mutants)) {
    it(`${step.id}: compiles but rejects ${name}`, () => {
      compileAndRun(`${step.id}/${name}`, source, testsOf(step), false);
    }, 15_000);
  }
  it(`${step.id}: exposes the declared typed API to an external consumer`, () => {
    const directory = mkdtempSync(join(tmpdir(), "ownership-public-api-"));
    try {
      const library = join(directory, "library.rs"),
        compiledLibrary = join(directory, "libownership_api.rlib"),
        consumer = join(directory, "consumer.rs");
      writeFileSync(library, step.solution!);
      const compiled = spawnSync(
        "rustc",
        [
          "--edition=2024",
          "--crate-type=rlib",
          "--crate-name=ownership_api",
          library,
          "-o",
          compiledLibrary,
        ],
        { encoding: "utf8", timeout: 60_000 },
      );
      expect(compiled.error).toBeUndefined();
      expect(compiled.status, compiled.stderr).toBe(0);
      const [name, signature] = fixture.signature.split(": ");
      writeFileSync(
        consumer,
        `fn main() { let _api: ${signature} = ownership_api::${name}; }`,
      );
      const consumed = spawnSync(
        "rustc",
        [
          "--edition=2024",
          consumer,
          "--extern",
          `ownership_api=${compiledLibrary}`,
          "-o",
          join(directory, "consumer"),
        ],
        { encoding: "utf8", timeout: 60_000 },
      );
      expect(consumed.error).toBeUndefined();
      expect(consumed.status, consumed.stderr).toBe(0);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }, 30_000);
}

it("observes intentional E0502 starters separately from wrong-behavior test failures", () => {
  for (const step of [
    stepAt("borrow-intro", "borrow-conflict"),
    stepAt("adversarial-no-clone", "adversarial-conflict"),
  ]) {
    const directory = mkdtempSync(join(tmpdir(), "ownership-starter-error-"));
    try {
      const source = join(directory, "starter.rs");
      writeFileSync(source, step.code!);
      const compiled = spawnSync(
        "rustc",
        ["--edition=2024", source, "-o", join(directory, "starter")],
        { encoding: "utf8", timeout: 60_000 },
      );
      expect(compiled.error).toBeUndefined();
      expect(compiled.status).not.toBe(0);
      expect(compiled.stderr, step.id).toContain("E0502");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }
}, 30_000);
it("compiles the replace/retrieval starters but rejects their unchanged behavior", () => {
  for (const step of [
    stepAt("borrow-intro", "borrow-mutable-run"),
    reviewExercises["mutable-borrow"],
  ])
    compileAndRun(`${step.id}/starter`, step.code!, testsOf(step), false);
}, 30_000);
it("rejects missing mutation functions even when main prints the old expected output", () => {
  for (const { step } of mutationCases) {
    const directory = mkdtempSync(join(tmpdir(), "ownership-missing-api-"));
    try {
      const source = join(directory, "literal.rs");
      writeFileSync(
        source,
        appendHiddenTests('fn main() { println!("hi!"); }', testsOf(step)),
      );
      const compiled = spawnSync(
        "rustc",
        ["--edition=2024", "--test", source, "-o", join(directory, "literal")],
        { encoding: "utf8", timeout: 60_000 },
      );
      expect(compiled.error).toBeUndefined();
      expect(compiled.status).not.toBe(0);
      expect(compiled.stderr, step.id).toContain("E0425");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }
}, 30_000);
it("uses a distinct executable recall family and only audits the named primary families", () => {
  expect(reviewExercises["mutable-borrow"].evidence).toEqual({
    version: 2,
    conceptIds: ["mutable-borrow"],
    codingTaskId: "ownership/recall-remove-trailing-mark",
  });
  expect(reviewExercises["mutable-borrow"].evidenceKind).toBe("recall");
  expect(reviewExercises["mutable-borrow"].code?.trim().length).toBeGreaterThan(
    0,
  );
  expect(
    lessons
      .flatMap((lesson) => lesson.steps)
      .filter((step) => step.evidence?.codingTaskId)
      .map((step) => step.id),
  ).toEqual([
    "borrow-conflict",
    "borrow-mutable-run",
    "adversarial-code",
    "adversarial-conflict",
    "assessment-repair",
  ]);
  for (const fixture of readLengthFixtures)
    expect(
      stepAt(fixture.lessonId, fixture.stepId).evidence?.codingTaskId,
    ).toBe("ownership/read-length");
  for (const step of lessons
    .flatMap((lesson) => lesson.steps)
    .filter((step) => step.evaluator?.kind === "rubric"))
    expect(step.evidenceKind, step.id).toBe("self-rating");
});
for (const fixture of readLengthFixtures) {
  it(`${fixture.stepId}: proves borrowed byte length with canonical/equivalent and compiled mutants`, () => {
    const step = stepAt(fixture.lessonId, fixture.stepId);
    compileAndRun(`${step.id}/canonical`, step.solution!, testsOf(step), true);
    compileAndRun(
      `${step.id}/equivalent`,
      fixture.equivalent,
      testsOf(step),
      true,
    );
    for (const [index, source] of fixture.mutants.entries())
      compileAndRun(`${step.id}/mutant-${index}`, source, testsOf(step), false);
  }, 30_000);
}
