import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { appendHiddenTests, parseTests } from "../runner";
import {
  delayedSharedCountLinesContract,
  sharedCountWordsContract,
  sharedHasSuffixContract,
} from "./ownership-evidence-contracts";
import {
  sharedBorrowCompileControls,
  sharedBorrowFixtures,
} from "./ownership-evidence-assessment-fixtures";

type FixtureBudget = { compileMs: number; executionMs: number };

function rustFixture(
  code: string,
  tests: string | undefined,
  budget: FixtureBudget,
) {
  const dir = mkdtempSync(join(tmpdir(), "shared-borrow-contract-"));
  const source = join(dir, "fixture.rs");
  const binary = join(dir, "fixture.bin");
  try {
    const testMode = tests !== undefined;
    writeFileSync(
      source,
      testMode ? appendHiddenTests(code, tests) : code,
      "utf8",
    );
    const compile = spawnSync(
      process.env.RUSTC_BIN ?? "rustc",
      [
        "--edition",
        "2024",
        ...(testMode ? ["--test"] : []),
        source,
        "-o",
        binary,
      ],
      { encoding: "utf8", timeout: budget.compileMs },
    );
    if (compile.status !== 0 || !testMode) {
      return {
        compiled: compile.status === 0,
        status: compile.status,
        processError: compile.error?.message,
        signal: compile.signal,
        tests: undefined,
        stderr: compile.stderr ?? "",
        stdout: compile.stdout ?? "",
      };
    }
    const execution = spawnSync(binary, [], {
      encoding: "utf8",
      timeout: budget.executionMs,
    });
    return {
      compiled: true,
      status: execution.status,
      processError: execution.error?.message,
      signal: execution.signal,
      tests: parseTests(`${execution.stdout ?? ""}\n${execution.stderr ?? ""}`),
      stderr: execution.stderr ?? "",
      stdout: execution.stdout ?? "",
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const compileBudget = { compileMs: 60_000, executionMs: 1_000 };
const testBudget = { compileMs: 60_000, executionMs: 8_000 };
const testDeadline = 70_000;

it("exports all three bounded shared-borrow contract families", () => {
  expect(sharedCountWordsContract).toMatchObject({
    starter: expect.any(String),
    solution: expect.any(String),
    tests: expect.any(String),
  });
  expect(sharedHasSuffixContract).toMatchObject({
    starter: expect.any(String),
    solution: expect.any(String),
    tests: expect.any(String),
  });
  expect(delayedSharedCountLinesContract).toMatchObject({
    starter: expect.any(String),
    solution: expect.any(String),
    tests: expect.any(String),
  });
  expect(Object.keys(sharedBorrowFixtures)).toEqual([
    "shared-count-words-v1",
    "shared-has-suffix-v1",
    "shared-count-lines-delayed-v1",
  ]);
  expect(Object.keys(sharedBorrowCompileControls)).toEqual([
    "sharedCountWordsStarter",
    "sharedCountWordsOwnedSignature",
    "sharedCountWordsStringReferenceSignature",
    "sharedCountWordsMutableSliceSignature",
    "sharedHasSuffixStarter",
    "sharedHasSuffixTextOwnedStarter",
    "sharedHasSuffixSuffixOwnedControl",
    "sharedHasSuffixOwnedSignature",
    "sharedHasSuffixStringReferenceSignature",
    "sharedHasSuffixMutableSliceSignature",
    "delayedSharedCountLinesStarter",
    "delayedSharedCountLinesOwnedSignature",
    "delayedSharedCountLinesStringReferenceSignature",
    "delayedSharedCountLinesMutableSliceSignature",
  ]);
});

it("keeps each fixture tied to its exported contract and named witnesses", () => {
  expect(sharedBorrowFixtures["shared-count-words-v1"].contract).toBe(
    sharedCountWordsContract,
  );
  expect(sharedBorrowFixtures["shared-has-suffix-v1"].contract).toBe(
    sharedHasSuffixContract,
  );
  expect(sharedBorrowFixtures["shared-count-lines-delayed-v1"].contract).toBe(
    delayedSharedCountLinesContract,
  );
  for (const fixture of Object.values(sharedBorrowFixtures)) {
    expect(Object.keys(fixture.equivalents).length).toBeGreaterThan(0);
    for (const mutant of Object.values(fixture.mutants)) {
      expect(mutant.source).toContain("fn ");
      expect(mutant.witness.length).toBeGreaterThan(0);
      expect(fixture.contract.tests).toContain(mutant.witness);
    }
  }
});

it(
  "rejects the standalone count_words starter with E0308",
  () => {
    const result = rustFixture(
      sharedCountWordsContract.starter,
      undefined,
      compileBudget,
    );
    expect(result.compiled).toBe(false);
    expect(result.stderr).toContain("E0308");
  },
  testDeadline,
);

it(
  "rejects the standalone has_suffix starter with E0382",
  () => {
    const result = rustFixture(
      sharedHasSuffixContract.starter,
      undefined,
      compileBudget,
    );
    expect(result.compiled).toBe(false);
    expect(result.stderr).toContain("E0382");
  },
  testDeadline,
);

it(
  "rejects the standalone delayed count_lines starter with E0382",
  () => {
    const result = rustFixture(
      delayedSharedCountLinesContract.starter,
      undefined,
      compileBudget,
    );
    expect(result.compiled).toBe(false);
    expect(result.stderr).toContain("E0382");
  },
  testDeadline,
);

const compileControls = Object.entries(sharedBorrowCompileControls);
for (const [name, source] of compileControls) {
  it(
    `rejects shared-borrow compile control ${name} with E0308 or E0382`,
    () => {
      const result = rustFixture(source, undefined, compileBudget);
      expect(result.compiled).toBe(false);
      expect(result.stderr).toMatch(/E0308|E0382/);
      expect(result.processError).toBeUndefined();
      expect(result.signal).toBeNull();
    },
    testDeadline,
  );
}

function expectSemanticPass(source: string, tests: string): void {
  const result = rustFixture(source, tests, testBudget);
  expect(result.compiled).toBe(true);
  expect(result.status).toBe(0);
  expect(result.processError).toBeUndefined();
  expect(result.signal).toBeNull();
  expect(result.tests?.failed).toBe(0);
  expect(result.tests?.passed).toBeGreaterThan(0);
}

function expectSemanticFailure(
  source: string,
  tests: string,
  witness: string,
): void {
  const result = rustFixture(source, tests, testBudget);
  expect(result.compiled).toBe(true);
  expect(result.status).toBe(101);
  expect(result.processError).toBeUndefined();
  expect(result.signal).toBeNull();
  expect(result.tests?.failed).toBeGreaterThan(0);
  expect(
    (result.tests?.passed ?? 0) + (result.tests?.failed ?? 0),
  ).toBeGreaterThan(0);
  expect(`${result.stdout}\n${result.stderr}`).toContain(witness);
}

for (const [family, fixture] of Object.entries(sharedBorrowFixtures)) {
  it(
    `accepts the canonical ${family} implementation`,
    () => {
      expectSemanticPass(fixture.contract.solution, fixture.contract.tests);
    },
    testDeadline,
  );
  for (const [equivalentName, equivalent] of Object.entries(
    fixture.equivalents,
  )) {
    it(
      `accepts ${family} equivalent ${equivalentName}`,
      () => {
        expectSemanticPass(equivalent, fixture.contract.tests);
      },
      testDeadline,
    );
  }
  for (const [mutantName, mutant] of Object.entries(fixture.mutants)) {
    it(
      `rejects ${family} mutant ${mutantName} at ${mutant.witness}`,
      () => {
        expectSemanticFailure(
          mutant.source,
          fixture.contract.tests,
          mutant.witness,
        );
      },
      testDeadline,
    );
  }
}
