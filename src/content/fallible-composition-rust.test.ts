/** Only repository-authored source is compiled. An explicit requested toolchain must exist. */
import { appendFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { appendHiddenTests } from "../runner";
import {
  fallibleCompositionLessons,
  fallibleCompositionReviewExercises,
} from "./fallible-composition";
import { fallibleCompositionFixtures } from "./fallible-composition-fixtures";
function execute(toolchain: string, code: string, tests?: string) {
  const dir = mkdtempSync(join(tmpdir(), "fallible-authored-"));
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
        "--crate-name=fallible_authored",
        ...(tests ? ["--test"] : []),
        "-o",
        binary,
      ],
      { encoding: "utf8", timeout: 60000 },
    );
    const result =
      compiler.status === 0
        ? spawnSync(binary, [], { encoding: "utf8", timeout: 8000 })
        : undefined;
    if (process.env.FALLIBLE_RUST_REPORT)
      appendFileSync(
        process.env.FALLIBLE_RUST_REPORT,
        JSON.stringify({
          toolchain,
          source: code,
          tests,
          compiler: {
            status: compiler.status,
            stdout: compiler.stdout,
            stderr: compiler.stderr,
            error: compiler.error?.message,
            signal: compiler.signal,
          },
          execution: result && {
            status: result.status,
            stdout: result.stdout,
            stderr: result.stderr,
            error: result.error?.message,
            signal: result.signal,
          },
        }) + "\n",
      );
    return { compiler, result };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
for (const toolchain of process.env.FALLIBLE_RUST_TOOLCHAINS?.split(",") ?? [
  "default",
]) {
  describe(`fallible composition on ${toolchain}`, () => {
    for (const fixture of fallibleCompositionFixtures) {
      it(`${fixture.id}: accepts diverse equivalents and rejects compiling contract violations`, () => {
        const all = [
          ...fallibleCompositionLessons.flatMap((l) => l.steps),
          ...Object.values(fallibleCompositionReviewExercises),
        ];
        const step = all.find((s) => s.id === fixture.id)!;
        if (step.evaluator?.kind !== "tests")
          throw new Error(`Missing tests: ${fixture.id}`);
        for (const code of [step.solution!, fixture.alternate]) {
          const run = execute(toolchain, code, step.evaluator.tests);
          expect(run.compiler.status, run.compiler.stderr).toBe(0);
          expect(run.result?.status, run.result?.stdout).toBe(0);
        }
        for (const [name, mutant] of Object.entries(fixture.mutants)) {
          const run = execute(toolchain, mutant.code, step.evaluator.tests);
          expect(run.compiler.status, `${name}: ${run.compiler.stderr}`).toBe(
            0,
          );
          expect(run.result?.error, `${name}: process error`).toBeUndefined();
          expect(
            run.result?.signal,
            `${name}: terminated by signal`,
          ).toBeNull();
          expect(
            run.result?.status,
            `${name} escaped or did not fail Rust tests`,
          ).toBe(101);
          expect(run.result?.stdout, name).toContain(
            `${mutant.assertion} ... FAILED`,
          );
        }
        if (step.code) {
          const run = execute(toolchain, step.code, step.evaluator.tests);
          expect(run.compiler.status, run.compiler.stderr).toBe(0);
          expect(
            run.result?.status,
            `${fixture.id} starter already passes`,
          ).not.toBe(0);
        }
      }, 60000);
    }
    it("executes every discovery, prediction and compiling counterexample", () => {
      for (const step of fallibleCompositionLessons
        .flatMap((l) => l.steps)
        .filter((s) => s.evaluator?.kind === "exact-output")) {
        const run = execute(toolchain, step.code!);
        expect(run.compiler.status, run.compiler.stderr).toBe(0);
        expect(run.result?.status, step.id).toBe(0);
        if (step.evaluator?.kind === "exact-output")
          expect(run.result?.stdout, step.id).toBe(step.evaluator.expected);
      }
    }, 60000);
  });
}
