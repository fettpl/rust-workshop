import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import * as course from "./course";
import { readFileSync } from "node:fs";
import {
  dependencyFileSuccessor,
  historicalBeforeDependencyRefresh,
} from "./dependency-maintenance-compatibility-fixture";
import {
  historicalBeforeCurriculumRecovery,
  historicalBeforeA10ThenA9ThenA8ThenA7ThenExistingContractRepair as historicalBeforeExistingContractRepair,
} from "./file-schema-evolution-compatibility-fixture";

const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const selected = () =>
  course.lessons.find((lesson) => lesson.id === "tokio-runtime-entry")!;

describe("reviewed dependency maintenance predecessor", () => {
  it("restores exact historical metadata without mutating the current course or relabeling it", () => {
    const original = hash(course.lessons);
    const projected = historicalBeforeDependencyRefresh(
      historicalBeforeExistingContractRepair(course),
    );
    expect(
      projected.lessons.find((lesson) => lesson.id === "tokio-runtime-entry")!
        .steps[1].trustedFixtureTarget,
    ).toBe("cargo-tokio-runtime-1.53.1");
    expect(selected().steps[1].trustedFixtureTarget).toBe(
      "cargo-tokio-runtime-1.54.1",
    );
    expect(hash(course.lessons)).toBe(original);
    expect(
      historicalBeforeDependencyRefresh(
        historicalBeforeExistingContractRepair(projected),
      ),
    ).toEqual(projected);
  });
  it("keeps unexpected task source, identity and evidence drift visible to frozen digest comparisons", () => {
    const accepted = historicalBeforeDependencyRefresh(
      historicalBeforeExistingContractRepair(course),
    ).lessons.find((lesson) => lesson.id === "tokio-runtime-entry")!;
    for (const mutate of [
      (lesson: typeof accepted) => {
        lesson.steps[1].code += "\n// unexpected task edit";
      },
      (lesson: typeof accepted) => {
        lesson.steps[1].id += "-unexpected";
      },
      (lesson: typeof accepted) => {
        lesson.steps[1].evidenceGate = !lesson.steps[1].evidenceGate;
      },
      (lesson: typeof accepted) => {
        lesson.steps[1].trustedFixtureTarget = "rustc-2024";
      },
    ]) {
      const changed = structuredClone(selected());
      mutate(changed);
      const altered = {
        ...course,
        lessons: course.lessons.map((lesson) =>
          lesson.id === changed.id ? changed : lesson,
        ),
      };
      expect(hash(changed)).not.toBe(hash(accepted));
      const result = historicalBeforeDependencyRefresh(
        historicalBeforeExistingContractRepair(altered),
      ).lessons.find((lesson) => lesson.id === changed.id)!;
      expect(result).toBe(changed);
      expect(hash(result)).not.toBe(hash(accepted));
      expect(result.steps[1].trustedFixtureTarget).toBe(
        changed.steps[1].trustedFixtureTarget,
      );
    }
  });
  it("does not hide changed archive payloads or source citations in array and object registries", () => {
    const previous = historicalBeforeDependencyRefresh(
      historicalBeforeExistingContractRepair(course),
    );
    const project = structuredClone(
      historicalBeforeCurriculumRecovery(course).project,
    );
    project.package!.files[0].starter += "\n# unexpected manifest payload";
    const citation = structuredClone(
      course.sources.find((source) => source.id === "tokio-runtime-builder")!,
    );
    citation.url += "?unexpected=true";
    const altered = {
      ...course,
      project,
      projects: course.projects.map((item) =>
        item.id === project.id ? project : item,
      ),
      sources: course.sources.map((source) =>
        source.id === citation.id ? citation : source,
      ),
    };
    const result = historicalBeforeDependencyRefresh(
      historicalBeforeExistingContractRepair(altered),
    );
    expect(result.project).toBe(project);
    expect(result.projects.find((item) => item.id === project.id)).toBe(
      project,
    );
    expect(result.sources.find((source) => source.id === citation.id)).toBe(
      citation,
    );
    expect(hash(result.project)).not.toBe(hash(previous.project));
    expect(
      hash(result.sources.find((source) => source.id === citation.id)),
    ).not.toBe(
      hash(previous.sources.find((source) => source.id === citation.id)),
    );
  });
  it("rejects tampered current manifest/native bytes and unsupported predecessor identities", () => {
    for (const [path, prior] of [
      [
        "scripts/fixtures/tokio-runtime-1.53.1/Cargo.toml",
        "82c0a3e9fd92ee8e3ab072363f55e3644de63a75aa90b5c4b0924c212fd7fee7",
      ],
      [
        "scripts/fixtures/tokio-runtime-1.53.1/src/lib.rs",
        "26b326ce77c2105f8979187468b53deadc8aaad531ec75deb6608e5616258a1f",
      ],
    ]) {
      const successor = dependencyFileSuccessor(path, prior)!;
      const bytes = readFileSync(
        new URL(`../../${successor.currentPath}`, import.meta.url),
      );
      expect(() => dependencyFileSuccessor(path, prior, bytes)).not.toThrow();
      expect(() =>
        dependencyFileSuccessor(
          path,
          prior,
          Buffer.concat([bytes, Buffer.from("\n// unexpected change")]),
        ),
      ).toThrow(/current dependency file identity/);
      expect(() =>
        dependencyFileSuccessor(path, "0".repeat(64), bytes),
      ).toThrow(/historical dependency file identity/);
    }
    for (const path of ["unknown", "__proto__", "constructor"])
      expect(() =>
        dependencyFileSuccessor(path, "0".repeat(64), Buffer.from("untrusted")),
      ).toThrow(/Unsupported dependency successor/);
  });
});
