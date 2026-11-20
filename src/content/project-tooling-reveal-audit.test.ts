import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  projectFiles,
  revealProjectPackageVariant,
} from "../domain/project-package";
import { createInitialState, stepKey } from "../persistence/state";
import { lessons } from "./course";
import { frameProtocolPackage } from "./projects/frame-protocol";
import { miniGrepPackage } from "./projects/mini-grep";
import { propertyContractsPackage } from "./projects/property-contracts";
import { ffiBufferPackage } from "./projects/ffi-buffer";
import { miriSafetyPackage } from "./projects/miri-safety";

function step(lessonId: string, stepId: string) {
  return lessons
    .find((lesson) => lesson.id === lessonId)!
    .steps.find((entry) => entry.id === stepId)!;
}

function runAuthoredSafeContract(source: string, filter?: string) {
  const directory = mkdtempSync(join(tmpdir(), "archive-tooling-audit-"));
  try {
    const file = join(directory, "contract.rs");
    const binary = join(directory, "contract");
    writeFileSync(file, source);
    const compiled = spawnSync(
      "rustc",
      ["--edition=2024", "--test", file, "-o", binary],
      {
        cwd: directory,
        encoding: "utf8",
        timeout: 60_000,
      },
    );
    expect(compiled.error).toBeUndefined();
    expect(compiled.status, compiled.stderr).toBe(0);
    const executed = spawnSync(binary, filter ? [filter] : [], {
      cwd: directory,
      encoding: "utf8",
      timeout: 10_000,
    });
    expect(executed.error).toBeUndefined();
    expect(executed.status, executed.stdout + executed.stderr).toBe(0);
    expect(executed.stdout).toMatch(
      /test result: ok\. [1-9]\d* passed; 0 failed;/,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe("authored archive exposure follows the delivered behavior", () => {
  it("keeps Frame's completed API/manifests separate from unanswered maintenance work", () => {
    expect(
      frameProtocolPackage.revealStepRefs.map((ref) => ref.lessonId),
    ).toEqual([
      "api-validated-construction",
      "api-error-source-chain",
      "api-trait-compatibility",
      "api-compatible-surface",
    ]);
    for (const variant of ["starter", "solution"] as const) {
      const files = projectFiles(frameProtocolPackage, variant);
      expect(files["Cargo.toml"]).toContain('resolver = "3"');
      expect(files["crates/frame-protocol/Cargo.toml"]).toContain(
        'format = ["dep:serde", "serde/alloc", "serde/derive"]',
      );
      expect(files["MAINTENANCE-CHALLENGE.md"]).toContain(
        "Uzupełnij ten plik własnymi obserwacjami",
      );
      expect(files["CHANGE-REVIEW.md"]).toContain("nieuzupełniony formularz");
    }
  });

  it("records the Mini grep starter's complete decoder and output comparisons", () => {
    const starter = projectFiles(miniGrepPackage, "starter");
    const decoder = step("fuzz-input-domain", "fuzz-input-domain-gate");
    if (decoder.evaluator?.kind !== "tests")
      throw new Error("Expected decoder tests");
    runAuthoredSafeContract(
      `${starter["fuzz/support/case.rs"]}\nuse decode as decode_case;\n${decoder.evaluator.tests}`,
    );
    expect(starter["fuzz/support/check.rs"]).toContain(
      "if values(selected) != expected",
    );
    expect(starter["fuzz/support/check.rs"]).toContain(
      "if values(scanned.map_err(|_| FailureKind::ReaderMismatch)?) != expected",
    );
    const state = revealProjectPackageVariant(
      createInitialState(),
      miniGrepPackage,
      lessons,
      "starter",
      1,
    );
    for (const lessonId of ["fuzz-input-domain", "fuzz-oracle-sensitivity"]) {
      expect(state.steps[stepKey(lessonId, `${lessonId}-gate`)]?.revealed).toBe(
        true,
      );
    }
    expect(
      state.steps[stepKey("grep-bounded-input", "grep-bounded-input-gate")]
        ?.revealed,
    ).toBeFalsy();
  });

  it("does not treat seeds and dossier documentation as reducer or classifier implementations", () => {
    for (const variant of ["starter", "solution"] as const) {
      const files = projectFiles(miniGrepPackage, variant);
      expect(files["FUZZ-EVIDENCE.md"]).toContain(
        "Replay and campaign are separate",
      );
      expect(files["tests/fuzz_regressions.rs"]).toContain(
        "substring_prefix_witness",
      );
      const rust = Object.entries(files)
        .filter(([path]) => path.endsWith(".rs"))
        .map(([, source]) => source)
        .join("\n");
      expect(rust).not.toMatch(/fn (choose_witness|classify_report)\b/);
      const state = revealProjectPackageVariant(
        createInitialState(),
        miniGrepPackage,
        lessons,
        variant,
        1,
      );
      for (const lessonId of [
        "fuzz-counterexample-regression",
        "fuzz-campaign-evidence",
      ]) {
        expect(
          state.steps[stepKey(lessonId, `${lessonId}-gate`)]?.revealed,
        ).toBeFalsy();
      }
    }
  });

  it("keeps custom shrinking and guarded metamorphic validators independent of Proptest workflow examples", () => {
    const files = projectFiles(propertyContractsPackage, "solution");
    expect(files["tests/property_contracts.rs"]).toContain(
      "max_shrink_iters: 64",
    );
    expect(files["tests/property_contracts.rs"]).toContain(
      "fn replay_saved_regression()",
    );
    expect(files["tests/property_contracts.rs"]).toContain(
      "appending_a_nonmatching_suffix_preserves_context_zero",
    );
    expect(files["tests/property_contracts.rs"]).not.toMatch(
      /fn (shrink_failure|append_nonmatching_preserves)\b/,
    );
    const state = revealProjectPackageVariant(
      createInitialState(),
      propertyContractsPackage,
      lessons,
      "solution",
      1,
    );
    for (const lessonId of [
      "property-shrinking-replay",
      "property-metamorphic-transfer",
    ]) {
      expect(
        state.steps[stepKey(lessonId, `${lessonId}-gate`)]?.revealed,
      ).toBeFalsy();
    }
  });

  it("maps the C buffer owner and checked view without claiming split or record validation", () => {
    const files = projectFiles(ffiBufferPackage, "solution");
    expect(files["src/lib.rs"]).toContain("impl Drop for Buffer");
    expect(files["src/lib.rs"]).toContain(
      "std::slice::from_raw_parts(ptr, len)",
    );
    expect(files["src/lib.rs"]).not.toMatch(
      /split_at_mut|InvalidFlags|RawRecord/,
    );
    expect(ffiBufferPackage.revealStepRefs.map((ref) => ref.stepId)).toEqual([
      "checked-view-contract-gate",
      "owned-handle-borrow-gate",
    ]);
  });

  it("records reborrow already supplied in the Miri starter's callback exercise", () => {
    const starter = projectFiles(miriSafetyPackage, "starter");
    const primary = step("unsafe-miri-mut-slot", "mut-slot-gate");
    if (primary.evaluator?.kind !== "tests")
      throw new Error("Expected reborrow tests");
    const tests = primary.evaluator.tests.replace(
      /fn (reborrow_shortens_access_and_preserves_the_outer_slot|generic_mut_slot_can_hold_a_borrowed_value_without_static)/g,
      "fn archive_audit_$1",
    );
    runAuthoredSafeContract(
      `${starter["tests/mut_slot_with_mut.rs"]}\n${tests}`,
      "archive_audit_",
    );
    const state = revealProjectPackageVariant(
      createInitialState(),
      miriSafetyPackage,
      lessons,
      "starter",
      1,
    );
    expect(
      state.steps[stepKey("unsafe-miri-mut-slot", "mut-slot-gate")]?.revealed,
    ).toBe(true);
    expect(
      state.steps[stepKey("unsafe-miri-mut-slot", "mut-slot-with-mut-transfer")]
        ?.revealed,
    ).toBeFalsy();
  });

  it("does not equate from_slice with raw-pointer or initialized-prefix constructors", () => {
    for (const variant of ["starter", "solution"] as const) {
      const library = projectFiles(miriSafetyPackage, variant)["src/lib.rs"];
      expect(library).toContain("pub fn from_slice(bytes: &'a [u8]) -> Self");
      expect(library).not.toMatch(/fn from_raw_parts|MaybeUninit<u8>/);
      const state = revealProjectPackageVariant(
        createInitialState(),
        miriSafetyPackage,
        lessons,
        variant,
        1,
      );
      expect(
        state.steps[stepKey("unsafe-miri-byte-view", "byte-view-gate")]
          ?.revealed,
      ).toBeFalsy();
      expect(
        state.steps[
          stepKey("unsafe-miri-byte-view", "byte-view-initialized-prefix")
        ]?.revealed,
      ).toBeFalsy();
    }
  });
});
