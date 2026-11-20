import { afterEach, describe, expect, it, vi } from "vitest";
import { spawnSync } from "node:child_process";
import {
  formatVerificationFailure,
  verifyTrustedRust,
} from "../../scripts/verify-rust";
import type { Verification } from "../../scripts/verify-rust";

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

afterEach(() => {
  vi.restoreAllMocks();
  spawn.mockReset();
});

describe("authored Rust verifier progress", () => {
  it("reports completed results in order without changing the returned results", () => {
    let execution = 0;
    spawn.mockImplementation((program) => {
      if (program === "rustc") return processResult() as never;
      return (
        ++execution === 1
          ? processResult("test result: FAILED. 0 passed; 1 failed;", 101)
          : processResult("test result: ok. 1 passed; 0 failed;")
      ) as never;
    });
    const reported: { id: string; passed: boolean; detail: string }[] = [];
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    const results = verifyTrustedRust(emptyCourse, (result) => {
      reported.push(result);
    });

    expect(reported).toEqual(results);
    expect(reported.map((result) => result.id)).toEqual([
      "runner/assertion-shadowing",
      "diagnostic/double",
    ]);
    expect(log).not.toHaveBeenCalled();
  });

  it("formats a bounded single-line failure reason without source or temp paths", () => {
    const result: Verification = {
      id: "lesson/step/solution",
      passed: false,
      detail:
        'kompilacja: error[E0308]: mismatched types\n --> /private/tmp/rust-workshop-authored-abc/example_1.rs:1:1\n  |\n1 | fn answer() -> i32 { "untrusted source" }\n  |^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^',
    };

    const line = formatVerificationFailure(result);

    expect(line).toContain("FAIL lesson/step/solution: ");
    expect(line).toContain("kompilacja: error[E0308]: mismatched types");
    expect(line).not.toContain("untrusted source");
    expect(line).not.toContain("/private/tmp");
    expect(line).not.toContain("\n");
    expect(line.length).toBeLessThanOrEqual(220);
  });
});
