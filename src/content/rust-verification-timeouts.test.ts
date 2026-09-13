import { afterEach, describe, expect, it, vi } from "vitest";
import { spawnSync } from "node:child_process";
import { verifyTrustedRust } from "../../scripts/verify-rust";
import { lessons } from "./course";

vi.mock("node:child_process", () => ({ spawnSync: vi.fn() }));
const spawn = vi.mocked(spawnSync);
const emptyCourse = { lessons: [], reviewExercises: {}, traces: {} };
const processResult = (stdout = "", status: number | null = 0) => ({
  pid: 1,
  output: [null, stdout, ""],
  stdout,
  stderr: "",
  status,
  signal: null,
});
const timedOut = () => ({
  ...processResult("", null),
  signal: "SIGTERM" as const,
  error: Object.assign(new Error("spawnSync rustc ETIMEDOUT"), {
    code: "ETIMEDOUT",
  }),
});
afterEach(() => vi.resetAllMocks());

describe("authoring verifier process deadlines", () => {
  it("allows a slow compiler without extending the executable watchdog", () => {
    let execution = 0;
    spawn.mockImplementation((program, _args, options) => {
      // Simulate a cold compiler needing 9s; no wall-clock wait or process is used.
      if (program === "rustc")
        return (
          Number(options?.timeout) < 9_000 ? timedOut() : processResult()
        ) as never;
      if (options?.timeout !== 8_000) return timedOut() as never;
      return (
        ++execution === 1
          ? processResult("test result: FAILED. 0 passed; 1 failed;", 101)
          : processResult("test result: ok. 1 passed; 0 failed;")
      ) as never;
    });
    expect(
      verifyTrustedRust(emptyCourse).every((result) => result.passed),
    ).toBe(true);
    for (const [program, , options] of spawn.mock.calls)
      expect(options?.timeout).toBe(program === "rustc" ? 60_000 : 8_000);
  });

  it("does not treat compiler timeout as rejection of the wrong implementation", () => {
    spawn.mockImplementation(() => timedOut() as never);
    const results = verifyTrustedRust(emptyCourse);
    expect(results.every((result) => !result.passed)).toBe(true);
    expect(results[0].detail).toContain("ETIMEDOUT");
  });

  it("rejects a killed executable even when its partial stdout contains a test report", () => {
    spawn.mockImplementation(
      (program) =>
        (program === "rustc"
          ? processResult()
          : {
              ...timedOut(),
              stdout: "test result: FAILED. 0 passed; 1 failed;",
            }) as never,
    );
    expect(
      verifyTrustedRust(emptyCourse).every((result) => !result.passed),
    ).toBe(true);
  });

  it.each(["compile", "execute"] as const)(
    "does not credit starter rejection after a %s timeout",
    (phase) => {
      const lesson = {
        ...lessons[0],
        id: "timeout-fixture",
        steps: [
          {
            id: "answer",
            kind: "modify" as const,
            title: "Answer",
            prompt: "Return one.",
            code: "fn answer() -> i32 { 0 }",
            solution: "fn answer() -> i32 { 1 }",
            evidenceKind: "transfer" as const,
            evaluator: {
              kind: "tests" as const,
              tests: "#[test] fn checks_answer() { assert_eq!(answer(), 1); }",
            },
          },
        ],
      };
      spawn.mockImplementation(
        (program) =>
          (program === "rustc" && phase === "execute"
            ? processResult()
            : {
                ...timedOut(),
                stdout: "test result: FAILED. 0 passed; 1 failed;",
              }) as never,
      );
      const results = verifyTrustedRust({ ...emptyCourse, lessons: [lesson] });
      expect(
        results.find(
          (result) => result.id === "timeout-fixture/answer/starter-rejected",
        ),
      ).toMatchObject({ passed: false });
    },
  );
});
