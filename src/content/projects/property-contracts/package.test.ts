import { describe, expect, it } from "vitest";
import {
  projectFiles,
  validateProjectPackage,
} from "../../../domain/project-package";
import {
  propertyContractsPackage,
  propertyContractsProject,
} from "../property-contracts";

describe("Property contracts archive contract", () => {
  it("provides a real locked Proptest package", () => {
    expect(validateProjectPackage(propertyContractsPackage)).toEqual([]);
    expect(propertyContractsProject.id).toBe("property-contracts");
    expect(propertyContractsPackage.revealStepRefs).toHaveLength(2);

    const reference = projectFiles(propertyContractsPackage, "solution");
    expect(Object.keys(reference)).toEqual(
      expect.arrayContaining([
        "Cargo.toml",
        "Cargo.lock",
        "README.md",
        "src/lib.rs",
        "tests/property_contracts.rs",
        "proptest-regressions/property_contracts.txt",
        "mutants/ignore-malformed-filter.rs",
        "mutants/keep-whitespace-message.rs",
      ]),
    );
    expect(reference["Cargo.toml"]).toContain('proptest = "=1.11.0"');
    expect(reference["Cargo.toml"]).toContain('edition = "2024"');
    expect(reference["README.md"]).toContain(
      "cargo test replay_saved_regression --locked",
    );
  });

  it("keeps the starter unfinished with explicit property-workflow TODOs", () => {
    const starter = projectFiles(propertyContractsPackage, "starter");
    expect(starter["src/lib.rs"]).toContain("todo!");
    const tests = starter["tests/property_contracts.rs"];
    expect(tests).toContain("TODO(strategy)");
    expect(tests).toContain("TODO(property)");
    expect(tests).toContain("TODO(shrink)");
    expect(tests).toContain("TODO(replay)");
    expect(tests).toContain("TODO(metamorphic)");
    expect(tests).not.toContain("proptest!");
  });
});
