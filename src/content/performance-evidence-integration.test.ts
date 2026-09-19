import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { lessons, modules, reviewExercises } from "./course";
import { performanceEvidenceAssessmentFixtures } from "./performance-evidence-assessment-fixtures";
import { createInitialState, stepKey } from "../persistence/state";
import { moduleGate, recordEvidence } from "../engine/learning";

const lessonIds = [
  "performance-measured-workload",
  "performance-borrowed-stream",
  "performance-bounded-buffer",
  "performance-evidence-decisions",
];

it("wires the authored performance verifier into package scripts and CI", () => {
  const packageJson = JSON.parse(
    readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
  ) as { scripts?: Record<string, string> };
  expect(packageJson.scripts?.["content:performance"]).toBe(
    "node --import tsx scripts/verify-performance.ts",
  );

  const ci = readFileSync(
    new URL("../../.github/workflows/ci.yml", import.meta.url),
    "utf8",
  );
  expect(ci).toMatch(
    /- run: npm run content:performance -- --fetch[\s\S]*?- run: npm run content:ffi\n[\s\S]*?- run: npm run content:capstone -- --fetch[\s\S]*?- run: npm run content:cargo/,
  );
  expect(ci).toMatch(
    /# Fetch Proptest and Criterion[\s\S]*- run: npm run content:performance -- --fetch --msrv[\s\S]*?- run: npm run content:ffi -- --msrv[\s\S]*?- run: npm run content:capstone -- --fetch --msrv[\s\S]*?- run: npm run content:cargo/,
  );
  expect(ci).toMatch(
    /PATH="\$gat_rust_bin:\$PATH" RUSTUP_TOOLCHAIN=1\.85\.0 npx --no-install vitest run[\s\S]*src\/content\/performance-evidence-assessment\.test\.ts/,
  );
});

it("connects Performance Evidence to eight gates and independent retrievals", () => {
  const stage = modules.find((entry) => entry.id === "performance-evidence");
  expect(stage).toBeDefined();
  expect(stage!.lessonIds).toEqual(lessonIds);
  expect(stage!.prerequisites).toEqual(["property-contracts"]);
  expect(stage!.gateCriteria).toHaveLength(8);

  const moduleLessons = lessons.filter((lesson) =>
    lessonIds.includes(lesson.id),
  );
  expect(moduleLessons).toHaveLength(4);
  expect(
    moduleLessons.flatMap((lesson) =>
      lesson.steps.filter((step) => step.evidenceGate),
    ),
  ).toHaveLength(8);

  for (const lessonId of lessonIds) {
    const lesson = lessons.find((entry) => entry.id === lessonId)!;
    expect(lesson.steps.filter((step) => step.kind === "blank")).toHaveLength(
      1,
    );
    expect(
      lesson.steps.filter(
        (step) => step.kind === "recall" && step.evaluator?.kind === "tests",
      ),
    ).toHaveLength(1);
    expect(lesson.steps.filter((step) => step.evidenceGate)).toHaveLength(2);
    expect(
      lesson.steps
        .filter((step) => step.evidenceGate)
        .every((step) => step.evaluator?.kind === "tests"),
    ).toBe(true);
    expect(reviewExercises[lesson.conceptIds[0]]?.evaluator?.kind).toBe(
      "tests",
    );
  }

  let state = createInitialState();
  expect(moduleGate(state, lessons, stage!)).toMatchObject({ passed: false });
  for (const criterion of stage!.gateCriteria!) {
    const ref = criterion.taskRefs[0];
    const lesson = lessons.find((entry) => entry.id === ref.lessonId)!;
    const step = lesson.steps.find((entry) => entry.id === ref.stepId)!;
    expect(step.evidenceGate).toBe(true);
    state = recordEvidence(state, {
      id: `performance/${ref.lessonId}/${ref.stepId}`,
      conceptIds: lesson.conceptIds,
      lessonId: ref.lessonId,
      stepId: ref.stepId,
      kind: step.evidenceKind,
      passed: true,
      hints: 0,
      revealed: false,
      gate: true,
      evaluator: "tests",
      at: state.updatedAt + 1,
    });
  }
  expect(moduleGate(state, lessons, stage!).passed).toBe(true);
  expect(
    stage!.gateCriteria!.every((criterion) => criterion.taskRefs.length >= 2),
  ).toBe(true);
  expect(
    stage!.gateCriteria!.filter((criterion) =>
      criterion.taskRefs.some((ref) => ref.stepId.endsWith("-blank")),
    ),
  ).toHaveLength(4);
  const refs = stage!.gateCriteria!.flatMap((criterion) =>
    criterion.taskRefs.map((ref) => `${ref.lessonId}/${ref.stepId}`),
  );
  expect(refs).toHaveLength(16);
  expect(new Set(refs).size).toBe(16);

  for (const lesson of moduleLessons) {
    const blank = lesson.steps.find((step) => step.kind === "blank")!;
    expect(blank.code).toBeUndefined();
    expect(blank.solution).toBeTruthy();
    expect(blank.evaluator?.kind).toBe("tests");
    if (blank.evaluator?.kind === "tests")
      expect(blank.evaluator.tests).not.toMatch(
        /Instant|SystemTime|elapsed|sleep/,
      );
    const retrieval = lesson.steps.find(
      (step) => step.kind === "recall" && step.evaluator?.kind === "tests",
    )!;
    if (retrieval.evaluator?.kind === "tests")
      expect(retrieval.evaluator.tests).not.toMatch(
        /Instant|SystemTime|elapsed|sleep/,
      );
  }

  const buffer = moduleLessons.find(
    (lesson) => lesson.id === "performance-bounded-buffer",
  )!;
  const bufferGate = buffer.steps.find((step) => step.id === "buffer-gate")!;
  expect(bufferGate.evaluator?.kind).toBe("tests");
  if (bufferGate.evaluator?.kind === "tests")
    expect(bufferGate.evaluator.tests).toMatch(/stale|nonempty|EOF|empty/i);
  expect(
    performanceEvidenceAssessmentFixtures.find(
      (fixture) => fixture.id === "buffer-gate",
    )?.mutant,
  ).toMatch(/let mut own/);

  const workloadBlank = moduleLessons
    .find((lesson) => lesson.id === "performance-measured-workload")!
    .steps.find((step) => step.id === "workload-blank")!;
  expect(workloadBlank.prompt).toMatch(/WorkloadEvidence/);
  expect(workloadBlank.prompt).toMatch(/inspect_workload/);
  expect(workloadBlank.prompt).toMatch(/bajt/i);
  expect(workloadBlank.prompt).toMatch(
    /#\[derive\(Debug, PartialEq, Eq\)\][\s\S]*struct WorkloadEvidence \{ visited: usize, accepted: usize, rejected: usize \}/,
  );
  const borrowBlank = moduleLessons
    .find((lesson) => lesson.id === "performance-borrowed-stream")!
    .steps.find((step) => step.id === "borrow-blank")!;
  expect(borrowBlank.prompt).toMatch(/matching_views/);
  expect(borrowBlank.prompt).toMatch(/prefiks/i);
  const budgetRetrieval = moduleLessons
    .find((lesson) => lesson.id === "performance-measured-workload")!
    .steps.find((step) => step.id === "workload-recall")!;
  expect(budgetRetrieval.prompt).toMatch(
    /fits_budget\(evidence: WorkloadEvidence, budget: Budget\) -> bool/,
  );
  const workloadReview = reviewExercises["measured-workload-contract"]!;
  expect(workloadReview.title).toMatch(/budżet/i);
  expect(workloadReview.prompt).toMatch(
    /fits_budget\(evidence: WorkloadEvidence, budget: Budget\) -> bool/,
  );
  expect(workloadReview.prompt).not.toMatch(/token/i);
  const bufferBlank = buffer.steps.find((step) => step.id === "buffer-blank")!;
  expect(bufferBlank.prompt).toMatch(/clear/);
  expect(bufferBlank.prompt).toMatch(/EOF/);
  expect(bufferBlank.prompt).toMatch(
    /count_lines<R: BufRead>\(reader: R, scratch: &mut String\) -> io::Result<usize>/,
  );
  const bufferRetrieval = buffer.steps.find(
    (step) => step.id === "buffer-recall",
  )!;
  expect(bufferRetrieval.prompt).toMatch(
    /within_capacity\(scratch: &String, limit: usize\) -> bool/,
  );
  expect(bufferRetrieval.prompt).not.toMatch(/pętlę EOF/i);
  const decisionBlank = moduleLessons
    .find((lesson) => lesson.id === "performance-evidence-decisions")!
    .steps.find((step) => step.id === "decision-blank")!;
  expect(decisionBlank.prompt).toMatch(
    /#\[derive\(Debug, PartialEq, Eq\)\][\s\S]*enum Decision \{ Keep, Investigate\(&'static str\) \}/,
  );
  expect(decisionBlank.prompt).toMatch(
    /fn decide\(baseline: usize, candidate: usize, budget: usize\) -> Decision/,
  );
  expect(decisionBlank.prompt).toMatch(/budget[\s\S]*regression/i);
  expect(decisionBlank.prompt).toMatch(
    /budget[\s\S]*(?:priority|priorytet)|(?:priority|priorytet)[\s\S]*budget/i,
  );
});

