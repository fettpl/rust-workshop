import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import {
  assertFileSchemaArchiveSnapshot,
  assertFileSchemaNamedRejection,
  assertFileSchemaPrivateDiagnostic,
  assertFileSchemaPositive,
  claimFileSchemaRunRoot,
  fileSchemaCargoArgs,
  parseFileSchemaOptions,
  validateFileSchemaProfile,
} from "./verify-file-schema-evolution";
import {
  fileSchemaCompilerProbes,
  fileSchemaNativeTests,
} from "../src/content/projects/file-schema-evolution/fixtures";

it("accepts only one mode and one absolute owned output selector", () => {
  expect(parseFileSchemaOptions([])).toEqual({ mode: "stable" });
  expect(
    parseFileSchemaOptions(["--output-dir", "/owned/run-a", "--mode", "msrv"]),
  ).toEqual({ mode: "msrv", outputDir: "/owned/run-a" });
  for (const args of [
    ["--mode"],
    ["--mode", "nightly"],
    ["--mode", "stable", "--mode", "msrv"],
    ["--output-dir"],
    ["--output-dir", "relative"],
    ["--output-dir", "/owned/../run-a"],
    ["--output-dir", "/one", "--output-dir", "/two"],
    ["--source", "/other"],
    ["--", "--no-run"],
  ]) {
    expect(() => parseFileSchemaOptions(args)).toThrow();
  }
});

