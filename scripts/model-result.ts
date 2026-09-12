export type ModelExpectation =
  | { passed: number }
  | { invariant: "PUBLICATION_INVARIANT" | "LOST_UPDATE_INVARIANT" };

/** An infrastructure failure is never evidence of a model counterexample. */
export function verifyModelResult(
  result: {
    status: number | null;
    error?: unknown;
    stdout: string;
    stderr: string;
  },
  expectation: ModelExpectation,
): boolean {
  if (result.error) return false;
  if ("passed" in expectation) {
    const count = [
      ...result.stdout.matchAll(/test result: ok\. (\d+) passed/g),
    ].reduce((sum, match) => sum + Number(match[1]), 0);
    return result.status === 0 && count >= expectation.passed;
  }
  const output = result.stdout + result.stderr;
  return (
    result.status === 101 &&
    /test result: FAILED\. \d+ passed; [1-9]\d* failed/.test(output) &&
    new RegExp(
      `assertion [^\\n]*failed: ${expectation.invariant}(?:\\n|$)`,
    ).test(output)
  );
}
