/** Compile only maintained repository-authored fixtures; never learner code or imported saves. */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { foundationsLessons } from "./foundations";
import { lessons } from "./catalog";
import { baselinePrimitiveFixtures } from "./baseline-primitives-fixtures";
import { appendHiddenTests } from "../runner";

function compile(toolchain: string, code: string, tests?: string) {
  const dir = mkdtempSync(join(tmpdir(), "baseline-primitives-authored-"));
  try {
    const source = join(dir, "authored.rs");
    const executable = join(dir, "authored");
    writeFileSync(source, tests ? appendHiddenTests(code, tests) : code);
    const compiler = spawnSync(
      toolchain === "default" ? "rustc" : "rustup",
      [
        ...(toolchain === "default" ? [] : ["run", toolchain, "rustc"]),
        "--edition=2024",
        source,
        "--crate-name=baseline_primitives",
        ...(tests ? ["--test"] : []),
        "-o",
        executable,
      ],
      { encoding: "utf8", timeout: 60000 },
    );
    const execution =
      compiler.status === 0
        ? spawnSync(executable, [], { encoding: "utf8", timeout: 8000 })
        : undefined;
    return { compiler, execution };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// CI uses its selected compiler; an explicit local run covers installed stable and exact MSRV.
const toolchains = process.env.BASELINE_RUST_TOOLCHAINS?.split(",") ?? [
  "default",
];
for (const toolchain of toolchains) {
  describe(`authored baseline primitives on Rust ${toolchain}`, () => {
    for (const fixture of baselinePrimitiveFixtures) {
      it(`${fixture.stepId} accepts diverse implementations and rejects compiling behavioral errors`, () => {
        const step = [...foundationsLessons, ...lessons]
          .find((lesson) => lesson.id === fixture.lessonId)!
          .steps.find((step) => step.id === fixture.stepId)!;
        if (step.evaluator?.kind !== "tests")
          throw new Error("Missing callable tests");
        for (const code of [step.solution!, fixture.alternate]) {
          const run = compile(toolchain, code, step.evaluator.tests);
          expect(run.compiler.status, run.compiler.stderr).toBe(0);
          expect(run.execution?.status, run.execution?.stdout).toBe(0);
        }
        for (const [name, code] of Object.entries(fixture.mutants)) {
          const ordinary = compile(toolchain, code);
          expect(
            ordinary.compiler.status,
            `${name}: ${ordinary.compiler.stderr}`,
          ).toBe(0);
          const tested = compile(toolchain, code, step.evaluator.tests);
          expect(
            tested.compiler.status,
            `${name}: ${tested.compiler.stderr}`,
          ).toBe(0);
          expect(
            tested.execution?.status,
            `${name} escaped the callable contract`,
          ).not.toBe(0);
          expect(tested.execution?.stdout).toContain("FAILED");
        }
      }, 60000);
    }
    it("reports the intentional tuple starter error without missing helper imports", () => {
      const step = foundationsLessons
        .find((lesson) => lesson.id === "functions-expressions")!
        .steps.find((step) => step.id === "function-tuple-repair")!;
      const run = compile(toolchain, step.code!);
      expect(run.compiler.status).not.toBe(0);
      expect(run.compiler.stderr).toContain("E0308");
      expect(run.compiler.stderr).not.toContain("E0432");
    });
    it("proves the consuming boundary with a typed caller and rejects reuse after move", () => {
      const step = lessons
        .find((lesson) => lesson.id === "move-copy-discovery")!
        .steps.find((step) => step.id === "move-owned-transform")!;
      const moved = compile(
        toolchain,
        `${step.solution!}\nfn reuse() { let original = String::from("rust"); let returned = uppercase_owned(original); println!("{original} {returned}"); }`,
      );
      expect(moved.compiler.status).not.toBe(0);
      expect(moved.compiler.stderr).toContain("E0382");
      expect(moved.compiler.stderr).not.toContain("E0432");
      if (step.evaluator?.kind !== "tests")
        throw new Error("Missing callable tests");
      const borrowed = compile(
        toolchain,
        "fn uppercase_owned(text: &str) -> String { text.to_uppercase() } fn main() {}",
        step.evaluator.tests,
      );
      expect(borrowed.compiler.status).not.toBe(0);
      expect(borrowed.compiler.stderr).toContain("E0308");
      const copy = compile(
        toolchain,
        "fn double(n: i32) -> i32 { n * 2 } fn main() { let original = 7; let doubled = double(original); assert_eq!((original, doubled), (7, 14)); }",
      );
      expect(copy.compiler.status, copy.compiler.stderr).toBe(0);
      expect(copy.execution?.status).toBe(0);
    });
    it("checks authored numeric, return/unit, nested-scope and Copy predictions against raw stdout", () => {
      for (const [lessonId, stepId, expected] of [
        ["bindings-types", "numeric-discover", "-2 255 3 3.5 4 4\n"],
        [
          "functions-expressions",
          "function-return-unit-discover",
          "start\n0 true ()\n",
        ],
        ["memory-intro", "memory-owner-out-of-block", "chwila\nzostaje\n"],
        ["move-copy-discovery", "move-copy-return-predict", "7 14 RUST\n"],
        ["memory-intro", "memory-run", "3\n"],
        ["memory-intro", "memory-modify", "warm\n"],
        ["functions-and-ownership", "function-expression-run", "42\n"],
        ["number-guessing-transfer", "project-result-run", "correct\n"],
      ]) {
        const step = [...foundationsLessons, ...lessons]
          .find((lesson) => lesson.id === lessonId)!
          .steps.find((step) => step.id === stepId)!;
        const run = compile(toolchain, step.solution ?? step.code!);
        expect(run.compiler.status, `${stepId}: ${run.compiler.stderr}`).toBe(
          0,
        );
        expect(run.execution?.status, stepId).toBe(0);
        expect(run.execution?.stdout, stepId).toBe(expected);
      }
    }, 60000);
  });
}
