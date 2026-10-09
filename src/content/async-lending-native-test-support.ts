import {
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
const evidenceRoot = process.env.M11_NATIVE_EVIDENCE_DIR;
if (evidenceRoot) mkdirSync(evidenceRoot, { recursive: true });
const hash = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
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
  const result = spawnSync(command, args, { cwd, encoding: "utf8", timeout });
  if (evidenceRoot) {
    const recordDirectory = mkdtempSync(join(cwd, "command-"));
    const executablePath = command.includes("/")
      ? resolve(cwd, command)
      : process.env.PATH?.split(":")
          .map((path) => join(path, command))
          .find((path) => existsSync(path));
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
    writeFileSync(
      join(recordDirectory, "command.json"),
      JSON.stringify(
        {
          argv: [command, ...args],
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
        },
        null,
        2,
      ) + "\n",
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
