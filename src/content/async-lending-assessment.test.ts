import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";
import {
  nativeDirectory,
  nativeRun,
  exactResult,
  discardDirectory,
} from "./async-lending-native-test-support";

import { appendHiddenTests } from "../runner";
import {
  asyncLendingAssessmentFixtures,
  asyncLendingTransferMutants,
} from "./async-lending-assessment-fixtures";
import {
  asyncLendingCoreLessons,
  asyncLendingCoreReviewExercises,
} from "./async-lending-core";
import {
  asyncLendingBoundaryLessons,
  asyncLendingBoundaryReviewExercises,
} from "./async-lending-boundaries";

const assessments = [
  ...asyncLendingCoreLessons.flatMap((lesson) =>
    lesson.steps.filter((step) => step.evaluator?.kind === "tests"),
  ),
  ...asyncLendingBoundaryLessons.flatMap((lesson) =>
    lesson.steps.filter((step) => step.evaluator?.kind === "tests"),
  ),
  ...Object.values(asyncLendingCoreReviewExercises),
  ...Object.values(asyncLendingBoundaryReviewExercises),
];

it("covers thirteen coding assessments and five independent reviews with distinct equivalents and compiling mutants", () => {
  expect(assessments).toHaveLength(18);
  expect(asyncLendingAssessmentFixtures).toHaveLength(18);
  expect(
    asyncLendingAssessmentFixtures.map((fixture) => fixture.id).sort(),
  ).toEqual(assessments.map((step) => step.id).sort());
  for (const fixture of asyncLendingAssessmentFixtures) {
    const step = assessments.find((candidate) => candidate.id === fixture.id)!;
    expect(fixture.equivalent.replace(/\s+/g, ""), fixture.id).not.toBe(
      step.solution!.replace(/\s+/g, ""),
    );
    expect(fixture.mutant, fixture.id).not.toBe(fixture.equivalent);
    expect(fixture.mutant, fixture.id).not.toBe(step.solution);
    for (const mutant of fixture.mutants ?? []) {
      expect(mutant, fixture.id).not.toBe(fixture.equivalent);
      expect(mutant, fixture.id).not.toBe(step.solution);
    }
    const descriptors = asyncLendingTransferMutants[fixture.id];
    if (descriptors) {
      expect(descriptors).toHaveLength(
        fixture.id.includes("callbacks") ? 5 : 6,
      );
      expect(new Set(descriptors.map((item) => item.id)).size).toBe(
        descriptors.length,
      );
      expect(
        descriptors.every((item) =>
          item.testName.startsWith("__rust_workshop_hidden_tests::"),
        ),
      ).toBe(true);
      expect([fixture.mutant, ...(fixture.mutants ?? [])]).toEqual(
        descriptors.map((item) => item.source),
      );
    }
  }
});

it("keeps the exact stable mutant ID to named assertion mapping", () => {
  const qualified = (name: string) => `__rust_workshop_hidden_tests::${name}`;
  expect(
    Object.fromEntries(
      Object.entries(asyncLendingTransferMutants).map(([id, descriptors]) => [
        id,
        descriptors.map((item) => [item.id, item.testName]),
      ]),
    ),
  ).toEqual({
    "async-lending-callbacks-bounded-transform": [
      [
        "emitted-output-budget",
        qualified(
          "input_budget_counts_filtered_records_and_repeated_calls_resume",
        ),
      ],
      [
        "commit-before-await",
        qualified("first_error_keeps_prior_commits_and_replays_failing_record"),
      ],
      [
        "skip-without-consumed-count",
        qualified("all_filtered_records_still_use_input_budget"),
      ],
      [
        "ignore-error-and-continue",
        qualified("first_error_keeps_prior_commits_and_replays_failing_record"),
      ],
      [
        "remove-pending-input",
        qualified(
          "dropping_pending_second_callback_keeps_current_input_and_prior_commits",
        ),
      ],
    ],
    "async-lending-dyn-adapter-borrowed-sources": [
      [
        "wrong-provider",
        qualified("heterogeneous_local_routing_pointer_and_real_pending"),
      ],
      [
        "pending-as-none",
        qualified("heterogeneous_local_routing_pointer_and_real_pending"),
      ],
      [
        "eager-provider-call",
        qualified("eager_provider_is_not_invoked_by_unpolled_adapter"),
      ],
      [
        "collect-one",
        qualified(
          "bounded_collection_retains_empty_records_remainder_and_exhaustion",
        ),
      ],
      [
        "skip-empty",
        qualified(
          "bounded_collection_retains_empty_records_remainder_and_exhaustion",
        ),
      ],
      [
        "wrong-borrowed-bytes",
        qualified("borrowed_bytes_are_forwarded_without_substitution"),
      ],
    ],
  });
});

it("keeps overlapping mutable batch borrows as a separate compiler-negative case", () => {
  const batch = assessments.find(
    (step) => step.id === "async-lending-receiver-bounded-batch",
  );
  if (!batch?.solution) throw new Error("Missing receiver batch solution");
  const directory = mkdtempSync(join(tmpdir(), "async-lending-batch-overlap-"));
  try {
    const file = join(directory, "overlap.rs");
    writeFileSync(
      file,
      `${batch.solution}
fn overlapping_mutable_borrows_are_rejected() {
    let mut receiver = BatchReceiver::new(vec![b"a".to_vec(), b"b".to_vec()]);
    let first = receiver.receive_up_to(1);
    let _second = receiver.receive_up_to(1);
    let _ = first;
}
`,
    );
    const compiled = spawnSync(
      "rustc",
      ["--edition=2024", "--test", file, "-o", join(directory, "overlap")],
      { cwd: directory, encoding: "utf8", timeout: 60_000 },
    );
    expect(compiled.status).not.toBe(0);
    expect(`${compiled.stdout}\n${compiled.stderr}`).toContain("cannot borrow");
  } finally {
    discardDirectory(directory);
  }
});

