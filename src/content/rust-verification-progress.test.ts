import { afterEach, describe, expect, it, vi } from "vitest";
import { spawnSync } from "node:child_process";
import { verifyTrustedRust } from "../../scripts/verify-rust";

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

afterEach(() => vi.resetAllMocks());

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
});
