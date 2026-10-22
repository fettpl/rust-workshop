import {
  accessSync,
  constants,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { expect } from "vitest";

// Opt-in durable native evidence is used by milestone verification. Normal CI
// keeps the existing disposable fixture behavior. Every path is resolved from
// the subprocess cwd, and nonordinary termination always fails assertions.
// Bare-command provenance is bounded to stable POSIX filesystems: resolve an
// executable first, then invoke that exact path so recorded argv[0] is real.
const configuredEvidenceRoot = process.env.M11_NATIVE_EVIDENCE_DIR;
const evidenceRoot = configuredEvidenceRoot
  ? resolve(configuredEvidenceRoot)
  : undefined;
if (evidenceRoot) mkdirSync(evidenceRoot, { recursive: true });
const hash = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
const isRunnableFile = (path: string) => {
  try {
    return (
      statSync(path).isFile() && accessSync(path, constants.X_OK) === undefined
    );
  } catch {
    return false;
  }
};
export function nativeDirectory(prefix: string) {
  return mkdtempSync(join(evidenceRoot ?? tmpdir(), prefix));
}
export function nativeRun(
  command: string,
  args: string[],
  cwd: string,
  timeout: number,
) {
  const startedAt = new Date().toISOString();
  const requestedArgv = [command, ...args];
  const executablePath = command.includes("/")
    ? (() => {
        const candidate = resolve(cwd, command);
        return isRunnableFile(candidate) ? candidate : undefined;
      })()
    : (process.env.PATH === undefined
        ? ["/usr/bin", "/bin"]
        : process.env.PATH.split(":")
      )
        .map((entry) => resolve(cwd, entry || ".", command))
        .find(isRunnableFile);
  const actualCommand = executablePath ?? command;
  const nativeTempRoot = join(cwd, ".native-tmp");
  mkdirSync(nativeTempRoot, { recursive: true });
  const result = spawnSync(actualCommand, args, {
    cwd,
    encoding: "utf8",
    timeout,
    env: {
      ...process.env,
      TMPDIR: nativeTempRoot,
      TMP: nativeTempRoot,
      TEMP: nativeTempRoot,
    },
  });
  if (evidenceRoot) {
    const recordDirectory = mkdtempSync(join(cwd, "command-"));
    const sourceHashes = Object.fromEntries(
      [
        ...args,
        ...(executablePath ? [executablePath, executablePath + ".rs"] : []),
      ].flatMap((argument) => {
        const path = resolve(cwd, argument);
        return existsSync(path) && statSync(path).isFile()
          ? [[path, hash(readFileSync(path))]]
          : [];
      }),
    );
    const stdout = result.stdout ?? "";
    const stderr = result.stderr ?? "";
    writeFileSync(join(recordDirectory, "stdout.txt"), stdout);
    writeFileSync(join(recordDirectory, "stderr.txt"), stderr);
    // argv is the exact vector sent to spawnSync; requestedArgv keeps the
    // caller's bare command for auditing the controlled lookup boundary.
    writeFileSync(
      join(recordDirectory, "command.json"),
      JSON.stringify(
        {
          argv: [actualCommand, ...args],
          requestedArgv: requestedArgv,
          cwd,
          startedAt,
          finishedAt: new Date().toISOString(),
          PATH: process.env.PATH,
          executablePath,
          status: result.status,
          signal: result.signal,
          error: result.error?.message,
          sourceHashes,
          stdoutSha256: hash(stdout),
          stderrSha256: hash(stderr),
          executableResolution: executablePath ? "selected" : "unresolved",
        },
        null,
        2,
      ) + "\n",
    );
    if (
      !command.includes("/") &&
      !executablePath &&
      !result.error &&
      result.signal === null &&
      result.status === 0
    )
      throw new Error(
        `Bare command ${command} succeeded without a resolved executable`,
      );
  }
  return result;
}
export function exactResult(
  result: ReturnType<typeof nativeRun>,
  name: string,
  passed: boolean,
) {
  expect(result.error).toBeUndefined();
  expect(result.signal).toBeNull();
  expect(result.status, result.stdout + result.stderr).toBe(passed ? 0 : 101);
  expect(result.stdout).toContain("running 1 test\n");
  const testLines = result.stdout
    .split("\n")
    .filter(
      (line) => line.startsWith("test ") && !line.startsWith("test result:"),
    );
  expect(testLines).toEqual([`test ${name} ... ${passed ? "ok" : "FAILED"}`]);
  expect(result.stdout).toContain(
    passed ? "1 passed; 0 failed" : "0 passed; 1 failed",
  );
  if (!passed)
    expect(result.stdout + result.stderr).toMatch(/assertion|panicked at/);
}
export function discardDirectory(directory: string) {
  if (!evidenceRoot) rmSync(directory, { recursive: true, force: true });
}
