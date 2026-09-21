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
import {
  autoTraitsMutant,
  compileFailCellSync,
} from "./unsafe-borrowed-memory-contracts";

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

it("keeps every fixture in an explicit execution mode", () => {
  expect(unsafeBorrowedMemoryAssessmentFixtures).toHaveLength(20);
  expect(
    new Set(unsafeBorrowedMemoryAssessmentFixtures.map((fixture) => fixture.id))
      .size,
  ).toBe(20);
  expect(
    unsafeBorrowedMemoryAssessmentFixtures.filter(
      (fixture) => fixture.mode === "miri-positive",
    ),
  ).toHaveLength(2);
  expect(
    unsafeBorrowedMemoryAssessmentFixtures.filter(
      (fixture) => fixture.mode === "miri-negative",
    ),
  ).toHaveLength(2);
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
    if (fixture.id.includes("auto-traits")) {
      compileMustFail(
        `${fixture.id}-mutant`,
        `${autoTraitsMutant}\n${compileFailCellSync}`,
        /Sync|trait bound/,
      );
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
