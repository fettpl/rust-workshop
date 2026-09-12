/** Pure classification of maintainer-only Cargo fixture output. No source execution. */
export interface CargoObservation {
  status: number | null;
  stdout: string;
  stderr: string;
  error?: Error;
  signal?: string | null;
}

function messages(output: string): unknown[] {
  return output.split("\n").flatMap((line) => {
    try {
      return [JSON.parse(line)];
    } catch {
      return [];
    }
  });
}

export function authoredCargoError(
  result: CargoObservation,
  file: string,
  code: string,
  diagnostic?: string,
): boolean {
  if (
    result.error ||
    result.signal ||
    result.status === null ||
    result.status === 0
  )
    return false;
  return messages(result.stdout).some((value) => {
    const item = value as {
      reason?: string;
      message?: {
        level?: string;
        message?: string;
        code?: { code?: string } | null;
        spans?: Array<{ file_name?: string; is_primary?: boolean }>;
      };
    } | null;
    const error = item?.message;
    return (
      item?.reason === "compiler-message" &&
      error?.level === "error" &&
      (code === "any" || error.code?.code === code) &&
      (!diagnostic ||
        (typeof error.message === "string" &&
          error.message.includes(diagnostic))) &&
      Array.isArray(error.spans) &&
      error.spans.some((span) => span?.is_primary && span.file_name === file)
    );
  });
}

export function cargoExecutable(
  output: string,
  target: string,
): string | undefined {
  for (const value of messages(output)) {
    const item = value as {
      reason?: string;
      target?: { name?: string };
      executable?: string | null;
    } | null;
    if (
      item?.reason === "compiler-artifact" &&
      item.target?.name === target &&
      typeof item.executable === "string"
    )
      return item.executable;
  }
}

export function testCounts(
  output: string,
): { passed: number; failed: number } | undefined {
  // One directly executed libtest binary (or cargo test --lib), not multiple Cargo/doc suites.
  const match = [
    ...output.matchAll(
      /test result: (?:ok|FAILED)\. (\d+) passed; (\d+) failed;/g,
    ),
  ].at(-1);
  return match
    ? { passed: Number(match[1]), failed: Number(match[2]) }
    : undefined;
}

export function behavioralRejection(result: CargoObservation): boolean {
  const counts = testCounts(result.stdout);
  return (
    !result.error &&
    !result.signal &&
    result.status !== null &&
    result.status !== 0 &&
    !!counts &&
    counts.failed > 0
  );
}
