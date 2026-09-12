import { expect, it } from "vitest";
import { verifyModelResult } from "../../scripts/model-result";

it("requires the expected number of executed tests, not just exit zero", () => {
  expect(
    verifyModelResult(
      { status: 0, stdout: "test result: ok. 2 passed; 0 failed", stderr: "" },
      { passed: 2 },
    ),
  ).toBe(true);
  expect(
    verifyModelResult(
      { status: 0, stdout: "test result: ok. 0 passed; 0 failed", stderr: "" },
      { passed: 2 },
    ),
  ).toBe(false);
});
it("accepts only a real invariant assertion failure as a counterexample", () => {
  const result = {
    status: 101,
    stdout: "test result: FAILED. 0 passed; 1 failed",
    stderr: "assertion `left == right` failed: PUBLICATION_INVARIANT",
  };
  expect(
    verifyModelResult(result, { invariant: "PUBLICATION_INVARIANT" }),
  ).toBe(true);
  expect(
    verifyModelResult(
      { ...result, status: null, error: "timeout" },
      { invariant: "PUBLICATION_INVARIANT" },
    ),
  ).toBe(false);
  expect(
    verifyModelResult(
      {
        ...result,
        stderr: "model exceeded maximum branches: PUBLICATION_INVARIANT",
      },
      { invariant: "PUBLICATION_INVARIANT" },
    ),
  ).toBe(false);
  expect(
    verifyModelResult(
      {
        status: 101,
        stdout: "",
        stderr: "compile error at PUBLICATION_INVARIANT",
      },
      { invariant: "PUBLICATION_INVARIANT" },
    ),
  ).toBe(false);
});
