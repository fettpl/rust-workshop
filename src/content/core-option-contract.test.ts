/** Fixed repository-authored Option fixtures, evaluated by the actual lesson tests. */
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { appendHiddenTests } from "../runner";
import { evaluate } from "../engine/evaluate";
import { variantsLessons } from "./modeling-variants";

const lesson = variantsLessons.find(
  (item) => item.id === "option-and-absence",
)!;
const step = lesson.steps.find((item) => item.id === "option-match")!;
const fixtures = [
  { name: "authored-solution", source: step.solution!, passes: true },
  {
    name: "map-alternate",
    source:
      "fn add_bonus(value: Option<i32>) -> Option<i32> { value.map(|x| x + 1) }\nfn main() {}",
    passes: true,
  },
  {
    name: "negative-clamp",
    source:
      "fn add_bonus(value: Option<i32>) -> Option<i32> { value.map(|x| x.max(0) + 1) }\nfn main() {}",
    passes: false,
  },
  {
    name: "invented-zero-for-none",
    source:
      "fn add_bonus(value: Option<i32>) -> Option<i32> { match value { Some(x) => Some(x + 1), None => Some(0) } }\nfn main() {}",
    passes: false,
  },
  {
    name: "unchanged-negative-one",
    source:
      "fn add_bonus(value: Option<i32>) -> Option<i32> { value.map(|x| if x == -1 { -1 } else { x + 1 }) }\nfn main() {}",
    passes: false,
  },
];
function completed(result: SpawnSyncReturns<string>, stage: string) {
  if (result.error || result.signal || result.status === null)
    throw new Error(
      `${stage}: infrastructure failure: ${result.error?.message ?? result.signal ?? "missing status"}`,
    );
}

it.each(fixtures)(
  "Option evaluator checks $name",
  ({ name, source, passes }) => {
    if (step.evaluator?.kind !== "tests")
      throw new Error("Missing actual Option evaluator.tests");
    const directory = mkdtempSync(join(tmpdir(), "core-option-authored-"));
    try {
      const file = join(directory, "candidate.rs");
      const binary = join(directory, "candidate");
      writeFileSync(file, appendHiddenTests(source, step.evaluator.tests));
      const compiled = spawnSync(
        "rustc",
        ["--edition=2024", "--test", file, "-o", binary],
        {
          cwd: directory,
          encoding: "utf8",
          timeout: 60_000,
          maxBuffer: 1024 * 1024,
        },
      );
      completed(compiled, `${name}/compile`);
      expect(compiled.status, compiled.stderr).toBe(0);
      const executed = spawnSync(binary, ["--test-threads=1"], {
        cwd: directory,
        encoding: "utf8",
        timeout: 8_000,
        maxBuffer: 1024 * 1024,
      });
      completed(executed, `${name}/execute`);
      const report = executed.stdout.match(
        /test result: (ok|FAILED)\. (\d+) passed; (\d+) failed; (\d+) ignored; (\d+) measured; (\d+) filtered out;/,
      );
      if (
        !report ||
        Number(report[2]) + Number(report[3]) === 0 ||
        report.slice(4).some((value) => Number(value) !== 0)
      )
        throw new Error(`${name}: malformed/missing Rust test report`);
      const actual = evaluate(step.evaluator, {
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
      expect(actual.passed, executed.stdout + executed.stderr).toBe(passes);
      expect(executed.status, executed.stdout + executed.stderr).toBe(
        passes ? 0 : 101,
      );
      expect(report[1]).toBe(passes ? "ok" : "FAILED");
      expect(Number(report[3])).toBe(passes ? 0 : 1);
      if (!passes)
        expect(executed.stdout + executed.stderr).toMatch(/assertion .*failed/);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  },
  75_000,
);
