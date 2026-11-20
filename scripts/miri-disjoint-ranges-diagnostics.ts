import { createHash } from "node:crypto";

export interface DisjointRangesMiriObservation {
  status: number | null;
  signal: NodeJS.Signals | null;
  error?: unknown;
  stdout?: string;
  stderr?: string;
}

/** The reviewed fixture source is renamed from the feasibility capture without changing its bytes. */
export const DISJOINT_RANGES_FIXTURE_SOURCE_SHA256 =
  "b35ad0105e25c6449f5340e9d024273af9f1842302c2272c031297e4cf481792";

const DISJOINT_RANGES_FIXTURE_BASENAME = "ub_overlapping_regions.rs";

function normalizeLineEndings(value: string) {
  return value.replaceAll("\r\n", "\n");
}

function sourceBasename(path: string) {
  return path.split(/[\\/]/).at(-1) ?? path;
}

function sourceHash(source: string) {
  return createHash("sha256").update(source).digest("hex");
}

function diagnosticError(message: string): never {
  throw new Error(`Miri overlap diagnostic rejected: ${message}`);
}

/**
 * Accept only the reviewed first-event shape for the authored overlap witness.
 * The fixture is trusted source and this classifier never accepts a learner path.
 */
export function assertDisjointRangesMiriObservation(
  observation: DisjointRangesMiriObservation,
  trustedFixtureSource?: string,
): void {
  if (observation.error !== undefined) {
    diagnosticError(
      `Miri overlap fixture failed to start: ${String(observation.error)}`,
    );
  }
  if (observation.signal !== null) {
    diagnosticError(
      `Miri overlap fixture terminated by signal ${String(observation.signal)}`,
    );
  }
  if (observation.status !== 1) {
    diagnosticError(
      `Miri overlap fixture returned ${String(observation.status)}, expected normal UB status 1`,
    );
  }
  if (trustedFixtureSource !== undefined) {
    if (
      sourceHash(trustedFixtureSource) !== DISJOINT_RANGES_FIXTURE_SOURCE_SHA256
    ) {
      diagnosticError(
        "trusted overlap fixture source hash does not match the reviewed fixture",
      );
    }
  }

  // Miri emits the semantic event on stderr. stdout is intentionally ignored.
  const stderr = normalizeLineEndings(observation.stderr ?? "");
  const ubHeaders = [...stderr.matchAll(/^error: Undefined Behavior:/gm)];
  if (ubHeaders.length !== 1) {
    diagnosticError(
      `expected exactly one primary Undefined Behavior event, got ${ubHeaders.length}`,
    );
  }

  const headerIndex = ubHeaders[0].index ?? -1;
  const beforeHeader = stderr.slice(0, headerIndex);
  if (/(?:^|\n)error(?:\[[^\]\r\n]+\])?:/m.test(beforeHeader)) {
    diagnosticError("an earlier semantic error precedes the primary UB event");
  }
  if (/(?:^|\n)(?:thread .* panicked|panicked at)/im.test(beforeHeader)) {
    diagnosticError("an earlier panic precedes the primary UB event");
  }

  const headerEnd = stderr.indexOf("\n", headerIndex);
  const header = stderr.slice(
    headerIndex,
    headerEnd === -1 ? stderr.length : headerEnd,
  );
  if (
    !/trying to retag\b.*\bUnique permission\b.*\b(?:borrow stack|borrow-stack)\b/i.test(
      header,
    )
  ) {
    diagnosticError(
      "primary header does not contain the reviewed Unique retag/borrow-stack category",
    );
  }

  const primaryBodyStart = headerEnd === -1 ? stderr.length : headerEnd + 1;
  const primaryBody = stderr.slice(primaryBodyStart);
  const notesIndex = primaryBody.search(/(?:^|\n)\s*(?:=\s*)?(?:help|note):/im);
  const beforeNotes = primaryBody.slice(
    0,
    notesIndex === -1 ? primaryBody.length : notesIndex,
  );
  const location = beforeNotes.match(/^\s*-->\s+(.+):(\d+):(\d+)\s*$/m);
  if (!location) {
    diagnosticError("primary source location is missing before help/notes");
  }
  const [, path, line, column] = location;
  if (
    sourceBasename(path) !== DISJOINT_RANGES_FIXTURE_BASENAME ||
    line !== "10" ||
    column !== "9"
  ) {
    diagnosticError(
      "primary source location does not match ub_overlapping_regions.rs:10:9",
    );
  }

  // The primary snippet must contain the authored tuple boundary. Later help,
  // allocation notes, and backtrace locations cannot establish this span.
  if (
    !/^\s*10\s*\|\s*\/\s*\(/m.test(beforeNotes) ||
    !/^\s*13\s*\|\s*\|\s*\)\s*$/m.test(beforeNotes)
  ) {
    diagnosticError(
      "primary source snippet does not cover the authored tuple span 10:9..13:10",
    );
  }
}
