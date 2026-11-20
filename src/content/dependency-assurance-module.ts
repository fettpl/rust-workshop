import type { CourseModule } from "../domain/types";

const lessonIds = [
  "dependency-graph-diagnosis",
  "dependency-source-license-policy",
  "dependency-advisory-exceptions",
  "dependency-release-dossier",
] as const;

export const dependencyAssuranceModule: CourseModule = {
  id: "dependency-assurance",
  title: "Dependency Assurance i decyzja o wydaniu",
  whyItMatters:
    "Zależność nie jest tylko wpisem w Cargo.toml. Nauczysz się czytać graf, ograniczać źródła i licencje, rozliczać czasowe wyjątki advisory oraz podejmować decyzję o wydaniu na podstawie konkretnego dossier artefaktów.",
  capabilities: [
    "Diagnozujesz konflikt wersji i rozróżniasz dowód grafu od samej deklaracji.",
    "Egzekwujesz allowlistę źródeł i licencji bez ukrywania nieznanych wartości.",
    "Oceniasz wyjątek advisory względem wstrzykniętej daty i wymagasz właściciela oraz zakresu.",
    "Podejmujesz decyzję release wyłącznie z kompletnego, przypiętego dossier artefaktów.",
  ],
  prerequisites: ["cargo-dependency-lifecycle"],
  lessonIds: [...lessonIds],
  exitGate: [
    "Osiem niezależnych bramek obejmuje cztery kontrakty; każda lekcja ma świeże zadanie od pustej kartki.",
    "Cztery kodowe powtórki przyjmują datę i dowody jako dane wejściowe; nie używają zegara ściennego ani sieci.",
    "Polecenia supply-chain sprawdzają wyłącznie autorski Frame Protocol i kończą się błędem przy brakującym dowodzie.",
  ],
  projectConnection:
    "Rozszerzasz Frame Protocol o politykę źródeł/licencji, snapshot advisory, dowód konfliktu oraz manifest decyzji. Pakiet pozostaje lokalnym fixture z publish = false; verifier nie publikuje crate ani nie ufa danym z zewnątrz.",
  assessmentId: "dependency-release-dossier/dependency-release-dossier-blank",
  gateCriteria: lessonIds.flatMap((lessonId) => [
    {
      id: `${lessonId}-primary-contract`,
      label: `Główna bramka kontraktu ${lessonId}.`,
      taskRefs: [
        { lessonId, stepId: `${lessonId}-gate` },
        {
          lessonId,
          stepId:
            lessonId === "dependency-graph-diagnosis"
              ? `${lessonId}-recall`
              : `${lessonId}-${{ "dependency-source-license-policy": "batch", "dependency-advisory-exceptions": "scope", "dependency-release-dossier": "missing" }[lessonId]}-transfer`,
        },
      ],
    },
    {
      id: `${lessonId}-blank-contract`,
      label: `Niezależna bramka blank-page ${lessonId}.`,
      taskRefs: [
        { lessonId, stepId: `${lessonId}-blank` },
        {
          lessonId,
          stepId: `${lessonId}-${{ "dependency-graph-diagnosis": "edge-audit", "dependency-source-license-policy": "reason", "dependency-advisory-exceptions": "ledger", "dependency-release-dossier": "batch" }[lessonId]}-transfer`,
        },
      ],
    },
  ]),
};
