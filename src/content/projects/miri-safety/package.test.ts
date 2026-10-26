import { describe, expect, it } from "vitest";
import { miriSafetyPackage, miriSafetyProject } from "../miri-safety";
import {
  mutSlotWithMutSolution,
  mutSlotWithMutStandaloneWitness,
  mutSlotWithMutStarter,
  mutSlotWithMutTests,
} from "../../unsafe-miri-mut-slot-with-mut";
import {
  projectFiles,
  validateProjectPackage,
} from "../../../domain/project-package";

describe("Miri safety authored package contract", () => {
  it("ships a std-only safe library and isolated UB fixtures", () => {
    expect(validateProjectPackage(miriSafetyPackage)).toEqual([]);
    expect(miriSafetyProject.id).toBe("miri-safety");
    expect(miriSafetyPackage.id).toBe("miri-safety-workshop");
    expect(miriSafetyPackage.revealStepRefs).toHaveLength(7);

    const solution = projectFiles(miriSafetyPackage, "solution");
    expect(Object.keys(solution)).toEqual(
      expect.arrayContaining([
        "Cargo.toml",
        "Cargo.lock",
        "fixtures/Cargo.lock",
        "README.md",
        "SAFETY.md",
        "src/lib.rs",
        "tests/safety_contract.rs",
        "tests/mutation_contract.rs",
        "tests/slot_lazy_init.rs",
        "tests/mut_slot_with_mut.rs",
        "fixtures/Cargo.toml",
        "fixtures/ub_out_of_bounds.rs",
        "fixtures/ub_use_after_free.rs",
        "fixtures/ub_aliasing.rs",
        "fixtures/ub_overlapping_regions.rs",
      ]),
    );
    expect(solution["Cargo.toml"]).toContain('edition = "2024"');
    expect(solution["Cargo.toml"]).toContain('rust-version = "1.85.0"');
    expect(solution["Cargo.toml"]).not.toContain("[dependencies]");
    expect(solution["fixtures/Cargo.lock"]).toContain("version = 4");
    expect(solution["fixtures/Cargo.lock"]).toContain(
      'name = "miri-ub-fixtures"',
    );
    expect(solution["src/lib.rs"]).toContain("#![forbid(unsafe_code)]");
    expect(solution["tests/safety_contract.rs"]).toContain(
      "byte_view_borrows_initialized_bytes_without_owning_them",
    );
    expect(solution["src/lib.rs"]).toContain("pub struct ByteView");
    expect(solution["src/lib.rs"]).toContain("pub struct Slot<T>");
    expect(solution["src/lib.rs"]).toContain("pub struct MutSlot");
    expect(solution["src/lib.rs"]).toContain("pub enum RangeError");
    expect(solution["src/lib.rs"]).toContain("pub fn select_regions");
    expect(solution["fixtures/ub_out_of_bounds.rs"]).toContain("unsafe");
    expect(solution["fixtures/ub_use_after_free.rs"]).toContain("from_raw");
    expect(solution["fixtures/ub_aliasing.rs"]).toContain("*raw");
    expect(solution["fixtures/ub_overlapping_regions.rs"]).toContain(
      "from_raw_parts_mut",
    );
    expect(solution["fixtures/ub_overlapping_regions.rs"]).toContain(
      "0..2, 1..3",
    );
    expect(solution["tests/slot_lazy_init.rs"]).toContain("MaybeUninit");
    expect(solution["tests/slot_lazy_init.rs"]).toContain(
      "full_suppresses_initializer_and_drops_captured_closure",
    );
    expect(solution["tests/mut_slot_with_mut.rs"]).toBe(
      `${mutSlotWithMutStandaloneWitness}${mutSlotWithMutSolution}${mutSlotWithMutTests}`,
    );
  });

  it("keeps the starter unfinished while retaining safety tests and fixtures", () => {
    const starter = projectFiles(miriSafetyPackage, "starter");
    expect(starter["src/lib.rs"]).toContain("todo!");
    expect(starter["tests/safety_contract.rs"]).toContain(
      "split_regions_are_disjoint",
    );
    expect(starter["tests/safety_contract.rs"]).toContain(
      "mut_slot_reborrow_releases_the_outer_slot",
    );
    expect(starter["fixtures/ub_out_of_bounds.rs"]).toContain("unsafe");
    expect(starter["src/lib.rs"]).toContain("select_regions");
    expect(starter["tests/slot_lazy_init.rs"]).toContain("todo!");
    expect(starter["tests/slot_lazy_init.rs"]).toContain(
      "full_suppresses_initializer_and_drops_captured_closure",
    );
    expect(starter["tests/mut_slot_with_mut.rs"]).toBe(
      `${mutSlotWithMutStandaloneWitness}${mutSlotWithMutStarter}${mutSlotWithMutTests}`,
    );
    expect(starter["tests/safety_contract.rs"]).toContain(
      "select_regions_accepts_empty_reversed_adjacent_and_gapped_ranges",
    );
  });
});
