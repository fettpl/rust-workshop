import type { CourseModule } from "../domain/types";

const criteria = [
  [
    "cargo-dependency-contract",
    "Deklarujesz zależność, jej alias, zakres i domyślne features.",
  ],
  [
    "cargo-resolver-feature-unification",
    "Projektujesz opcjonalne features biblioteki i przekazujesz je z klienta.",
  ],
  [
    "cargo-lock-msrv-policy",
    "Zapisujesz minimalną wersję Rust i dziedziczenie metadanych workspace.",
  ],
  [
    "cargo-package-rehearsal",
    "Deklarujesz metadane oraz zasady doboru plików do lokalnego pakowania.",
  ],
] as const;

export const cargoDependencyLifecycleModule: CourseModule = {
  id: "cargo-dependency-lifecycle",
  title: "Cargo: zależności, features i pakowanie",
  whyItMatters:
    "Manifest określa, co projekt potrzebuje i jakie warianty udostępnia. Nauczysz się deklarować te wymagania, a w pakiecie Frame Protocol sprawdzisz lokalnie rzeczywisty graf zależności, wersję kompilatora i zawartość archiwum.",
  capabilities: criteria.map(([, label]) => label),
  prerequisites: ["public-api-workspaces"],
  lessonIds: criteria.map(([id]) => id),
  exitGate: [
    "Cztery niezależne zadania sprawdzają deklaracje TOML. Każde ma świeży wariant od pustej kartki.",
    "Lokalne polecenia Cargo w pobieranym projekcie sprawdzają wykonanie; aplikacja nie zalicza go na podstawie samego manifestu.",
  ],
  projectConnection:
    "Rozwijasz istniejący Frame Protocol o opcjonalne serde i feature format, sprawdzasz lockfile oraz Rust 1.85 i oglądasz archiwum biblioteki. Pakiet ma publish = false; to lokalna próba, bez publikacji.",
  assessmentId: "cargo-package-rehearsal/cargo-package-rehearsal-blank",
  gateCriteria: criteria.map(([id, label]) => ({
    id: `${id}-contract`,
    label,
    taskRefs: [
      { lessonId: id, stepId: `${id}-gate` },
      { lessonId: id, stepId: `${id}-blank` },
    ],
  })),
};
