import assert from "node:assert/strict";
import { strFromU8, unzipSync } from "fflate";
import { getStaticTOMLValue, parseTOML } from "toml-eslint-parser";
import { describe, expect, it } from "vitest";
import { buildProjectArchive } from "../../../../scripts/project-archive";
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

  describe.each(["starter", "solution"] as const)("%s ZIP", (variant) => {
    it.each([undefined, "pl", "en"] as const)(
      "ships a fixed rustix version for locale %s",
      (locale) => {
        const entries = unzipSync(
          buildProjectArchive(propertyContractsPackage, variant, { locale }),
        );
        const lock = strFromU8(
          entries[`${propertyContractsPackage.id}/Cargo.lock`],
        );
        const packages = getStaticTOMLValue(parseTOML(lock)).package;
        assert(Array.isArray(packages));
        const rustixVersions = packages.flatMap((entry) => {
          if (
            entry === null ||
            typeof entry !== "object" ||
            !("name" in entry) ||
            entry.name !== "rustix"
          )
            return [];
          assert("version" in entry && typeof entry.version === "string");
          return [entry.version];
        });
        expect(rustixVersions.length).toBeGreaterThan(0);
        for (const version of rustixVersions) {
          expect(version).toMatch(/^\d+\.\d+\.\d+$/);
          const [major, minor, patch] = version.split(".").map(Number);
          const patched =
            major > 1 ||
            (major === 1 && (minor > 1 || (minor === 1 && patch >= 6)));
          expect(
            patched,
            `rustix ${version} is below the RUSTSEC-2026-0486 fix floor`,
          ).toBe(true);
        }
      },
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
