import { expect, it } from "vitest";
import {
  verifyFuzzResult,
  type FuzzProcessResult,
} from "../../scripts/fuzz-result";

const instrumented =
  "INFO: Loaded 1 modules   (3774 inline 8-bit counters):\nINFO: Loaded 1 PC tables (3774 PCs):\n";
function result(stderr: string, status = 0): FuzzProcessResult {
  return { status, signal: null, stdout: "", stderr };
}

it("requires a completed instrumented campaign with actual executions", () => {
  const expectation = { kind: "campaign", minimumRuns: 1000 } as const;
  expect(
    verifyFuzzResult(
      result(
        instrumented +
          "#20000 DONE cov: 451 ft: 895\nDone 20000 runs in 1 second(s)",
      ),
      expectation,
    ),
  ).toBe(true);
  for (const log of [
    "Finished release profile",
    instrumented,
    instrumented + "#8 DONE cov: 100\nDone 8 runs in 0 second(s)",
    "#20000 DONE cov: 451\nDone 20000 runs in 1 second(s)",
  ])
    expect(verifyFuzzResult(result(log), expectation)).toBe(false);
  expect(
    verifyFuzzResult(
      {
        ...result(instrumented + "#20000 DONE cov: 451"),
        error: new Error("ETIMEDOUT"),
      },
      expectation,
    ),
  ).toBe(false);
});

it("accepts only the intended oracle assertion with a saved counterexample", () => {
  const failure = result(
    instrumented +
      "assertion `left == right` failed: mini-grep selection oracle mismatch\nSUMMARY: libFuzzer: deadly signal\nTest unit written to /tmp/crash-abc",
    77,
  );
  const expectation = {
    kind: "counterexample",
    artifactWritten: true,
  } as const;
  expect(verifyFuzzResult(failure, expectation)).toBe(true);
  expect(
    verifyFuzzResult(failure, { ...expectation, artifactWritten: false }),
  ).toBe(false);
  expect(verifyFuzzResult({ ...failure, status: 1 }, expectation)).toBe(false);
  expect(verifyFuzzResult({ ...failure, signal: "SIGABRT" }, expectation)).toBe(
    false,
  );
  expect(
    verifyFuzzResult(
      result(
        "mini-grep selection oracle mismatch\nerror: could not compile",
        77,
      ),
      expectation,
    ),
  ).toBe(false);
  expect(
    verifyFuzzResult(
      result(
        instrumented +
          "SUMMARY: libFuzzer: deadly signal\nTest unit written to /tmp/crash-abc",
        77,
      ),
      expectation,
    ),
  ).toBe(false);
  expect(
    verifyFuzzResult(
      result(
        instrumented +
          "mini-grep reader oracle mismatch\nSUMMARY: libFuzzer: deadly signal\nTest unit written to /tmp/crash-abc",
        77,
      ),
      expectation,
    ),
  ).toBe(false);
});

it("accepts a crashing replay without requiring a new artifact", () => {
  const replayFailure = result(
    instrumented +
      "Running: /tmp/crash-abc\n" +
      "assertion `left == right` failed: mini-grep selection oracle mismatch\n" +
      "SUMMARY: libFuzzer: deadly signal",
    77,
  );
  expect(
    verifyFuzzResult(replayFailure, { kind: "counterexample-replay" }),
  ).toBe(true);
  expect(
    verifyFuzzResult(
      { ...replayFailure, status: 0 },
      { kind: "counterexample-replay" },
    ),
  ).toBe(false);
  expect(
    verifyFuzzResult(
      result(
        instrumented +
          "Running: /tmp/crash-abc\n" +
          "SUMMARY: libFuzzer: deadly signal",
        77,
      ),
      { kind: "counterexample-replay" },
    ),
  ).toBe(false);
});

it("requires execution of the saved input after restoring the reference", () => {
  const expectation = { kind: "replay" } as const;
  expect(
    verifyFuzzResult(
      result(
        instrumented +
          "Running: /tmp/crash-abc\nExecuted /tmp/crash-abc in 1 ms",
      ),
      expectation,
    ),
  ).toBe(true);
  expect(
    verifyFuzzResult(
      result(instrumented + "Running: /tmp/crash-abc"),
      expectation,
    ),
  ).toBe(false);
  expect(
    verifyFuzzResult(
      result(instrumented + "Executed /tmp/crash-abc in 1 ms", 77),
      expectation,
    ),
  ).toBe(false);
});
