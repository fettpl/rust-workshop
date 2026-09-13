export type FuzzProcessResult = {
  status: number | null;
  signal: string | null;
  error?: Error;
  stdout: string;
  stderr: string;
};

export type FuzzExpectation =
  | { kind: "campaign"; minimumRuns: number }
  | { kind: "counterexample"; artifactWritten: boolean }
  | { kind: "replay" };

export function verifyFuzzResult(
  result: FuzzProcessResult,
  expectation: FuzzExpectation,
): boolean {
  if (result.error || result.signal) return false;
  const log = result.stdout + result.stderr;
  if (
    !/Loaded \d+ modules\s+\([1-9]\d* inline 8-bit counters\)/.test(log) ||
    !/Loaded \d+ PC tables \([1-9]\d* PCs\)/.test(log)
  )
    return false;
  if (expectation.kind === "counterexample")
    return (
      result.status === 77 &&
      expectation.artifactWritten &&
      log.includes(
        "assertion `left == right` failed: mini-grep selection oracle mismatch",
      ) &&
      log.includes("SUMMARY: libFuzzer: deadly signal") &&
      log.includes("Test unit written to ")
    );
  if (result.status !== 0) return false;
  if (expectation.kind === "replay") return /Executed .+ in \d+ ms/.test(log);
  const runs = Number(log.match(/^#(\d+)\s+DONE\s+cov: [1-9]\d*/m)?.[1] ?? 0);
  return (
    runs >= expectation.minimumRuns && log.includes(`Done ${runs} runs in `)
  );
}