it("keeps the module's coding evidence deterministic and mutation sensitive", () => {
  const moduleLessons = lessons.filter((lesson) =>
    lessonIds.includes(lesson.id),
  );
  const codingSteps = moduleLessons.flatMap((lesson) =>
    lesson.steps.filter((step) => step.evaluator?.kind === "tests"),
  );
  expect(codingSteps).toHaveLength(16);
  for (const step of codingSteps) {
    const evaluator = step.evaluator!;
    if (evaluator.kind !== "tests") continue;
    expect(evaluator.tests).toMatch(/#\[test\]/);
    expect(evaluator.tests).toMatch(/assert/);
    expect(evaluator.tests).not.toMatch(
      /Instant|SystemTime|elapsed|sleep|duration/i,
    );
  }

  const budgetTests = moduleLessons
    .find((lesson) => lesson.id === "performance-measured-workload")!
    .steps.find((step) => step.id === "workload-budget-gate")!.evaluator!;
  expect(budgetTests.kind).toBe("tests");
  if (budgetTests.kind === "tests") {
    expect(budgetTests.tests).toMatch(/visited: 5[\s\S]*max_visits: 4/);
    expect(budgetTests.tests).toMatch(/rejected: 3[\s\S]*max_rejections: 2/);
  }
  const explanationTests = moduleLessons
    .find((lesson) => lesson.id === "performance-evidence-decisions")!
    .steps.find((step) => step.id === "decision-evidence-gate")!.evaluator!;
  expect(explanationTests.kind).toBe("tests");
  if (explanationTests.kind === "tests")
    expect(explanationTests.tests).toMatch(/candidate: 11[\s\S]*budget: 20/);
});

it("uses stable step keys without changing the progress schema", () => {
  const stage = modules.find((entry) => entry.id === "performance-evidence")!;
  for (const criterion of stage.gateCriteria!) {
    const ref = criterion.taskRefs[0];
    expect(stepKey(ref.lessonId, ref.stepId)).toBe(
      `${ref.lessonId}:${ref.stepId}`,
    );
  }
});
