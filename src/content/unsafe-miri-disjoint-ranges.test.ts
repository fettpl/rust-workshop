import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";
import { appendHiddenTests } from "../runner";
import {
  disjointRangesEquivalent,
  disjointRangesFamily,
  disjointRangesMutantTargets,
  disjointRangesMutants,
  disjointRangesModel,
  disjointRangesPrimaryStepId,
  disjointRangesSolution,
  disjointRangesStarter,
  disjointRangesSteps,
  disjointRangesTests,
  disjointRangesThird,
} from "./unsafe-miri-disjoint-ranges";

const testNames = [
  "exhaustive_endpoint_matrix_2274",
  "empty_ranges_are_valid_at_boundaries_and_interior",
  "valid_regions_preserve_lengths_identity_order_and_mutation_visibility",
  "adjacent_gapped_and_full_ranges_are_valid",
  "errors_have_ordered_precedence_and_never_mutate",
  "repeated_calls_support_arbitrary_bytes_and_temporary_views",
  "extreme_usize_max_endpoints_are_rejected_without_overflow",
] as const;

const rustc = process.env.RUSTC_FOR_DISJOINT_TESTS ?? "rustc";

type RustRun = ReturnType<typeof spawnSync> & {
  stdout: string;
  stderr: string;
};

const compile = (
  source: string,
  directory: string,
  test = true,
  extraArgs: string[] = [],
): RustRun => {
  const file = join(directory, "fixture.rs");
  const binary = join(directory, "fixture");
  writeFileSync(file, source);
  return spawnSync(
    rustc,
    [
      "--edition=2024",
      ...(test ? ["--test"] : []),
      ...extraArgs,
      file,
      "-o",
      binary,
    ],
    { cwd: directory, encoding: "utf8", timeout: 60_000 },
  ) as RustRun;
};

const run = (directory: string, args: string[]): RustRun =>
  spawnSync(join(directory, "fixture"), args, {
    cwd: directory,
    encoding: "utf8",
    timeout: 10_000,
  }) as RustRun;

const outputOf = (result: RustRun) => `${result.stdout}\n${result.stderr}`;