it.each(asyncLendingAssessmentFixtures)(
  "$id accepts its equivalent and rejects its behavior mutant",
  (fixture) => {
    const step = assessments.find((candidate) => candidate.id === fixture.id)!;
    if (!step.solution || step.evaluator?.kind !== "tests")
      throw new Error(`Missing test step ${fixture.id}`);
    const directory = nativeDirectory(
      `async-lending-assessment-${fixture.id}-`,
    );
    try {
      const descriptors = asyncLendingTransferMutants[fixture.id];
      if (descriptors) {
        const binaries: Record<string, string> = {};
        for (const [name, source] of [
          ["canonical", step.solution],
          ["equivalent", fixture.equivalent],
          ...descriptors.map((item) => [item.id, item.source]),
        ] as const) {
          const file = join(directory, `${name}.rs`);
          const binary = join(directory, name);
          writeFileSync(file, appendHiddenTests(source, step.evaluator.tests));
          const compiled = nativeRun(
            "rustc",
            ["--edition=2024", "--test", file, "-o", binary],
            directory,
            60_000,
          );
          expect(compiled.error).toBeUndefined();
          expect(compiled.signal).toBeNull();
          expect(compiled.status, compiled.stderr).toBe(0);
          binaries[name] = binary;
        }
        for (const name of ["canonical", "equivalent"]) {
          const run = nativeRun(
            binaries[name],
            ["--test-threads=1"],
            directory,
            8_000,
          );
          expect(run.error).toBeUndefined();
          expect(run.signal).toBeNull();
          expect(run.status, run.stdout + run.stderr).toBe(0);
          expect(run.stdout).toContain(
            fixture.id.includes("callbacks")
              ? "8 passed; 0 failed"
              : "7 passed; 0 failed",
          );
        }
        for (const descriptor of descriptors) {
          const args = [
            "--exact",
            descriptor.testName,
            "--test-threads=1",
            "--nocapture",
          ];
          exactResult(
            nativeRun(binaries[descriptor.id], args, directory, 8_000),
            descriptor.testName,
            false,
          );
          exactResult(
            nativeRun(binaries.canonical, args, directory, 8_000),
            descriptor.testName,
            true,
          );
        }
        return;
      }
      const mutants = [fixture.mutant, ...(fixture.mutants ?? [])];
      for (const [name, source, expected] of [
        ["canonical", step.solution, 0],
        ["equivalent", fixture.equivalent, 0],
        ...mutants.map(
          (mutant, index) => [`mutant-${index + 1}`, mutant, 101] as const,
        ),
      ] as const) {
        const file = join(directory, `${name}.rs`);
        const binary = join(directory, name);
        writeFileSync(file, appendHiddenTests(source, step.evaluator.tests));
        const compiled = spawnSync(
          "rustc",
          ["--edition=2024", "--test", file, "-o", binary],
          { cwd: directory, encoding: "utf8", timeout: 60_000 },
        );
        expect(
          compiled.status,
          `${fixture.id}/${name}: ${compiled.stderr}`,
        ).toBe(0);
        const executed = spawnSync(binary, ["--test-threads=1"], {
          cwd: directory,
          encoding: "utf8",
          timeout: 8_000,
        });
        expect(
          executed.status,
          `${fixture.id}/${name}: ${executed.stdout}${executed.stderr}`,
        ).toBe(expected);
      }
    } finally {
      discardDirectory(directory);
    }
  },
  240_000,
);

const reviewSteps = [
  ...Object.values(asyncLendingCoreReviewExercises),
  ...Object.values(asyncLendingBoundaryReviewExercises),
];

it.each(reviewSteps)(
  "$id rejects the unchanged canonical gate solution",
  (review) => {
    const canonical = assessments.find(
      (step) => step.id === review.id.replace("-review", "-gate"),
    );
    if (!canonical?.solution || review.evaluator?.kind !== "tests")
      throw new Error(`Missing canonical pair for ${review.id}`);
    const directory = mkdtempSync(join(tmpdir(), "async-lending-review-"));
    try {
      const file = join(directory, "review.rs");
      writeFileSync(
        file,
        appendHiddenTests(canonical.solution, review.evaluator.tests),
      );
      const compiled = spawnSync(
        "rustc",
        ["--edition=2024", "--test", file, "-o", join(directory, "review")],
        { cwd: directory, encoding: "utf8", timeout: 60_000 },
      );
      expect(compiled.status, `${review.id}: ${compiled.stderr}`).not.toBe(0);
    } finally {
      discardDirectory(directory);
    }
  },
  120_000,
);

it("rejects the Send gate starter because it borrows Rc across await", () => {
  const lesson = asyncLendingBoundaryLessons.find(
    (candidate) => candidate.id === "async-lending-send-boundary",
  );
  const gate = lesson?.steps.find(
    (step) => step.id === "async-lending-send-boundary-gate",
  );
  if (!gate?.code) throw new Error("Missing Send starter");
  const directory = mkdtempSync(join(tmpdir(), "async-lending-send-starter-"));
  try {
    const file = join(directory, "starter.rs");
    writeFileSync(file, gate.code);
    const result = spawnSync(
      "rustc",
      ["--edition=2024", file, "-o", join(directory, "starter")],
      { cwd: directory, encoding: "utf8", timeout: 60_000 },
    );
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toContain(
      "future cannot be sent between threads safely",
    );
  } finally {
    discardDirectory(directory);
  }
});
