import { describe, expect, it } from "vitest";
import {
  authoredCargoError,
  cargoExecutable,
  testCounts,
  behavioralRejection,
} from "../../scripts/cargo-observation";

const failed = { status: 101, stdout: "", stderr: "", signal: null };
const diagnostic = (code: string, path: string) =>
  JSON.stringify({
    reason: "compiler-message",
    message: {
      level: "error",
      code: { code },
      spans: [{ file_name: path, is_primary: true }],
    },
  });

describe("trusted Cargo outcome evidence", () => {
  it("matches a code-less Rust error by its authored span and actual diagnostic message", () => {
    const codeLess = JSON.stringify({
      reason: "compiler-message",
      message: {
        level: "error",
        code: null,
        message: "future cannot be sent between threads safely",
        spans: [{ file_name: "src/lib.rs", is_primary: true }],
      },
    });
    expect(
      authoredCargoError(
        { ...failed, stdout: codeLess },
        "src/lib.rs",
        "any",
        "future cannot be sent between threads safely",
      ),
    ).toBe(true);
    expect(
      authoredCargoError(
        { ...failed, stdout: codeLess },
        "src/lib.rs",
        "E0277",
      ),
    ).toBe(false);
    expect(
      authoredCargoError(
        { ...failed, stdout: codeLess },
        "src/lib.rs",
        "any",
        "borrowed value does not live long enough",
      ),
    ).toBe(false);
  });
  it("requires the expected error on the authored source, not dependency resolution failure", () => {
    expect(
      authoredCargoError(
        { ...failed, stdout: diagnostic("E0373", "src/lib.rs") },
        "src/lib.rs",
        "E0373",
      ),
    ).toBe(true);
    expect(
      authoredCargoError(
        { ...failed, stdout: diagnostic("E0277", "src/lib.rs") },
        "src/lib.rs",
        "E0373",
      ),
    ).toBe(false);
    expect(
      authoredCargoError(
        {
          ...failed,
          stdout: diagnostic("E0373", "/registry/tokio/src/lib.rs"),
        },
        "src/lib.rs",
        "E0373",
      ),
    ).toBe(false);
    expect(
      authoredCargoError(
        { ...failed, stderr: "failed to download tokio" },
        "src/lib.rs",
        "any",
      ),
    ).toBe(false);
    expect(
      authoredCargoError(
        {
          ...failed,
          error: new Error("timeout"),
          stdout: diagnostic("E0373", "src/lib.rs"),
        },
        "src/lib.rs",
        "E0373",
      ),
    ).toBe(false);
  });
  it("takes only an emitted executable for the selected Cargo target", () => {
    const line = (name: string, executable: string | null) =>
      JSON.stringify({
        reason: "compiler-artifact",
        target: { name },
        executable,
      });
    const output = [
      line("tokio", null),
      line("helper", "/wrong"),
      line("authored_fixture", "/tmp/fixture/target/debug/authored_fixture"),
    ].join("\n");
    expect(cargoExecutable(output, "authored_fixture")).toBe(
      "/tmp/fixture/target/debug/authored_fixture",
    );
    expect(cargoExecutable(output, "missing")).toBeUndefined();
  });
  it("rejects compilation failures, timeouts and zero tests as mutant evidence", () => {
    const output = "test result: FAILED. 2 passed; 1 failed; 0 ignored;";
    expect(behavioralRejection({ ...failed, stdout: output })).toBe(true);
    expect(behavioralRejection(failed)).toBe(false);
    expect(
      behavioralRejection({ ...failed, stdout: output, signal: "SIGTERM" }),
    ).toBe(false);
    expect(
      behavioralRejection({
        ...failed,
        stdout: output,
        error: new Error("timeout"),
      }),
    ).toBe(false);
    expect(
      behavioralRejection({
        ...failed,
        stdout: "test result: ok. 0 passed; 0 failed;",
      }),
    ).toBe(false);
    expect(behavioralRejection({ ...failed, status: 0, stdout: output })).toBe(
      false,
    );
    expect(
      testCounts("test result: ok. 9 passed; 0 failed;\n" + output),
    ).toEqual({ passed: 2, failed: 1 });
  });
});
