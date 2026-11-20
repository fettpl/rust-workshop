// Operational metadata and Rust sources are MIT. Original Polish teaching prose is CC BY 4.0.
import type { ProjectPackage } from "../../../domain/types";
import { codecSource } from "./codec";
import { libSource, modelSource, starterModelSource } from "./model";
import {
  compatibilityTests,
  packageReadme,
  upgradeExample,
  upgradeTests,
} from "./tests";
import { upgradeSource } from "./upgrade";

const starterReadmeInstruction =
  "Uzupełnij ciało funkcji normalize w src/model.rs.";
const solutionReadmeInstruction =
  "Ten wariant pokazuje rozwiązanie funkcji normalize w src/model.rs.";

export const fileSchemaEvolutionPackage: ProjectPackage = {
  id: "file-schema-evolution-workshop",
  title: "Projekt: jawna aktualizacja formatu pliku",
  description:
    "Zachowaj znaczenie zadań między wersjami i jawnie zastąp poprawny plik V1.",
  instructions: [
    "Uzupełnij funkcję normalize w pliku src/model.rs.",
    "Porównaj zachowane dane i uruchom testy projektu bez sieci.",
    "Sprawdź jawną aktualizację na własnej kopii pliku testowego.",
  ],
  revealStepRefs: [
    { lessonId: "file-schema-normalization", stepId: "schema-normalize-apply" },
    { lessonId: "file-schema-normalization", stepId: "schema-normalize-blank" },
  ],
  starterRevealStepRefs: [],
  files: [
    {
      path: "Cargo.toml",
      starter: String.raw`[package]
name = "file-schema-evolution-workshop"
version = "1.0.0"
edition = "2024"
rust-version = "1.85.0"
publish = false
license = "MIT"

[lib]
name = "file_schema_evolution"
`,
    },
    { path: "src/lib.rs", starter: libSource },
    {
      path: "src/model.rs",
      starter: starterModelSource,
      solution: modelSource,
    },
    { path: "src/codec.rs", starter: codecSource },
    { path: "src/upgrade.rs", starter: upgradeSource },
    { path: "tests/compatibility.rs", starter: compatibilityTests },
    { path: "tests/upgrade.rs", starter: upgradeTests },
    { path: "examples/upgrade.rs", starter: upgradeExample },
    {
      path: "README.md",
      starter: packageReadme,
      solution: packageReadme.replace(
        starterReadmeInstruction,
        solutionReadmeInstruction,
      ),
    },
  ],
};
