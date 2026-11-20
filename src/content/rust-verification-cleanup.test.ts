import { afterEach, describe, expect, it, vi } from "vitest";
import { existsSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { verifyTrustedRust } from "../../scripts/verify-rust";

vi.mock("node:child_process", () => ({ spawnSync: vi.fn() }));
const spawn = vi.mocked(spawnSync);
const emptyCourse = {
  lessons: [],
  reviewExercises: {},
  delayedReviewExercises: {},
  traces: {},
};

const processResult = (stdout = "", status: number | null = 0) => ({
  pid: 1,
  output: [null, stdout, ""],
  stdout,
  stderr: "",
  status,
  signal: null,
});

function cwdString(cwd: string | URL | undefined): string {
  return typeof cwd === "string" ? cwd : "";
}

function compileResult(
  args: readonly string[] | undefined,
  cwd: string | URL | undefined,
) {
  const outputIndex = args?.indexOf("-o") ?? -1;
  const binary = outputIndex >= 0 ? args?.[outputIndex + 1] : undefined;
  if (binary) writeFileSync(binary, `compiled in ${cwd}\n`);
  return processResult();
}

afterEach(() => {
  vi.restoreAllMocks();
  spawn.mockReset();
});

describe("authored Rust verifier case cleanup", () => {
  it("removes each completed case before the next compiler invocation", () => {
    const caseDirectories: string[] = [];
    let executions = 0;
    spawn.mockImplementation((program, args, options) => {
      if (program === "rustc") {
        if (caseDirectories.length > 0)
          expect(existsSync(caseDirectories.at(-1)!)).toBe(false);
        caseDirectories.push(cwdString(options?.cwd));
        return compileResult(args, options?.cwd) as never;
      }
      executions++;
      return (
        executions === 1
          ? processResult("test result: FAILED. 0 passed; 1 failed;", 101)
          : processResult("test result: ok. 1 passed; 0 failed;")
      ) as never;
    });

    const results = verifyTrustedRust(emptyCourse);

    expect(results.every((result) => result.passed)).toBe(true);
    expect(caseDirectories).toHaveLength(2);
    expect(caseDirectories.every((directory) => !existsSync(directory))).toBe(
      true,
    );
  });

  it.each([
    ["compiler failure", "compile"],
    ["execution failure", "execute"],
    ["reporter throw", "reporter"],
  ] as const)(
    "cleans the owned case directory after a %s",
    (_label, failure) => {
      const caseDirectories: string[] = [];
      let executions = 0;
      spawn.mockImplementation((program, args, options) => {
        if (program === "rustc") {
          caseDirectories.push(cwdString(options?.cwd));
          if (failure === "compile") return processResult("", 1) as never;
          return compileResult(args, options?.cwd) as never;
        }
        executions++;
        if (failure === "execute") return processResult("", 1) as never;
        return (
          executions === 1
            ? processResult("test result: FAILED. 0 passed; 1 failed;", 101)
            : processResult("test result: ok. 1 passed; 0 failed;")
        ) as never;
      });

      if (failure === "reporter")
        expect(() =>
          verifyTrustedRust(emptyCourse, () => {
            throw new Error("reporter failed");
          }),
        ).toThrow("reporter failed");
      else verifyTrustedRust(emptyCourse);

      expect(caseDirectories.length).toBeGreaterThan(0);
      expect(caseDirectories.every((directory) => !existsSync(directory))).toBe(
        true,
      );
    },
  );
});
