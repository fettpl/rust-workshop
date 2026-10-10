import { spawnSync } from "node:child_process";
import { appendFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { appendHiddenTests } from "../runner";
import { evaluate } from "../engine/evaluate";
import { recordsLessons } from "./modeling-records";
import { variantsLessons } from "./modeling-variants";
import { nestedPatternLessons } from "./nested-patterns";
import { traitsLessons } from "./traits";
import { baselinePatternFixtures } from "./baseline-patterns-fixtures";

/** Optional local audit stream; only the fixed trusted candidates below reach rustc. */
function command(
  command: string,
  args: string[],
  options: { encoding: "utf8"; timeout: number },
) {
  const result = spawnSync(command, args, options);
  const auditPath = process.env.BASELINE_PATTERNS_COMMAND_LOG;
  if (auditPath)
    appendFileSync(
      auditPath,
      JSON.stringify({
        command,
        args,
        status: result.status,
        signal: result.signal,
        error: result.error?.message,
        stdout: result.stdout,
        stderr: result.stderr,
      }) + "\n",
    );
  return result;
}

const lessons = [
  ...recordsLessons,
  ...variantsLessons,
  ...nestedPatternLessons,
  ...traitsLessons,
];
// Ordinary CI uses its selected compiler; local/MSRV runs request explicit toolchains.
const toolchains = process.env.BASELINE_RUST_TOOLCHAINS?.split(",") ?? [
  "default",
];
for (const toolchain of toolchains) {
  for (const fixture of baselinePatternFixtures) {
    it(`${toolchain}: actual ${fixture.step} evaluator accepts equivalent code and rejects compiling mutants`, () => {
      const step = lessons
        .find((lesson) => lesson.id === fixture.lesson)
        ?.steps.find((step) => step.id === fixture.step);
      expect(step, "appended checked exercise must exist").toBeDefined();
      if (step?.evaluator?.kind !== "tests" || !step.solution)
        throw new Error("Missing authored tests/solution");
      const evaluator = step.evaluator;
      if (step.code && step.expectedStatus === "compile-error") {
        const directory = mkdtempSync(
          join(tmpdir(), "baseline-patterns-starter-"),
        );
        try {
          const file = join(directory, "starter.rs");
          writeFileSync(file, step.code);
          const compiled = command(
            toolchain === "default" ? "rustc" : "rustup",
            [
              ...(toolchain === "default" ? [] : ["run", toolchain, "rustc"]),
              "--edition=2024",
              "--crate-type=lib",
              file,
              "-o",
              join(directory, "starter.rlib"),
            ],
            { encoding: "utf8", timeout: 60_000 },
          );
          expect(compiled.error).toBeUndefined();
          expect(compiled.status, compiled.stderr).toBe(1);
          expect(compiled.stderr).toContain(`error[${step.expectedError}]`);
        } finally {
          rmSync(directory, { recursive: true, force: true });
        }
      }

      for (const [name, source, passes] of [
        ["canonical", step.solution, true],
        ["equivalent", fixture.alternate, true],
        ...fixture.mutants.map(
          (source, index) => [`mutant-${index}`, source, false] as const,
        ),
      ] as const) {
        const directory = mkdtempSync(join(tmpdir(), "baseline-patterns-"));
        try {
          const file = join(directory, "candidate.rs");
          const binary = join(directory, "candidate");
          writeFileSync(file, appendHiddenTests(source, evaluator.tests));
          const compiled = command(
            toolchain === "default" ? "rustc" : "rustup",
            [
              ...(toolchain === "default" ? [] : ["run", toolchain, "rustc"]),
              "--edition=2024",
              "--test",
              file,
              "-o",
              binary,
            ],
            { encoding: "utf8", timeout: 60_000 },
          );
          expect(
            compiled.error,
            `${name}/compile infrastructure`,
          ).toBeUndefined();
          expect(compiled.status, compiled.stderr).toBe(0);
          const executed = command(binary, ["--test-threads=1"], {
            encoding: "utf8",
            timeout: 8_000,
          });
          expect(
            executed.error,
            `${name}/execute infrastructure`,
          ).toBeUndefined();
          const report = executed.stdout.match(
            /test result: (ok|FAILED)\. (\d+) passed; (\d+) failed; (\d+) ignored; (\d+) measured; (\d+) filtered out;/,
          );
          expect(report, executed.stdout + executed.stderr).not.toBeNull();
          if (!report) throw new Error("Missing Rust test summary");
          expect(Number(report[2]) + Number(report[3])).toBeGreaterThan(0);
          expect(report.slice(4).map(Number)).toEqual([0, 0, 0]);
          const result = evaluate(evaluator, {
            code: source,
            result: {
              status: executed.status === 0 ? "success" : "test-failure",
              stdout: executed.stdout,
              stderr: executed.stderr,
              diagnostics: [],
              durationMs: 0,
              tests: { passed: Number(report[2]), failed: Number(report[3]) },
            },
          });
          expect(result.passed, `${name}: ${executed.stdout}`).toBe(passes);
          expect(executed.status, executed.stdout + executed.stderr).toBe(
            passes ? 0 : 101,
          );
          if (!passes)
            expect(executed.stdout + executed.stderr).toMatch(
              /assertion .*failed/,
            );
        } finally {
          rmSync(directory, { recursive: true, force: true });
        }
      }
    }, 90_000);
  }
}
