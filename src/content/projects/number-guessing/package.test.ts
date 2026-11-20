import { describe, expect, it } from "vitest";
import {
  projectFiles,
  validateProjectPackage,
} from "../../../domain/project-package";
import {
  numberGuessingPackage,
  numberGuessingProject,
} from "../number-guessing";

describe("Number Guessing+ archive contract", () => {
  it("keeps the legacy project identity and reveals only the four new gates", () => {
    expect(numberGuessingProject.id).toBe("number-guessing-result-message");
    expect(numberGuessingProject.lessonId).toBe("number-guessing-transfer");
    expect(numberGuessingProject.lessonIds).toEqual([
      "number-guessing-transfer",
      "adversarial-no-clone",
      "guess-input-contract",
      "guess-round-state",
      "guess-session-io",
      "guess-random-boundary",
    ]);
    expect(
      numberGuessingPackage.revealStepRefs.map((ref) => ref.stepId),
    ).toEqual([
      "guess-input-contract-gate",
      "guess-round-state-gate",
      "guess-session-io-gate",
      "guess-random-boundary-gate",
    ]);
  });
  it("ships a compiling TODO starter and a pinned random reference archive", () => {
    expect(validateProjectPackage(numberGuessingPackage)).toEqual([]);
    const starter = projectFiles(numberGuessingPackage, "starter");
    const solution = projectFiles(numberGuessingPackage, "solution");
    expect(starter["src/lib.rs"]).toContain("todo!");
    expect(starter["tests/contracts.rs"]).toContain("final_win");
    expect(solution["Cargo.toml"]).toContain(
      'rand = { version = "=0.10.3", default-features = false, features = ["thread_rng"] }',
    );
    expect(solution["src/main.rs"]).toContain("rand::random_range(1..=100)");
  });
});