const compileAndRunFull = (source: string) => {
  const directory = mkdtempSync(join(tmpdir(), "unsafe-miri-disjoint-ranges-"));
  try {
    const compiled = compile(
      appendHiddenTests(source, disjointRangesTests),
      directory,
    );
    expect(compiled.error).toBeUndefined();
    expect(compiled.status, compiled.stderr).toBe(0);
    const executed = run(directory, ["--test-threads=1"]);
    const output = outputOf(executed);
    expect(executed.error).toBeUndefined();
    expect(executed.signal).toBeNull();
    expect(executed.status, output).toBe(0);
    expect(output).toContain(`running ${testNames.length} tests`);
    for (const name of testNames) {
      expect(output).toContain(
        `test __rust_workshop_hidden_tests::${name} ... ok`,
      );
    }
    expect(output).toMatch(
      new RegExp(`test result: ok\\. ${testNames.length} passed; 0 failed`),
    );
    expect(output).not.toMatch(/error:|signal|timed out/i);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
};

const compileAndRunModel = () => {
  const directory = mkdtempSync(join(tmpdir(), "unsafe-miri-disjoint-model-"));
  try {
    const compiled = compile(disjointRangesModel, directory, false);
    expect(compiled.error).toBeUndefined();
    expect(compiled.status, compiled.stderr).toBe(0);
    const executed = run(directory, []);
    expect(executed.error).toBeUndefined();
    expect(executed.signal).toBeNull();
    expect(executed.status, outputOf(executed)).toBe(0);
    expect(executed.stdout).toBe(
      "kolejno: 0..2, następnie 2..4: [10, 20] [30, 40]\n" +
        "kolejność argumentów: pierwszy 4..6, drugi 1..3: [50, 60] [20, 30]\n" +
        "półotwarty zakres 0..2 zawiera indeksy 0 i 1, bez końca 2\n" +
        "puste 2..2 wewnątrz 0..4: poprawne, bo nie zawiera elementu\n" +
        "nakładające się 0..3 i 2..4: błąd Overlap\n",
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
};

it("publishes the model and exactly two ordered range steps", () => {
  expect(disjointRangesSteps.map((step) => step.id)).toEqual([
    "disjoint-regions-range-model",
    disjointRangesPrimaryStepId,
  ]);
  expect(disjointRangesSteps[0]).toMatchObject({
    evidenceKind: "exposure",
    evidenceGate: false,
  });
  expect(disjointRangesSteps[0].evidence?.codingTaskId).toBeUndefined();
  expect(disjointRangesSteps[1]).toMatchObject({
    kind: "apply",
    code: disjointRangesStarter,
    evidenceKind: "transfer",
    evidenceGate: true,
  });
  expect(disjointRangesSteps[1].evidence?.version).toBe(2);
  expect(disjointRangesSteps[1].evidence?.conceptIds).toEqual([
    "unsafe-miri-disjoint-regions-contract",
  ]);
  expect(disjointRangesSteps[1].evidence?.codingTaskId).toBe(
    disjointRangesFamily,
  );
  expect(disjointRangesModel).toContain("0..2");
  expect(disjointRangesModel).toContain("2..4");
  expect(disjointRangesModel).toContain("4..6");
  expect(disjointRangesModel).toContain("1..3");
  expect(disjointRangesModel).toContain("półotwarty");
  expect(disjointRangesModel).toContain("puste 2..2 wewnątrz 0..4");
  expect(disjointRangesModel).toContain("Overlap");
  expect(disjointRangesModel).not.toContain("fn select_regions");
  compileAndRunModel();
});

it("states the public API and complete behavior without source spelling requirements", () => {
  const prompt = disjointRangesSteps[1].prompt;
  expect(prompt).toMatch(/Range<usize>/);
  expect(prompt).toMatch(/pub enum RangeError/);
  expect(prompt).toMatch(/pub fn select_regions/);
  expect(prompt).toMatch(/FirstInvalid/);
  expect(prompt).toMatch(/SecondInvalid/);
  expect(prompt).toMatch(/Overlap/);
  expect(prompt).toMatch(/half|półotwart/i);
  expect(prompt).toMatch(/pust/i);
  expect(prompt).toMatch(/kolejności argumentów/i);
  expect(prompt).toMatch(/unsafe|source spelling|konkretnej strategii/i);
  expect(disjointRangesSolution).toMatch(/#!\[forbid\(unsafe_code\)\]/);
  expect(disjointRangesSolution).toMatch(/pub enum RangeError/);
  expect(disjointRangesSolution).toMatch(/pub fn select_regions/);
  expect(disjointRangesStarter).not.toBe(disjointRangesSolution);
  expect(disjointRangesStarter).toContain("pub fn select_regions");
  expect(disjointRangesStarter).not.toContain("unsafe { ");
});

it("accepts three independent safe mechanisms through the complete matrix", () => {
  compileAndRunFull(disjointRangesSolution);
  compileAndRunFull(disjointRangesEquivalent);
  compileAndRunFull(disjointRangesThird);
});

it.each(Object.entries(disjointRangesMutants))(
  "compiles and rejects the named semantic mutant %s in exactly one test",
  (name, source) => {
    expect(source).not.toBe(disjointRangesSolution);
    const directory = mkdtempSync(
      join(tmpdir(), "unsafe-miri-disjoint-mutant-"),
    );
    try {
      const compiled = compile(
        appendHiddenTests(source, disjointRangesTests),
        directory,
      );
      expect(compiled.error).toBeUndefined();
      expect(compiled.status, compiled.stderr).toBe(0);
      const target =
        disjointRangesMutantTargets[name as keyof typeof disjointRangesMutants];
      expect(target).toBeTruthy();
      const executed = run(directory, ["--exact", target, "--test-threads=1"]);
      const output = outputOf(executed);
      expect(executed.error).toBeUndefined();
      expect(executed.signal).toBeNull();
      expect(executed.status, output).toBe(101);
      expect(output).toContain("running 1 test");
      expect(output).toContain(`test ${target} ... FAILED`);
      expect(output).toMatch(/0 passed; 1 failed/);
      expect(output).toMatch(
        /assertion failed|assertion `|left:|right:|must be accepted/i,
      );
      expect(output).not.toMatch(/timed out|signal|running 0 tests/i);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  },
);

it("rejects an owner-escaping view with exactly E0597 and accepts its scoped twin", () => {
  const escaping = `${disjointRangesSolution}
fn escaped_view() {
    let view;
    {
        let mut data = [1_u8, 2, 3, 4];
        view = select_regions(&mut data, 0..1, 2..3).unwrap().0;
    }
    drop(view);
}
fn main() { escaped_view(); }
`;
  const directory = mkdtempSync(join(tmpdir(), "unsafe-miri-disjoint-owner-"));
  try {
    const compiled = compile(escaping, directory, false, [
      "--error-format=json",
    ]);
    expect(compiled.status).not.toBe(0);
    expect(compiled.signal).toBeNull();
    const diagnostics = compiled.stderr
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line) as {
            code?: { code?: string };
            spans?: Array<{ is_primary?: boolean; line_start?: number }>;
          };
        } catch {
          return undefined;
        }
      })
      .filter(
        (
          diagnostic,
        ): diagnostic is {
          code?: { code?: string };
          spans?: Array<{ is_primary?: boolean; line_start?: number }>;
        } => Boolean(diagnostic),
      );
    const e0597 = diagnostics.filter(
      (diagnostic) => diagnostic.code?.code === "E0597",
    );
    expect(e0597).toHaveLength(1);
    expect(
      e0597[0].spans?.some((span) => span.is_primary && span.line_start),
    ).toBe(true);

    const scoped = `${disjointRangesSolution}
fn main() {
    let mut data = [1_u8, 2, 3, 4];
    {
        let (first, second) = select_regions(&mut data, 0..1, 2..3).unwrap();
        assert_eq!(first, &[1]);
        assert_eq!(second, &[3]);
    }
    let (first, second) = select_regions(&mut data, 1..2, 3..4).unwrap();
    first[0] = 9;
    second[0] = 8;
    drop((first, second));
    assert_eq!(data, [1, 9, 3, 8]);
}
`;
    const scopedCompile = compile(scoped, directory, false);
    expect(scopedCompile.error).toBeUndefined();
    expect(scopedCompile.status, scopedCompile.stderr).toBe(0);
    const scopedRun = run(directory, []);
    expect(scopedRun.error).toBeUndefined();
    expect(scopedRun.signal).toBeNull();
    expect(scopedRun.status, outputOf(scopedRun)).toBe(0);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

it("keeps the original buffer reusable after temporary views are dropped", () => {
  const source = `${disjointRangesSolution}
fn main() {
    let mut data = [7_u8, 8, 9, 10];
    {
        let (first, second) = select_regions(&mut data, 0..1, 2..3).unwrap();
        first[0] = 70;
        second[0] = 90;
    }
    data[1] = 80;
    assert_eq!(data, [70, 80, 90, 10]);
}
`;
  const directory = mkdtempSync(join(tmpdir(), "unsafe-miri-disjoint-reuse-"));
  try {
    const compiled = compile(source, directory, false);
    expect(compiled.error).toBeUndefined();
    expect(compiled.status, compiled.stderr).toBe(0);
    const executed = run(directory, []);
    expect(executed.error).toBeUndefined();
    expect(executed.signal).toBeNull();
    expect(executed.status, outputOf(executed)).toBe(0);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

it("keeps the exhaustive hidden harness independent of the learner predicate", () => {
  expect(disjointRangesTests).toContain("assert_eq!(cases, 2274)");
  expect(disjointRangesTests).toContain("wrapping_add");
  expect(disjointRangesTests).not.toContain("unsafe {");
});
