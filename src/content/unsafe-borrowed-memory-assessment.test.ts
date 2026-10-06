import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { appendHiddenTests } from "../runner";
import {
  unsafeBorrowedMemoryAssessmentFixtures,
  unsafeBorrowedMemoryCompileFailFixtures,
} from "./unsafe-borrowed-memory-assessment-fixtures";
import { invariantVarianceMutant } from "./unsafe-borrowed-memory-contracts";
import {
  unsafeBorrowedMemoryLessons,
  unsafeBorrowedMemoryReviewExercises,
} from "./unsafe-borrowed-memory";

const fixtureById = (id: string) =>
  unsafeBorrowedMemoryAssessmentFixtures.find((fixture) => fixture.id === id)!;

function compileAndRun(
  id: string,
  source: string,
  tests: string,
  expected: boolean,
) {
  const directory = mkdtempSync(
    join(tmpdir(), "unsafe-borrowed-memory-assessment-"),
  );
  try {
    const file = join(directory, `${id}.rs`);
    const binary = join(directory, id);
    writeFileSync(file, appendHiddenTests(source, tests));
    const compiled = spawnSync(
      "rustc",
      ["--edition=2024", "--test", file, "-o", binary],
      { cwd: directory, encoding: "utf8", timeout: 60_000 },
    );
    expect(compiled.error, `${id}: compiler`).toBeUndefined();
    expect(compiled.status, `${id}: ${compiled.stderr}`).toBe(0);
    const executed = spawnSync(binary, ["--test-threads=1"], {
      cwd: directory,
      encoding: "utf8",
      timeout: 8_000,
    });
    expect(executed.error, `${id}: runner`).toBeUndefined();
    expect(
      executed.status === 0,
      `${id}: ${executed.stdout}${executed.stderr}`,
    ).toBe(expected);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function compileMustFail(id: string, source: string, diagnostic: RegExp) {
  const directory = mkdtempSync(
    join(tmpdir(), "unsafe-borrowed-memory-compile-fail-"),
  );
  try {
    const file = join(directory, `${id}.rs`);
    writeFileSync(file, source);
    const result = spawnSync("rustc", ["--edition=2024", file], {
      cwd: directory,
      encoding: "utf8",
      timeout: 60_000,
    });
    expect(result.error, `${id}: compiler`).toBeUndefined();
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toMatch(diagnostic);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function compileClient(id: string, source: string) {
  const directory = mkdtempSync(
    join(tmpdir(), "unsafe-borrowed-memory-client-"),
  );
  try {
    const file = join(directory, `${id}.rs`);
    writeFileSync(file, source);
    return spawnSync("rustc", ["--edition=2024", file], {
      cwd: directory,
      encoding: "utf8",
      timeout: 60_000,
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

it("keeps every fixture in an explicit execution mode", () => {
  expect(unsafeBorrowedMemoryAssessmentFixtures).toHaveLength(27);
  expect(
    new Set(unsafeBorrowedMemoryAssessmentFixtures.map((fixture) => fixture.id))
      .size,
  ).toBe(27);
  expect(
    unsafeBorrowedMemoryAssessmentFixtures.filter(
      (fixture) => fixture.mode === "miri-positive",
    ),
  ).toHaveLength(2);
  expect(
    unsafeBorrowedMemoryAssessmentFixtures.filter(
      (fixture) => fixture.mode === "miri-negative",
    ),
  ).toHaveLength(5);
  expect(
    unsafeBorrowedMemoryAssessmentFixtures
      .filter((fixture) => fixture.mode === "safe-behavior")
      .every((fixture) => fixture.tests),
  ).toBe(true);
});

it("runs canonical and equivalent safe contracts and rejects each behavioral mutant", () => {
  for (const fixture of unsafeBorrowedMemoryAssessmentFixtures.filter(
    (entry) => entry.mode === "safe-behavior",
  )) {
    compileAndRun(
      `${fixture.id}-canonical`,
      fixture.canonical,
      fixture.tests,
      true,
    );
    compileAndRun(
      `${fixture.id}-equivalent`,
      fixture.equivalent,
      fixture.tests,
      true,
    );
    if (fixture.autoTraitNegativeClient) {
      const client = `${fixture.autoTraitNegativeClient}\n`;
      const canonical = compileClient(
        `${fixture.id}-canonical-client`,
        `${fixture.canonical}\n${client}`,
      );
      const mutant = compileClient(
        `${fixture.id}-mutant-client`,
        `${fixture.mutant}\n${client}`,
      );
      expect(
        canonical.status,
        `${fixture.id}: canonical Cell Sync client`,
      ).not.toBe(0);
      expect(
        mutant.status,
        `${fixture.id}: blanket Sync mutant must be detected`,
      ).toBe(0);
    } else if (fixture.id === "unsafe-borrowed-reborrow-soundness-gate") {
      const client = `${fixture.canonical}\n${unsafeBorrowedMemoryCompileFailFixtures
        .find((entry) => entry.id === "borrowed-memory-invariant-write")!
        .source.split("\n")
        .at(-1)}`;
      const canonical = compileClient(
        `${fixture.id}-variance-canonical`,
        client,
      );
      const mutant = compileClient(
        `${fixture.id}-variance-mutant`,
        `${invariantVarianceMutant}\n${unsafeBorrowedMemoryCompileFailFixtures
          .find((entry) => entry.id === "borrowed-memory-invariant-write")!
          .source.split("\n")
          .at(-1)}`,
      );
      expect(canonical.status).not.toBe(0);
      expect(mutant.status).toBe(0);
    } else {
      compileAndRun(
        `${fixture.id}-mutant`,
        fixture.mutant,
        fixture.tests,
        false,
      );
    }
  }
}, 240_000);

it("rejects lifetime and auto-trait compile-fail clients by diagnostic class", () => {
  for (const fixture of unsafeBorrowedMemoryCompileFailFixtures)
    compileMustFail(
      fixture.id,
      fixture.source,
      new RegExp(fixture.expectedDiagnostic),
    );
});

it("requires positive and negative Miri fixtures to carry distinct evidence", () => {
  for (const fixture of unsafeBorrowedMemoryAssessmentFixtures.filter((entry) =>
    entry.mode.startsWith("miri"),
  )) {
    expect(fixture.canonical).toContain("unsafe");
    expect(fixture.equivalent).toContain("unsafe");
    if (fixture.mode === "miri-negative")
      expect(fixture.expectedDiagnostic).toEqual(expect.any(String));
    else expect(fixture.expectedDiagnostic).toBeUndefined();
  }
});

it("keeps primary, blank, and review fixtures materially independent", () => {
  for (const prefix of ["provenance", "reborrow", "slot", "auto-traits"]) {
    const fixtures = [
      fixtureById(`unsafe-borrowed-${prefix}-boundary-gate`),
      fixtureById(`unsafe-borrowed-${prefix}-blank`),
      fixtureById(`review-unsafe-borrowed-${prefix}`),
    ];
    const identities = fixtures.map((fixture) =>
      [
        fixture.canonical,
        fixture.equivalent,
        fixture.mutant,
        fixture.tests,
      ].join("\n---\n"),
    );
    expect(new Set(identities).size, `${prefix} fixture identity`).toBe(3);
    expect(new Set(fixtures.map((fixture) => fixture.tests)).size).toBe(3);
    expect(new Set(fixtures.map((fixture) => fixture.mutant)).size).toBe(3);
  }
});

it("keeps published test starters incomplete until learner edits", () => {
  const starterIds = [
    "unsafe-borrowed-auto-traits-boundary-gate",
    ...unsafeBorrowedMemoryLessons.map(
      (lesson) => `${lesson.id}-soundness-gate`,
    ),
    ...unsafeBorrowedMemoryLessons.map(
      (lesson) => `${lesson.id}-soundness-transfer`,
    ),
  ];
  for (const id of starterIds) {
    const lesson = unsafeBorrowedMemoryLessons.find((entry) =>
      id.startsWith(`${entry.id}-`),
    )!;
    const step = lesson.steps.find((entry) => entry.id === id)!;
    if (step.evaluator?.kind !== "tests")
      throw new Error(`${id} lacks test evaluator`);
    const directory = mkdtempSync(
      join(tmpdir(), "unsafe-borrowed-memory-starter-"),
    );
    try {
      const file = join(directory, `${id}.rs`);
      const binary = join(directory, id);
      writeFileSync(file, appendHiddenTests(step.code!, step.evaluator.tests));
      const compiled = spawnSync(
        "rustc",
        ["--edition=2024", "--test", file, "-o", binary],
        { cwd: directory, encoding: "utf8" },
      );
      if (compiled.status === 0) {
        const executed = spawnSync(binary, ["--test-threads=1"], {
          cwd: directory,
          encoding: "utf8",
        });
        expect(executed.status, `${id} starter unexpectedly passes`).not.toBe(
          0,
        );
      } else
        expect(
          compiled.status,
          `${id} starter must require learner edits`,
        ).not.toBe(0);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }
  const review =
    unsafeBorrowedMemoryReviewExercises["unsafe-borrowed-auto-traits-contract"];
  expect(review.code).not.toContain("unsafe impl");
  expect(review.code).not.toContain("reattach<'short>");
});
