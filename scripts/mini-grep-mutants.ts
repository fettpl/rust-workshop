/** Negative controls for the fixed, repository-authored Mini grep archive. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Control = {
  name: string;
  path: string;
  before: string;
  after: string;
  args: string[];
  rejectedBy: RegExp;
};

/**
 * Runs fixed source mutations against a materialized, trusted reference.
 * Every control must compile, execute exactly one named test, and fail through
 * that test's expected assertion; a compiler error, signal, timeout, or zero
 * tests never counts as rejection.
 */
export function verifyMiniGrepMutants(
  root: string,
  env: NodeJS.ProcessEnv = process.env,
): void {
  assert.notEqual(
    process.platform,
    "win32",
    "The symlink negative control requires a Unix test target",
  );

  const paths = {
    search: join(root, "src/search.rs"),
    input: join(root, "src/input.rs"),
    traversal: join(root, "src/paths.rs"),
    main: join(root, "src/main.rs"),
  };
  const originals = Object.fromEntries(
    Object.entries(paths).map(([name, path]) => [
      name,
      readFileSync(path, "utf8"),
    ]),
  ) as Record<keyof typeof paths, string>;

  function replace(source: string, before: string, after: string): string {
    assert.equal(
      source.split(before).length,
      2,
      `Mutation target must appear exactly once: ${before}`,
    );
    return source.replace(before, after);
  }

  function run(args: string[]) {
    const result = spawnSync("cargo", [...args, "--offline", "--locked"], {
      cwd: root,
      env,
      encoding: "utf8",
      timeout: 60_000,
      maxBuffer: 3 * 1024 * 1024,
    });
    assert.ifError(result.error);
    assert.notEqual(
      result.status,
      null,
      "A signal or watchdog is not a rejected mutant",
    );
    return { status: result.status, output: result.stdout + result.stderr };
  }

  const controls: Control[] = [
    {
      name: "context selection without its union window",
      path: "search",
      before:
        "for selected in &mut included[start..=end] {\n            *selected = true;\n        }",
      after: "included[index] = true;",
      args: [
        "test",
        "--test",
        "search_contract",
        "selection_unites_overlapping_context_windows",
      ],
      rejectedBy: /assertion `left == right` failed/,
    },
    {
      name: "raw-line reader accepts one byte beyond its limit",
      path: "input",
      before: "let remaining = MAX_RAW_LINE_BYTES - raw.len();",
      after:
        "let remaining = MAX_RAW_LINE_BYTES.saturating_sub(raw.len()).saturating_add(1);",
      args: [
        "test",
        "--test",
        "search_contract",
        "bounded_reader_rejects_binary_long_and_partial_io_with_its_source",
      ],
      rejectedBy: /assertion failed: matches!\(/,
    },
    {
      name: "symlink metadata changed to following metadata",
      path: "traversal",
      before: "let metadata = fs::symlink_metadata(path)",
      after: "let metadata = fs::metadata(path)",
      args: [
        "test",
        "--test",
        "path_contract",
        "symlinks_are_rejected_instead_of_followed",
      ],
      rejectedBy: /assertion failed: matches!\(/,
    },
    {
      name: "input error writes a partial stdout marker",
      path: "main",
      before:
        'Err(error) => {\n            eprintln!("mini-grep: {error}");\n            ExitCode::from(2)\n        }',
      after:
        'Err(error) => {\n            let _ = io::stdout().write_all(b"partial\\n");\n            eprintln!("mini-grep: {error}");\n            ExitCode::from(2)\n        }',
      args: [
        "test",
        "--test",
        "cli",
        "process_renders_context_and_uses_standard_outcomes",
      ],
      rejectedBy: /child stdout:\npartial/,
    },
  ];

  try {
    for (const control of controls) {
      const baseline = run(control.args);
      assert.equal(
        baseline.status,
        0,
        `Reference failed ${control.name}\n${baseline.output}`,
      );
      assert.match(
        baseline.output,
        /test result: ok\. 1 passed/,
        `Reference did not execute one test for ${control.name}\n${baseline.output}`,
      );

      const path = paths[control.path as keyof typeof paths];
      writeFileSync(
        path,
        replace(
          originals[control.path as keyof typeof paths],
          control.before,
          control.after,
        ),
      );
      const result = run(control.args);
      assert.notEqual(result.status, 0, `Mutant survived: ${control.name}`);
      assert.match(
        result.output,
        /test result: FAILED\. 0 passed; 1 failed/,
        `Mutant did not run the intended test\n${control.name}\n${result.output}`,
      );
      assert.match(
        result.output,
        control.rejectedBy,
        `${control.name}\n${result.output}`,
      );
      console.log(`ok rejected mutant: ${control.name}`);
      writeFileSync(path, originals[control.path as keyof typeof paths]);
    }
  } finally {
    for (const [name, path] of Object.entries(paths))
      writeFileSync(path, originals[name as keyof typeof paths]);
  }
}
