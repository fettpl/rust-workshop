import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import { expect, it } from "vitest";
import { appendHiddenTests } from "../runner";
import { evaluate } from "../engine/evaluate";
import { fileSchemaEvolutionAssessmentFixtures as fixtures } from "./file-schema-evolution-assessment-fixtures";

const sha256 = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
const receipts = process.env.RUST_WORKSHOP_FILE_SCHEMA_ASSESSMENT_OUTPUT_DIR;

function runAuthored(
  label: string,
  source: string,
  tests: string,
  name: string,
  expectedAssertion?: string,
) {
  const directory = mkdtempSync(join(tmpdir(), "file-schema-browser-model-"));
  try {
    const input = join(directory, "case.rs");
    const binary = join(directory, "case");
    const complete = appendHiddenTests(source, tests);
    writeFileSync(input, complete);
    const assertionLine =
      expectedAssertion === undefined
        ? undefined
        : complete
            .split("\n")
            .findIndex((line) => line.includes(`"${expectedAssertion}"`)) + 1;
    const compiler = process.env.RUSTC_BIN ?? "rustc";
    const namedTest = `__rust_workshop_hidden_tests::${name}`;
    const compileArgs = ["--edition=2024", "--test", input, "-o", binary];
    const runArgs = ["--exact", namedTest, "--nocapture", "--test-threads=1"];
    const compileStart = new Date().toISOString();
    const compiled = spawnSync(compiler, compileArgs, {
      cwd: directory,
      encoding: "utf8",
      timeout: 60_000,
    });
    const compileEnd = new Date().toISOString();
    const runStart = new Date().toISOString();
    const executed =
      compiled.status === 0 && !compiled.error && !compiled.signal
        ? spawnSync(binary, runArgs, {
            cwd: directory,
            encoding: "utf8",
            timeout: 8_000,
          })
        : undefined;
    const runEnd = new Date().toISOString();
    if (receipts) {
      // The optional destination selects evidence storage only. Source and argv remain authored.
      mkdirSync(receipts, { recursive: true });
      const resolved = isAbsolute(compiler) ? realpathSync(compiler) : null;
      writeFileSync(
        join(receipts, `${label}.json`),
        JSON.stringify(
          {
            sourceSha256: sha256(source),
            testsSha256: sha256(tests),
            completeSha256: sha256(complete),
            compiler: resolved
              ? { path: resolved, sha256: sha256(readFileSync(resolved)) }
              : { command: compiler },
            namedTest,
            expectedAssertion: expectedAssertion ?? null,
            assertionLine: assertionLine ?? null,
            cwd: directory,
            compile: {
              argv: [compiler, ...compileArgs],
              timeoutMs: 60_000,
              started: compileStart,
              finished: compileEnd,
              ...compiled,
              error: compiled.error?.message ?? null,
            },
            execute: executed
              ? {
                  argv: [binary, ...runArgs],
                  timeoutMs: 8_000,
                  started: runStart,
                  finished: runEnd,
                  ...executed,
                  error: executed.error?.message ?? null,
                }
              : null,
          },
          null,
          2,
        ) + "\n",
        { flag: "wx" },
      );
    }
    expect(compiled.error, label).toBeUndefined();
    expect(compiled.signal, label).toBeNull();
    expect(compiled.status, compiled.stderr).toBe(0);
    expect(executed?.error, label).toBeUndefined();
    expect(executed?.signal, label).toBeNull();
    const { stdout, stderr, status } = executed!;
    const output = stdout + stderr;
    const counts = output.match(
      /test result: (?:ok|FAILED)\. (\d+) passed; (\d+) failed; (\d+) ignored;/,
    );
    expect(counts, output).not.toBeNull();
    expect(Number(counts![3]), output).toBe(0);
    expect(output, label).toContain(namedTest);
    const passed = Number(counts![1]);
    const failed = Number(counts![2]);
    const evaluation = evaluate(
      { kind: "tests", tests },
      {
        code: source,
        result: {
          status: status === 0 ? "success" : "test-failure",
          stdout,
          stderr,
          diagnostics: [],
          durationMs: 0,
          tests: { passed, failed },
        },
      },
    );
    return { output, status, passed, failed, evaluation, assertionLine };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

for (const [id, fixture] of Object.entries(fixtures)) {
  it(`${id}: real hidden child accepts three implementations and rejects the fixed controls`, () => {
    for (const [name, source] of [
      ["canonical", fixture.canonical],
      ["equivalent-a", fixture.equivalents[0]],
      ["equivalent-b", fixture.equivalents[1]],
    ] as const) {
      const result = runAuthored(
        `${id}-${name}`,
        source,
        fixture.tests,
        fixture.expectedTest,
      );
      expect(result.status, result.output).toBe(0);
      expect([result.passed, result.failed]).toEqual([1, 0]);
      expect(result.evaluation.passed).toBe(true);
    }
    const unfinished = runAuthored(
      `${id}-starter`,
      fixture.starter,
      fixture.tests,
      fixture.expectedTest,
    );
    expect(unfinished.status, unfinished.output).toBe(101);
    expect([unfinished.passed, unfinished.failed]).toEqual([0, 1]);
    expect(unfinished.output).toContain(
      "not yet implemented: implement normalization",
    );
    expect(unfinished.evaluation.passed).toBe(false);

    for (const mutant of fixture.semanticMutants) {
      const result = runAuthored(
        `${id}-${mutant.id}`,
        mutant.source,
        fixture.tests,
        fixture.expectedTest,
        mutant.expectedAssertion,
      );
      expect(result.status, result.output).toBe(101);
      expect([result.passed, result.failed]).toEqual([0, 1]);
      expect(result.assertionLine).toBeGreaterThan(0);
      expect(result.output).toContain(`case.rs:${result.assertionLine}:`);
      expect(result.output).toContain(
        `assertion \`left == right\` failed: ${mutant.expectedAssertion}`,
      );
      expect(result.evaluation.passed).toBe(false);
    }
  }, 60_000);
}
