import { expect, it } from "vitest";
import { assertDisjointRangesMiriObservation } from "./miri-disjoint-ranges-diagnostics";

const primaryHeader =
  "error: Undefined Behavior: trying to retag from <598> for Unique permission at alloc218[0x1], but that tag does not exist in the borrow stack for this location";

const realisticDiagnostic = (newline = "\n") =>
  [
    "   Compiling disjoint-regions-miri-preflight v0.0.0",
    "    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.02s",
    "     Running `cargo-miri runner target/debug/ub-overlapping-regions`",
    primaryHeader,
    "  --> src/bin/ub_overlapping_regions.rs:10:9",
    "   |",
    "10 | /         (",
    "11 | |             std::slice::from_raw_parts_mut(base.add(first.start), first.end - first.start),",
    "12 | |             std::slice::from_raw_parts_mut(base.add(second.start), second.end - second.start),",
    "13 | |         )",
    "   | |_________this error occurs as part of retag at alloc218[0x0..0x2]",
    "   |           while retagging field .0",
    "   |",
    "   = help: this indicates a potential bug in the program",
    "   = help: <598> was created by a Unique retag at offsets [0x0..0x2]",
    "  --> src/bin/ub_overlapping_regions.rs:11:13",
    "   = help: <598> was later invalidated at offsets [0x1..0x3] by a Unique retag",
    "  --> src/bin/ub_overlapping_regions.rs:12:13",
    "   = note: stack backtrace:",
    "           0: bad_select at src/bin/ub_overlapping_regions.rs:10:9: 13:10",
    "error: aborting due to 1 previous error",
  ].join(newline);

const good = (stderr: string, stdout = "") => ({
  status: 1,
  signal: null,
  stdout,
  stderr,
});

it.each(["\n", "\r\n"])(
  "accepts the captured first UB event with %j line endings",
  (newline) => {
    expect(() =>
      assertDisjointRangesMiriObservation(good(realisticDiagnostic(newline))),
    ).not.toThrow();
  },
);

it("rejects a primary header that borrows the category from help text", () => {
  const diagnostic = realisticDiagnostic().replace(
    primaryHeader,
    "error: Undefined Behavior: unrelated primary event",
  );
  expect(() => assertDisjointRangesMiriObservation(good(diagnostic))).toThrow(
    /primary header/i,
  );
});

it("rejects a primary location that borrows the expected source from a later note", () => {
  const diagnostic = realisticDiagnostic().replace(
    "src/bin/ub_overlapping_regions.rs:10:9",
    "src/bin/wrong.rs:2:3",
  );
  expect(() => assertDisjointRangesMiriObservation(good(diagnostic))).toThrow(
    /source location/i,
  );
});

it.each([
  [
    "an earlier compiler error",
    `error[E0499]: cannot borrow 'buffer' as mutable more than once\n${realisticDiagnostic()}`,
  ],
  [
    "an earlier panic",
    `thread 'main' panicked at 'setup failed'\n${realisticDiagnostic()}`,
  ],
  ["multiple primary UB events", `${realisticDiagnostic()}\n${primaryHeader}`],
  [
    "a source location only in help text",
    realisticDiagnostic().replace(
      "  --> src/bin/ub_overlapping_regions.rs:10:9",
      "  --> src/bin/wrong.rs:2:3",
    ),
  ],
  [
    "a category only in notes",
    realisticDiagnostic().replace(
      primaryHeader,
      "error: Undefined Behavior: unrelated primary event",
    ),
  ],
] as const)("rejects %s", (_name, stderr) => {
  expect(() => assertDisjointRangesMiriObservation(good(stderr))).toThrow();
});

it("does not use stdout as diagnostic evidence", () => {
  expect(() =>
    assertDisjointRangesMiriObservation({
      status: 1,
      signal: null,
      stdout: realisticDiagnostic(),
      stderr: "error: aborting due to 1 previous error",
    }),
  ).toThrow();
});

it("rejects a trusted fixture source with an unexpected hash", () => {
  expect(() =>
    assertDisjointRangesMiriObservation(
      good(realisticDiagnostic()),
      "fn main() {}\n",
    ),
  ).toThrow(/source hash/i);
});

it("rejects signals, spawn errors, timeouts and non-UB status", () => {
  for (const observation of [
    { status: 1, signal: "SIGTERM" as NodeJS.Signals, error: undefined },
    { status: null, signal: null, error: new Error("spawn") },
    {
      status: null,
      signal: null,
      error: Object.assign(new Error("timeout"), { code: "ETIMEDOUT" }),
    },
    { status: 0, signal: null, error: undefined },
  ]) {
    expect(() => assertDisjointRangesMiriObservation(observation)).toThrow();
  }
});

