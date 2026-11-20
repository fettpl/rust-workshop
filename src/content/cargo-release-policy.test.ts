import { describe, expect, it } from "vitest";
import { evaluate } from "@/engine/evaluate";
import {
  cargoReleaseCompetencies,
  cargoReleaseConcepts,
  cargoReleaseLessons,
  cargoReleaseReviewExercises,
  cargoReleaseSources,
} from "./cargo-release-policy";

describe("kurs compiler floor i pakowania Cargo", () => {
  it("publikuje dwa kompletne manifestowe kontrakty", () => {
    expect(cargoReleaseLessons.map((lesson) => lesson.id)).toEqual([
      "cargo-lock-msrv-policy",
      "cargo-package-rehearsal",
    ]);
    expect(cargoReleaseConcepts).toHaveLength(2);
    expect(
      cargoReleaseConcepts.every(
        (concept) => concept.evidenceArtifact === "manifest",
      ),
    ).toBe(true);
    expect(cargoReleaseCompetencies.length).toBeGreaterThanOrEqual(2);
    expect(
      cargoReleaseSources.every((source) => source.reviewedAt === "2026-09-17"),
    ).toBe(true);
    expect(Object.keys(cargoReleaseReviewExercises)).toEqual([
      "cargo-lock-msrv-policy",
      "cargo-package-rehearsal",
    ]);
    for (const lesson of cargoReleaseLessons) {
      expect(lesson.steps.length).toBeGreaterThanOrEqual(5);
      expect(lesson.steps.length).toBeLessThanOrEqual(8);
      expect(lesson.steps.every((step) => step.prompt.trim().length > 0)).toBe(
        true,
      );
      expect(
        lesson.steps.filter((step) => step.kind === "predict"),
      ).toHaveLength(1);
      expect(
        lesson.steps.filter((step) => step.kind === "observe"),
      ).toHaveLength(1);
      expect(
        lesson.steps.filter((step) => step.kind === "explain"),
      ).toHaveLength(1);
      expect(
        lesson.steps.filter((step) => step.kind === "recall"),
      ).toHaveLength(1);
    }
  });

  it("przepuszcza rozwiązania, odrzuca startery i zostawia blank bez kodu", () => {
    for (const lesson of cargoReleaseLessons) {
      const manifestSteps = lesson.steps.filter(
        (step) => step.evaluator?.kind === "manifest-contract",
      );
      expect(manifestSteps).toHaveLength(2);
      for (const step of manifestSteps) {
        expect(step.editorMode).toBe("toml");
        expect(step.editorFile).toBeTruthy();
        expect(step.expectedStatus).toBeUndefined();
        expect(step.solution).toBeTruthy();
        expect(
          evaluate(step.evaluator!, { code: step.solution }),
        ).toMatchObject({
          passed: true,
        });
        if (step.code !== undefined)
          expect(evaluate(step.evaluator!, { code: step.code }).passed).toBe(
            false,
          );
        else expect(step.kind).toBe("blank");
      }
    }
  });

  it("przepuszcza właściwe odpowiedzi choice i niezależne review", () => {
    for (const lesson of cargoReleaseLessons) {
      for (const step of lesson.steps) {
        if (step.evaluator?.kind === "choice")
          expect(
            evaluate(step.evaluator, { answer: step.evaluator.correct }).passed,
          ).toBe(true);
      }
    }
    for (const [conceptId, step] of Object.entries(
      cargoReleaseReviewExercises,
    )) {
      expect(step.id).toBe(`${conceptId}-review`);
      expect(step.kind).toBe("recall");
      expect(step.editorMode).toBe("toml");
      expect(step.editorFile).toBeTruthy();
      expect(step.evaluator?.kind).toBe("manifest-contract");
      expect(evaluate(step.evaluator!, { code: step.solution })).toMatchObject({
        passed: true,
      });
    }
  });

  it("akceptuje kolejność tabel, kolejność include i niepuste alternatywne opisy", () => {
    const floor = cargoReleaseLessons[0].steps.find(
      (step) => step.id === "cargo-lock-msrv-policy-gate",
    )!;
    expect(
      evaluate(floor.evaluator!, {
        code: `[workspace]\nmembers = ["crates/frame-probe", "crates/frame-protocol"]\nresolver = "3"\n[workspace.package]\npublish = false\nrust-version = "1.85.0"\n[workspace.dependencies]\nserde = { default-features = false, version = "1.0.229" }`,
      }).passed,
    ).toBe(true);

    expect(
      evaluate(floor.evaluator!, {
        code: `${floor.solution}\n[workspace.metadata.docs]\nlabel = "Internal documentation"\n`,
      }).passed,
    ).toBe(true);

    const packageBlank = cargoReleaseLessons[1].steps.find(
      (step) => step.id === "cargo-package-rehearsal-blank",
    )!;
    expect(
      evaluate(packageBlank.evaluator!, {
        code: packageBlank
          .solution!.replace(
            "A signal library for package rehearsal.",
            "Another useful signal library.",
          )
          .replace(
            '["Cargo.toml", "README.md", "src/**", "tests/**"]',
            '["tests/**", "src/**", "README.md", "Cargo.toml"]',
          ),
      }).passed,
    ).toBe(true);
  });

  it("odrzuca mutacje floor, dziedziczenia, metadanych i granic archiwum", () => {
    const floorGate = cargoReleaseLessons[0].steps.find(
      (step) => step.id === "cargo-lock-msrv-policy-gate",
    )!;
    for (const mutation of [
      floorGate.solution!.replace('resolver = "3"', 'resolver = "2"'),
      floorGate.solution!.replace(
        'rust-version = "1.85.0"',
        'rust-version = "1.84.0"',
      ),
      floorGate.solution!.replace("publish = false", "publish = true"),
      floorGate.solution!.replace('version = "1.0.229"', 'version = "1.0.228"'),
      floorGate
        .solution!.replace('rust-version = "1.85.0"\n', "")
        .concat('\n[workspace.metadata.policy]\nmsrv = "1.85.0"\n'),
    ])
      expect(evaluate(floorGate.evaluator!, { code: mutation }).passed).toBe(
        false,
      );

    const inheritance = cargoReleaseLessons[0].steps.find(
      (step) => step.id === "cargo-lock-msrv-policy-blank",
    )!;
    for (const mutation of [
      inheritance.solution!.replace(
        "rust-version.workspace = true",
        'rust-version = "1.85.0"',
      ),
      inheritance.solution!.replace(
        "version.workspace = true",
        'version = "0.1.0"',
      ),
      inheritance.solution!.replace("optional = true", "optional = false"),
    ])
      expect(evaluate(inheritance.evaluator!, { code: mutation }).passed).toBe(
        false,
      );

    const packageGate = cargoReleaseLessons[1].steps.find(
      (step) => step.id === "cargo-package-rehearsal-gate",
    )!;
    for (const mutation of [
      packageGate.solution!.replace("publish = false", "publish = true"),
      packageGate.solution!.replace(
        'description = "A small frame protocol teaching workspace."',
        'description = ""',
      ),
      packageGate.solution!.replace('readme = "README.md"', 'readme = ""'),
      packageGate.solution!.replace(
        "[workspace.package]",
        '[workspace.package]\ninclude = ["src/**"]',
      ),
      packageGate.solution!.replace(
        "[workspace.package]",
        '[workspace.package]\nexclude = ["notes/**"]',
      ),
    ])
      expect(evaluate(packageGate.evaluator!, { code: mutation }).passed).toBe(
        false,
      );

    const packageBlank = cargoReleaseLessons[1].steps.find(
      (step) => step.id === "cargo-package-rehearsal-blank",
    )!;
    for (const mutation of [
      packageBlank.solution!.replace(
        'path = "src/lib.rs"',
        'path = "src/main.rs"',
      ),
      packageBlank.solution!.replace(
        'include = ["Cargo.toml", "README.md", "src/**", "tests/**"]',
        'include = ["Cargo.toml", "README.md"]',
      ),
      packageBlank.solution!.replace("publish = false", "publish = true"),
    ])
      expect(evaluate(packageBlank.evaluator!, { code: mutation }).passed).toBe(
        false,
      );

    const packageReview =
      cargoReleaseReviewExercises["cargo-package-rehearsal"];
    expect(
      evaluate(packageReview.evaluator!, {
        code: packageReview.solution!.replace(
          'exclude = ["fixtures/large.bin", "build/generated/**", "notes/**"]',
          'include = ["src/**"]',
        ),
      }).passed,
    ).toBe(false);
  });
});
