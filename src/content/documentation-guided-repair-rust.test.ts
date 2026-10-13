/** Compile only trusted author candidates; learner/imported source never enters this verifier. */
import { appendFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { appendHiddenTests } from "../runner";
import {
  documentationRepairLessons,
  documentationRepairReviewExercises,
} from "./documentation-guided-repair";
import { documentationRepairFixtures } from "./documentation-guided-repair-fixtures";
import { movedOwnerRepair } from "./documentation-guided-repair-contracts";
function execute(
  toolchain: string,
  candidate: string,
  variant: string,
  code: string,
  tests?: string,
) {
  const dir = mkdtempSync(join(tmpdir(), "documentation-authored-"));
  try {
    const source = join(dir, "authored.rs"),
      binary = join(dir, "authored");
    writeFileSync(source, tests ? appendHiddenTests(code, tests) : code);
    const compiler = spawnSync(
      toolchain === "default" ? "rustc" : "rustup",
      [
        ...(toolchain === "default" ? [] : ["run", toolchain, "rustc"]),
        "--edition=2024",
        source,
        "--crate-name=documentation_authored",
        ...(tests ? ["--test"] : []),
        "-o",
        binary,
      ],
      { encoding: "utf8", timeout: 60000 },
    );
    const execution =
      compiler.status === 0
        ? spawnSync(binary, [], { encoding: "utf8", timeout: 8000 })
        : undefined;
    if (process.env.DOCUMENTATION_RUST_REPORT)
      appendFileSync(
        process.env.DOCUMENTATION_RUST_REPORT,
        JSON.stringify({
          toolchain,
          candidate,
          variant,
          source: code,
          tests,
          compiler: {
            status: compiler.status,
            stdout: compiler.stdout,
            stderr: compiler.stderr,
            signal: compiler.signal,
            error: compiler.error?.message,
          },
          execution: execution && {
            status: execution.status,
            stdout: execution.stdout,
            stderr: execution.stderr,
            signal: execution.signal,
            error: execution.error?.message,
          },
        }) + "\n",
      );
    return { compiler, execution };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
function intendedCompileError(
  run: ReturnType<typeof execute>,
  expected: string,
) {
  expect(run.compiler.error).toBeUndefined();
  expect(run.compiler.signal).toBeNull();
  expect(run.compiler.status, run.compiler.stderr).toBe(1);
  const codes = [...run.compiler.stderr.matchAll(/error\[(E\d+)\]/g)].map(
    (m) => m[1],
  );
  expect(codes.length).toBeGreaterThan(0);
  expect(new Set(codes)).toEqual(new Set([expected]));
  expect(run.execution).toBeUndefined();
}
function compiled(run: ReturnType<typeof execute>) {
  expect(run.compiler.error).toBeUndefined();
  expect(run.compiler.signal).toBeNull();
  expect(run.compiler.status, run.compiler.stderr).toBe(0);
  expect(run.execution?.error).toBeUndefined();
  expect(run.execution?.signal).toBeNull();
}
for (const toolchain of process.env.DOCUMENTATION_RUST_TOOLCHAINS?.split(
  ",",
) ?? ["default"]) {
  describe(`documentation repair on ${toolchain}`, () => {
    it("identifies the selected compiler and rejects an unavailable requested compiler", () => {
      const version = spawnSync(
        toolchain === "default" ? "rustc" : "rustup",
        [
          ...(toolchain === "default" ? [] : ["run", toolchain, "rustc"]),
          "--version",
        ],
        { encoding: "utf8", timeout: 10000 },
      );
      expect(version.status, version.stderr).toBe(0);
      expect(version.stdout).toMatch(/^rustc /);
      if (toolchain === "1.85.0")
        expect(version.stdout).toMatch(/^rustc 1\.85\.0 /);
      if (process.env.DOCUMENTATION_RUST_REPORT)
        appendFileSync(
          process.env.DOCUMENTATION_RUST_REPORT,
          JSON.stringify({
            toolchain,
            compilerVersion: version.stdout.trim(),
          }) + "\n",
        );
    });
    for (const fixture of documentationRepairFixtures) {
      it(`${fixture.id} accepts borrowed equivalents and rejects named compiling violations`, () => {
        const step = [
          ...documentationRepairLessons.flatMap((l) => l.steps),
          ...Object.values(documentationRepairReviewExercises),
        ].find((s) => s.id === fixture.id)!;
        if (step.evaluator?.kind !== "tests")
          throw new Error(`Missing callable tests: ${fixture.id}`);
        for (const [variant, code] of [
          ["canonical", step.solution!],
          ["alternate", fixture.alternate],
          ...Object.entries(
            "positiveCharacterizations" in fixture
              ? (fixture.positiveCharacterizations ?? {})
              : {},
          ),
        ]) {
          const run = execute(
            toolchain,
            fixture.id,
            variant,
            code,
            step.evaluator.tests,
          );
          compiled(run);
          expect(run.execution?.status, run.execution?.stdout).toBe(0);
          expect(run.execution?.stdout).toMatch(
            /test result: ok\. [1-9]\d* passed/,
          );
        }
        for (const [name, mutant] of Object.entries(fixture.mutants)) {
          const run = execute(
            toolchain,
            fixture.id,
            name,
            mutant.code,
            step.evaluator.tests,
          );
          compiled(run);
          expect(
            run.execution?.status,
            `${name}: ${run.execution?.stdout}`,
          ).toBe(101);
          expect(run.execution?.stdout).toContain(
            `${mutant.assertion} ... FAILED`,
          );
          expect(run.execution?.stdout).toMatch(
            /test result: FAILED\. \d+ passed; [1-9]\d* failed/,
          );
        }
        if (step.code) {
          const run = execute(
            toolchain,
            fixture.id,
            "starter",
            step.code,
            step.evaluator.tests,
          );
          if (
            "starterError" in fixture &&
            typeof fixture.starterError === "string"
          )
            intendedCompileError(run, fixture.starterError);
          else {
            compiled(run);
            expect(run.execution?.status, run.execution?.stdout).toBe(101);
            expect(run.execution?.stdout).toContain("... FAILED");
          }
        }
      }, 60000);
    }
    it("proves the exact diagnostic witnesses and repaired borrowed owner program", () => {
      for (const [id, error] of [
        ["docs-type-observe", "E0308"],
        ["docs-owner-observe", "E0382"],
      ]) {
        const step = documentationRepairLessons[0].steps.find(
          (s) => s.id === id,
        )!;
        intendedCompileError(
          execute(toolchain, id, "intentional-diagnostic", step.code!),
          error,
        );
      }
      const repaired = execute(
        toolchain,
        "owner-repair",
        "borrowed",
        movedOwnerRepair,
      );
      compiled(repaired);
      expect(repaired.execution?.status, repaired.execution?.stderr).toBe(0);
      expect(repaired.execution?.stdout).toBe('Some("Łódź")|tag:Łódź\n');
    });
  });
}