it("claims only fresh direct canonical run children and rejects symlink ancestors", () => {
  const root = realpathSync(
    mkdtempSync(join(tmpdir(), "file-schema-owned-root-")),
  );
  try {
    const base = join(root, "test-results/file-schema-evolution/stable");
    const run = join(base, "run-fixed");
    expect(
      claimFileSchemaRunRoot(root, { mode: "stable", outputDir: run }),
    ).toBe(run);
    for (const outputDir of [
      run,
      join(base, "existing/run-child"),
      join(root, "run-escape"),
      join(base, "unowned"),
    ]) {
      expect(() =>
        claimFileSchemaRunRoot(root, { mode: "stable", outputDir }),
      ).toThrow();
    }
    mkdirSync(join(root, "elsewhere"));
    symlinkSync(
      join(root, "elsewhere"),
      join(root, "test-results/file-schema-evolution/msrv"),
    );
    expect(() => claimFileSchemaRunRoot(root, { mode: "msrv" })).toThrow();
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

it("uses fixed offline locked recipe and exact mutant target without caller flags", () => {
  expect(fileSchemaCargoArgs("lock", "/owned/package", false)).toEqual([
    "generate-lockfile",
    "--offline",
    "--manifest-path",
    "/owned/package/Cargo.toml",
  ]);
  expect(fileSchemaCargoArgs("all", "/owned/package", true)).toEqual([
    "test",
    "--offline",
    "--locked",
    "--manifest-path",
    "/owned/package/Cargo.toml",
    "--release",
    "--no-fail-fast",
  ]);
  expect(
    fileSchemaCargoArgs(
      "compile-target",
      "/owned/package",
      false,
      "compatibility",
      "legacy_upgrade_preserves_literal_meaning",
    ),
  ).toEqual([
    "test",
    "--offline",
    "--locked",
    "--manifest-path",
    "/owned/package/Cargo.toml",
    "--test",
    "compatibility",
    "--no-run",
  ]);
  expect(
    fileSchemaCargoArgs(
      "named",
      "/owned/package",
      true,
      "upgrade",
      "stage_collision_preserves_both_files",
    ),
  ).toEqual([
    "test",
    "--offline",
    "--locked",
    "--manifest-path",
    "/owned/package/Cargo.toml",
    "--release",
    "--test",
    "upgrade",
    "stage_collision_preserves_both_files",
    "--",
    "--exact",
    "--nocapture",
  ]);
  expect(() =>
    fileSchemaCargoArgs(
      "named",
      "/owned/package",
      false,
      "upgrade",
      "--ignored",
    ),
  ).toThrow();
  expect(() => fileSchemaCargoArgs("all", "/owned/../escape", false)).toThrow();
});

const complete = {
  status: 0,
  signal: null,
  error: null,
  timedOut: false,
  closed: true,
  stdout: "",
  stderr: "",
};
const name = "legacy_upgrade_preserves_literal_meaning";
const site = {
  sourceFile: "tests/compatibility.rs",
  line: 41,
  column: 5,
  sourceLine: "assert_eq!(",
  sourceSha256: "fixture",
};
const named = {
  ...complete,
  status: 101,
  stdout: `test ${name} ... FAILED\ntest result: FAILED. 0 passed; 1 failed; 0 ignored; 0 measured; 4 filtered out;`,
  stderr: `thread '${name}' panicked at tests/compatibility.rs:41:5:\nassertion \`left == right\` failed\nleft: 1\nright: 2`,
};

it("accepts only a compiled exact named assertion at the archived source site", () => {
  expect(() =>
    assertFileSchemaNamedRejection(complete, named, name, site),
  ).not.toThrow();
  for (const bad of [
    { ...named, stdout: named.stdout.replace(name, "other") },
    { ...named, stderr: named.stderr.replace("41:5", "42:5") },
    {
      ...named,
      stderr: named.stderr.replace(
        "assertion `left == right` failed",
        "called Option::unwrap()",
      ),
    },
    { ...named, stderr: "error[E0308]: mismatched types" },
    { ...named, stdout: named.stdout.replace("0 ignored", "1 ignored") },
    { ...named, signal: "SIGTERM" },
    { ...named, timedOut: true },
    { ...named, closed: false },
    { ...named, error: { code: "EIO", message: "failed" } },
  ])
    expect(() =>
      assertFileSchemaNamedRejection(complete, bad, name, site),
    ).toThrow();
  expect(() =>
    assertFileSchemaNamedRejection(
      { ...complete, status: 101 },
      named,
      name,
      site,
    ),
  ).toThrow();
});

it("requires exact 14 successful native identities and zero ignored tests", () => {
  const stdout =
    fileSchemaNativeTests.map((id) => `test ${id} ... ok`).join("\n") +
    "\ntest result: ok. 14 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out;";
  expect(() => assertFileSchemaPositive({ ...complete, stdout })).not.toThrow();
  for (const bad of [
    stdout.replace("0 ignored", "1 ignored"),
    stdout.replace(name, "other"),
    stdout.replace("0 filtered", "1 filtered"),
    stdout.replace("test result: ok", "test result: FAILED"),
  ]) {
    expect(() =>
      assertFileSchemaPositive({ ...complete, stdout: bad }),
    ).toThrow();
  }
});

it("rejects missing, wrong-mode or incomplete toolchain bindings and incomplete archives", () => {
  expect(() => validateFileSchemaProfile("stable", {})).toThrow();
  expect(() =>
    validateFileSchemaProfile("msrv", { mode: "stable", toolchain: "stable" }),
  ).toThrow();
  expect(() => assertFileSchemaArchiveSnapshot({})).toThrow();
});

it("checks the stable and MSRV field span shapes with archived client text", () => {
  const probe = fileSchemaCompilerProbes.find(
    (item) => item.id === "todo-private-fields",
  )!;
  const sourcePath = "/owned/probe.rs";
  const lines = probe.forbiddenSource.split("\n");
  const span = (line: number, columnEnd: number) => ({
    is_primary: true,
    file_name: sourcePath,
    line_start: line,
    line_end: line,
    column_start: 9,
    column_end: columnEnd,
    text: [{ text: lines[line - 1] }],
  });
  const error = (...spans: ReturnType<typeof span>[]) => ({
    level: "error",
    code: { code: "E0451" },
    spans,
  });
  const summary = (count: 1 | 2) => ({
    level: "error",
    code: null,
    spans: [],
    message:
      count === 1
        ? "aborting due to 1 previous error"
        : "aborting due to 2 previous errors",
  });
  const stable = [error(span(5, 16), span(6, 16)), summary(1)];
  const msrv = [error(span(5, 28)), error(span(6, 35)), summary(2)];
  const check = (
    mode: "stable" | "msrv",
    data: object[],
    source: string = probe.forbiddenSource,
  ) =>
    assertFileSchemaPrivateDiagnostic(
      {
        ...complete,
        status: 1,
        stderr: data.map((item) => JSON.stringify(item)).join("\n"),
      },
      mode,
      probe,
      sourcePath,
      source,
    );
  expect(() => check("stable", stable)).not.toThrow();
  expect(() => check("msrv", msrv)).not.toThrow();
  expect(() => check("msrv", stable)).toThrow();
  expect(() => check("stable", msrv)).toThrow();
  expect(() => check("msrv", [error(span(5, 16)), msrv[1], msrv[2]])).toThrow();
  expect(() =>
    check("stable", [
      error(span(5, 16), { ...span(6, 16), file_name: "/other/probe.rs" }),
      summary(1),
    ]),
  ).toThrow();
  expect(() => check("stable", stable, probe.forbiddenSource + " ")).toThrow();
});
