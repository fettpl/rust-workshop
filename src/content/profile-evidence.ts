import { appendPerformanceRecoverySteps, addPerformanceRecoveryRefs } from "./performance-recovery-practice";
import type {
  Competency,
  Concept,
  CourseModule,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";
import { runtimeAllocationEvidenceLessons, runtimeAllocationEvidenceConcepts, runtimeAllocationEvidenceReviewExercises } from "./runtime-allocation-evidence";

const reviewedAt = "2026-09-18";

export const profileEvidenceSources: Source[] = [
  {
    id: "profile-rust-performance-book",
    title: "The Rust Performance Book",
    url: "https://nnethercote.github.io/perf-book/",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie definicji benchmarku, profilu kosztu lub kryterium regresji.",
  },
  {
    id: "profile-global-allocator",
    title: "Rust standard library: GlobalAlloc",
    url: "https://doc.rust-lang.org/std/alloc/trait.GlobalAlloc.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie modelu obserwacji alokacji i ostrzeżeń o optymalizacjach kompilatora.",
  },
  {
    id: "profile-criterion",
    title: "Rust standard library: black_box",
    url: "https://doc.rust-lang.org/std/hint/fn.black_box.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie roli benchmarku, artefaktów porównania lub ograniczeń platformowych.",
  },
  {
    id: "profile-valgrind-callgrind",
    title: "Valgrind User Manual: Callgrind",
    url: "https://valgrind.org/docs/manual/cl-manual.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie komendy Callgrind, formatu raportu albo ograniczeń środowiska CI.",
  },
  {
    id: "profile-valgrind-dhat",
    title: "Valgrind User Manual: DHAT",
    url: "https://valgrind.org/docs/manual/dh-manual.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie komendy DHAT, formatu raportu albo ograniczeń środowiska CI.",
  },
];

export const profileEvidenceCompetencies: Competency[] = [
  {
    id: "record-instruction-cost",
    title:
      "Budujesz deterministyczny rekord kosztu instrukcji z jawnego śladu operacji.",
  },
  {
    id: "model-allocation-events",
    title:
      "Modelujesz zdarzenia alokacji jako dane z rozmiarem, miejscem i rodzajem operacji.",
  },
  {
    id: "transfer-optimization-evidence",
    title:
      "Przenosisz obserwację kosztu do wariantu zoptymalizowanego, zachowując ten sam workload.",
  },
  {
    id: "decide-regression",
    title:
      "Podejmujesz decyzję o regresji na podstawie baseline, wariantu i jawnego progu.",
  },
];

export const profileEvidenceConcepts: Concept[] = [
  {
    id: "instruction-cost-record",
    title: "Instrukcja kosztu jest rekordem obserwacji, nie zegarem",
    prerequisites: ["conditional-performance-decision"],
    competencyIds: ["record-instruction-cost"],
    reviewPrompt:
      "Jak zapisać koszt wykonania tak, aby test był powtarzalny i miał wyraźny zakres?",
    reviewAnswer:
      "Zdefiniuj skończony ślad zdarzeń, nazwę operacji i licznik kroków. Rekord musi opisywać tylko zadeklarowany workload; nie udaje pomiaru czasu procesora na każdej maszynie.",
    distinguish:
      "Deterministyczny licznik instrukcji w fixture jest kontrolowanym proxy. Profil sprzętowy lub wall-clock wymaga osobnego eksperymentu, powtarzalności i ostrożnej interpretacji.",
    evidenceArtifact: "rust-code",
  },
  {
    id: "allocation-event-model",
    title: "Alokacja jako jawne zdarzenie z rozmiarem",
    prerequisites: ["instruction-cost-record"],
    competencyIds: ["model-allocation-events"],
    reviewPrompt:
      "Jak odróżnić liczbę zdarzeń alokacji od liczby zaalokowanych bajtów?",
    reviewAnswer:
      "Rekord zdarzenia powinien przechowywać co najmniej operację, rozmiar i identyfikator miejsca. Zliczenie zdarzeń odpowiada na pytanie ile razy, a suma rozmiarów na pytanie ile bajtów; żadna z tych miar nie opisuje samodzielnie czasu.",
    distinguish:
      "Licznik obserwacyjny nie jest kontraktem, że optimizer zachowa każdy szczegół. W testowanym fixture kontrolujemy wejście i zakres, a kod produkcyjny musi zaakceptować ograniczenia GlobalAlloc.",
    evidenceArtifact: "rust-code",
  },
  {
    id: "optimization-transfer",
    title: "Ten sam workload dla baseline i optymalizacji",
    prerequisites: ["allocation-event-model"],
    competencyIds: ["transfer-optimization-evidence"],
    reviewPrompt:
      "Co musi pozostać wspólne, aby porównać wariant bazowy z zoptymalizowanym?",
    reviewAnswer:
      "Wejście, wynik funkcjonalny, warunki środowiska fixture i sposób agregacji. Wariant może zmienić strategię, ale różne wejście albo inny filtr unieważnia porównanie.",
    distinguish:
      "Mniejsza liczba alokacji jest sygnałem w obrębie tego workloadu. Nie dowodzi globalnej poprawy, jeśli zmieniły się dane, wynik lub obserwowana ścieżka.",
    evidenceArtifact: "rust-code",
  },
  {
    id: "allocation-regression-decision",
    title: "Regresja wymaga baseline, progu i powodu",
    prerequisites: ["optimization-transfer"],
    competencyIds: ["decide-regression"],
    reviewPrompt:
      "Jak odróżnić poprawę, akceptowalną zmianę i regresję przy jawnym progu?",
    reviewAnswer:
      "Najpierw sprawdź poprawność wyniku, potem porównaj koszt wariantu z baseline i progiem. Decyzja powinna zwrócić stabilny powód, a równość progu musi mieć określone znaczenie.",
    distinguish:
      "Próg jest częścią kontraktu decyzji, a nie uniwersalną prawdą o wydajności. `Investigate` oznacza potrzebę dalszego pomiaru lub diagnozy, nie automatyczny werdykt o całym systemie.",
    evidenceArtifact: "rust-code",
  },
];

function choice(
  id: string,
  title: string,
  prompt: string,
  answers: [string, string, string],
  correct: number,
  explanations: [string, string, string],
): LessonStep {
  return {
    id,
    kind: "predict",
    title,
    prompt,
    choices: answers.map((label, index) => ({ id: String(index), label })),
    evaluator: {
      kind: "choice",
      correct: String(correct),
      explanations: Object.fromEntries(
        explanations.map((value, index) => [String(index), value]),
      ),
    },
    evidenceKind: "prediction",
  };
}

function run(
  id: string,
  title: string,
  prompt: string,
  code: string,
  expected: string,
): LessonStep {
  return {
    id,
    kind: "run",
    title,
    prompt,
    code,
    solution: code,
    evaluator: { kind: "exact-output", expected },
    expectedStatus: "success",
    evidenceKind: "exposure",
  };
}

function coding(options: {
  id: string;
  kind: "modify" | "apply" | "blank" | "recall";
  title: string;
  prompt: string;
  code?: string;
  solution: string;
  tests: string;
  gate?: boolean;
  suppliedSolutions?: LessonStep["suppliedSolutions"];
}): LessonStep {
  return {
    id: options.id,
    ...(options.suppliedSolutions ? { suppliedSolutions: options.suppliedSolutions } : {}),
    kind: options.kind,
    title: options.title,
    prompt: options.prompt,
    ...(options.code === undefined ? {} : { code: options.code }),
    solution: options.solution,
    hints: [
      "Najpierw wypisz wejście, obserwowany rekord i regułę graniczną.",
      "Sprawdź pustkę, równość progu oraz mutanta zmieniającego semantykę.",
    ],
    evaluator: { kind: "tests", tests: options.tests },
    ...(options.code === undefined
      ? {}
      : { expectedStatus: "success" as const }),
    evidenceKind:
      options.kind === "blank"
        ? "assessment"
        : options.kind === "recall"
          ? "recall"
          : "transfer",
    evidenceGate: options.gate ?? false,
  };
}

const instructionStarter = String.raw`#[derive(Debug, PartialEq, Eq)]
struct InstructionRecord { label: &'static str, steps: usize }

fn record_instruction_cost(_trace: &[&'static str]) -> InstructionRecord {
    InstructionRecord { label: "parser", steps: 0 }
}`;

const instructionSolution = String.raw`#[derive(Debug, PartialEq, Eq)]
struct InstructionRecord { label: &'static str, steps: usize }

fn record_instruction_cost(trace: &[&'static str]) -> InstructionRecord {
    InstructionRecord { label: "parser", steps: trace.len() }
}`;

const instructionTests = String.raw`fn alternative_instruction_cost(trace: &[&'static str]) -> InstructionRecord {
    InstructionRecord { label: "parser", steps: trace.iter().count() }
}

#[test]
fn instruction_record_counts_only_the_supplied_trace() {
    for trace in [&[][..], &["scan", "match", "emit"][..], &["scan", "scan"][..]] {
        assert_eq!(record_instruction_cost(trace), alternative_instruction_cost(trace));
    }
}`;

const instructionBlankStarter = String.raw`#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct InstructionRecord { label: &'static str, steps: usize }

fn record_instruction_cost(trace: &[&'static str]) -> InstructionRecord {
    InstructionRecord { label: "parser", steps: trace.len() }
}`;

const instructionBudgetStarter = String.raw`#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct InstructionRecord { label: &'static str, steps: usize }

fn within_instruction_budget(record: InstructionRecord, budget: usize) -> bool {
    record.steps < budget
}`;

const instructionBudgetSolution = String.raw`#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct InstructionRecord { label: &'static str, steps: usize }

fn within_instruction_budget(record: InstructionRecord, budget: usize) -> bool {
    record.steps <= budget
}`;

const instructionBudgetTests = String.raw`fn alternative_budget(record: InstructionRecord, budget: usize) -> bool {
    !(record.steps > budget)
}

#[test]
fn instruction_budget_contract_is_explicit() {
    assert!(within_instruction_budget(InstructionRecord { label: "parser", steps: 3 }, 3));
    assert!(!within_instruction_budget(InstructionRecord { label: "parser", steps: 4 }, 3));
    assert_eq!(within_instruction_budget(InstructionRecord { label: "parser", steps: 0 }, 0), alternative_budget(InstructionRecord { label: "parser", steps: 0 }, 0));
}`;

const instructionRecallBudgetTests = String.raw`fn expected_budget(record: InstructionRecord, budget: usize) -> bool {
    record.steps <= budget
}

#[test]
fn recalled_budget_handles_empty_maximum_and_overflow_boundary() {
    for (record, budget) in [
        (InstructionRecord { label: "parser", steps: 0 }, 0),
        (InstructionRecord { label: "parser", steps: 8 }, 8),
        (InstructionRecord { label: "parser", steps: 9 }, 8),
        (InstructionRecord { label: "parser", steps: usize::MAX }, usize::MAX),
    ] {
        assert_eq!(within_instruction_budget(record, budget), expected_budget(record, budget));
    }
}`;

const instructionReviewBudgetTests = String.raw`fn expected_budget(record: InstructionRecord, budget: usize) -> bool {
    record.steps <= budget
}

#[test]
fn review_budget_checks_both_boundary_directions() {
    assert!(within_instruction_budget(InstructionRecord { label: "parser", steps: 0 }, 0));
    assert!(within_instruction_budget(InstructionRecord { label: "parser", steps: 5 }, 5));
    assert!(!within_instruction_budget(InstructionRecord { label: "parser", steps: 6 }, 5));
    assert_eq!(within_instruction_budget(InstructionRecord { label: "parser", steps: 5 }, 5), expected_budget(InstructionRecord { label: "parser", steps: 5 }, 5));
}`;

const instructionBlankSolution = String.raw`#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct InstructionRecord { label: &'static str, steps: usize }

fn record_instruction_cost(trace: &[&'static str]) -> InstructionRecord {
    InstructionRecord { label: "parser", steps: trace.len() }
}`;

const instructionBlankTests = String.raw`fn alternative_instruction_cost(trace: &[&'static str]) -> InstructionRecord {
    InstructionRecord { label: "parser", steps: trace.iter().count() }
}

#[test]
fn instruction_record_counts_only_the_supplied_trace() {
    for trace in [&[][..], &["scan", "match", "emit"][..], &["scan", "scan"][..]] {
        assert_eq!(record_instruction_cost(trace), alternative_instruction_cost(trace));
    }
}`;

const allocationStarter = String.raw`#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum AllocationKind { Alloc, Dealloc }

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct AllocationEvent { kind: AllocationKind, bytes: usize, site: &'static str }

fn allocated_bytes(events: &[AllocationEvent]) -> usize {
    events.iter().map(|event| event.bytes).sum()
}`;

const allocationSolution = String.raw`#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum AllocationKind { Alloc, Dealloc }

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct AllocationEvent { kind: AllocationKind, bytes: usize, site: &'static str }

fn allocated_bytes(events: &[AllocationEvent]) -> usize {
    events.iter().filter(|event| event.kind == AllocationKind::Alloc).map(|event| event.bytes).sum()
}`;

const allocationTests = String.raw`fn alternative_allocated_bytes(events: &[AllocationEvent]) -> usize {
    events.iter().filter_map(|event| (event.kind == AllocationKind::Alloc).then_some(event.bytes)).sum()
}

#[test]
fn allocation_model_counts_alloc_bytes_but_not_dealloc_bytes() {
    let events = [
        AllocationEvent { kind: AllocationKind::Alloc, bytes: 8, site: "parse" },
        AllocationEvent { kind: AllocationKind::Dealloc, bytes: 8, site: "parse" },
        AllocationEvent { kind: AllocationKind::Alloc, bytes: 16, site: "format" },
    ];
    assert_eq!(allocated_bytes(&events), alternative_allocated_bytes(&events));
    assert_eq!(allocated_bytes(&[]), 0);
}`;

const allocationRecallTests = String.raw`fn expected_allocated_bytes(events: &[AllocationEvent]) -> usize {
    events.iter().filter(|event| matches!(event.kind, AllocationKind::Alloc)).map(|event| event.bytes).sum()
}

#[test]
fn recalled_allocation_bytes_ignore_deallocations_at_multiple_sites() {
    let events = [
        AllocationEvent { kind: AllocationKind::Dealloc, bytes: 64, site: "cache" },
        AllocationEvent { kind: AllocationKind::Alloc, bytes: 1, site: "parse" },
        AllocationEvent { kind: AllocationKind::Alloc, bytes: 4096, site: "buffer" },
        AllocationEvent { kind: AllocationKind::Dealloc, bytes: 1, site: "parse" },
    ];
    assert_eq!(allocated_bytes(&events), expected_allocated_bytes(&events));
}`;

const allocationBlankStarter = String.raw`#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum AllocationKind { Alloc, Dealloc }

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct AllocationEvent { kind: AllocationKind, bytes: usize, site: &'static str }

fn event_count(events: &[AllocationEvent], kind: AllocationKind) -> usize {
    events.iter().filter(|event| event.kind != kind).count()
}`;

const allocationCountStarter = String.raw`#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum AllocationKind { Alloc, Dealloc }

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct AllocationEvent { kind: AllocationKind, bytes: usize, site: &'static str }

fn allocation_count(events: &[AllocationEvent]) -> usize {
    events.iter().filter(|event| event.kind == AllocationKind::Dealloc).count()
}`;

const allocationCountSolution = String.raw`#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum AllocationKind { Alloc, Dealloc }

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct AllocationEvent { kind: AllocationKind, bytes: usize, site: &'static str }

fn allocation_count(events: &[AllocationEvent]) -> usize {
    events.iter().filter(|event| event.kind == AllocationKind::Alloc).count()
}`;

const allocationCountTests = String.raw`fn alternative_allocation_count(events: &[AllocationEvent]) -> usize {
    events.iter().filter_map(|event| (event.kind == AllocationKind::Alloc).then_some(())).count()
}

#[test]
fn allocation_count_is_event_count_not_byte_sum() {
    let events = [
        AllocationEvent { kind: AllocationKind::Alloc, bytes: 100, site: "a" },
        AllocationEvent { kind: AllocationKind::Dealloc, bytes: 100, site: "a" },
        AllocationEvent { kind: AllocationKind::Alloc, bytes: 1, site: "b" },
    ];
    assert_eq!(allocation_count(&events), alternative_allocation_count(&events));
    assert_eq!(allocation_count(&[]), 0);
}`;

const allocationBlankSolution = String.raw`#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum AllocationKind { Alloc, Dealloc }

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct AllocationEvent { kind: AllocationKind, bytes: usize, site: &'static str }

fn event_count(events: &[AllocationEvent], kind: AllocationKind) -> usize {
    events.iter().filter(|event| event.kind == kind).count()
}`;

const allocationBlankTests = String.raw`fn alternative_event_count(events: &[AllocationEvent], kind: AllocationKind) -> usize {
    events.iter().filter_map(|event| (event.kind == kind).then_some(())).count()
}

#[test]
fn allocation_event_count_preserves_kind_and_empty_input() {
    let events = [
        AllocationEvent { kind: AllocationKind::Alloc, bytes: 1, site: "a" },
        AllocationEvent { kind: AllocationKind::Dealloc, bytes: 1, site: "a" },
        AllocationEvent { kind: AllocationKind::Alloc, bytes: 2, site: "b" },
    ];
    for kind in [AllocationKind::Alloc, AllocationKind::Dealloc] {
        assert_eq!(event_count(&events, kind), alternative_event_count(&events, kind));
    }
    assert_eq!(event_count(&[], AllocationKind::Alloc), 0);
}`;

const transferStarter = String.raw`#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Cost { instructions: usize, allocations: usize }

fn improvement(baseline: Cost, candidate: Cost) -> Cost {
    Cost { instructions: baseline.instructions, allocations: candidate.allocations }
}`;

const transferSolution = String.raw`#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Cost { instructions: usize, allocations: usize }

fn improvement(baseline: Cost, candidate: Cost) -> Cost {
    Cost {
        instructions: baseline.instructions.saturating_sub(candidate.instructions),
        allocations: baseline.allocations.saturating_sub(candidate.allocations),
    }
}`;

const transferTests = String.raw`fn alternative_improvement(baseline: Cost, candidate: Cost) -> Cost {
    Cost {
        instructions: baseline.instructions.checked_sub(candidate.instructions).unwrap_or(0),
        allocations: baseline.allocations.checked_sub(candidate.allocations).unwrap_or(0),
    }
}

#[test]
fn optimization_transfer_is_componentwise_and_saturating() {
    for (baseline, candidate) in [
        (Cost { instructions: 10, allocations: 4 }, Cost { instructions: 7, allocations: 2 }),
        (Cost { instructions: 3, allocations: 1 }, Cost { instructions: 5, allocations: 2 }),
    ] {
        assert_eq!(improvement(baseline, candidate), alternative_improvement(baseline, candidate));
    }
}`;

const transferRecallTests = String.raw`fn expected_improvement(baseline: Cost, candidate: Cost) -> Cost {
    Cost {
        instructions: baseline.instructions.saturating_sub(candidate.instructions),
        allocations: baseline.allocations.saturating_sub(candidate.allocations),
    }
}

#[test]
fn recalled_improvement_handles_equal_and_reversed_components() {
    for (baseline, candidate) in [
        (Cost { instructions: 100, allocations: 10 }, Cost { instructions: 100, allocations: 10 }),
        (Cost { instructions: 1, allocations: 0 }, Cost { instructions: 3, allocations: 2 }),
        (Cost { instructions: usize::MAX, allocations: usize::MAX }, Cost { instructions: 0, allocations: 0 }),
    ] {
        assert_eq!(improvement(baseline, candidate), expected_improvement(baseline, candidate));
    }
}`;

const transferBlankStarter = String.raw`#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Workload { input: &'static str, output: &'static str }

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Cost { instructions: usize, allocations: usize }

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Measurement { workload: Workload, cost: Cost }

fn same_workload(baseline: Measurement, candidate: Measurement) -> bool {
    baseline.workload.input == candidate.workload.input
}`;

const transferBudgetStarter = String.raw`#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Workload { input: &'static str, output: &'static str }

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Cost { instructions: usize, allocations: usize }

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Measurement { workload: Workload, cost: Cost }

fn same_workload(baseline: Measurement, candidate: Measurement) -> bool {
    baseline.workload == candidate.workload && baseline.cost == candidate.cost
}`;

const transferBudgetSolution = String.raw`#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Workload { input: &'static str, output: &'static str }

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Cost { instructions: usize, allocations: usize }

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Measurement { workload: Workload, cost: Cost }

fn same_workload(baseline: Measurement, candidate: Measurement) -> bool {
    baseline.workload == candidate.workload
}`;

const transferBudgetTests = String.raw`fn alternative_same_workload(baseline: Measurement, candidate: Measurement) -> bool {
    baseline.workload.input == candidate.workload.input
        && baseline.workload.output == candidate.workload.output
}

#[test]
fn transfer_identity_is_independent_of_cost() {
    let workload = Workload { input: "logs-a", output: "report-a" };
    let same_input_different_cost = Measurement {
        workload,
        cost: Cost { instructions: 10, allocations: 4 },
    };
    let optimized = Measurement {
        workload,
        cost: Cost { instructions: 7, allocations: 2 },
    };
    let different_workload_same_cost = Measurement {
        workload: Workload { input: "logs-b", output: "report-b" },
        cost: Cost { instructions: 10, allocations: 4 },
    };
    let same_input_different_output = Measurement {
        workload: Workload { input: "logs-a", output: "report-b" },
        cost: Cost { instructions: 10, allocations: 4 },
    };
    let different_input_same_output = Measurement {
        workload: Workload { input: "logs-b", output: "report-a" },
        cost: Cost { instructions: 10, allocations: 4 },
    };
    assert!(same_workload(same_input_different_cost, optimized));
    assert!(!same_workload(same_input_different_cost, different_workload_same_cost));
    assert!(!same_workload(same_input_different_cost, same_input_different_output));
    assert!(!same_workload(same_input_different_cost, different_input_same_output));
}`;

const transferBlankSolution = String.raw`#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Workload { input: &'static str, output: &'static str }

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Cost { instructions: usize, allocations: usize }

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Measurement { workload: Workload, cost: Cost }

fn same_workload(baseline: Measurement, candidate: Measurement) -> bool {
    baseline.workload == candidate.workload
}`;

const transferBlankTests = String.raw`fn alternative_same_workload(baseline: Measurement, candidate: Measurement) -> bool {
    baseline.workload.input == candidate.workload.input
        && baseline.workload.output == candidate.workload.output
}

#[test]
fn transfer_identity_rejects_different_input_or_result() {
    let workload = Workload { input: "logs-a", output: "report-a" };
    let baseline = Measurement {
        workload,
        cost: Cost { instructions: 4, allocations: 2 },
    };
    let different_cost = Measurement {
        workload,
        cost: Cost { instructions: 8, allocations: 6 },
    };
    let same_cost_different_result = Measurement {
        workload: Workload { input: "logs-a", output: "report-b" },
        cost: Cost { instructions: 4, allocations: 2 },
    };
    let different_input_same_result = Measurement {
        workload: Workload { input: "logs-b", output: "report-a" },
        cost: Cost { instructions: 4, allocations: 2 },
    };
    assert_eq!(same_workload(baseline, different_cost), alternative_same_workload(baseline, different_cost));
    assert_eq!(same_workload(baseline, same_cost_different_result), alternative_same_workload(baseline, same_cost_different_result));
    assert_eq!(same_workload(baseline, different_input_same_result), alternative_same_workload(baseline, different_input_same_result));
    assert!(same_workload(baseline, different_cost));
    assert!(!same_workload(baseline, same_cost_different_result));
    assert!(!same_workload(baseline, different_input_same_result));
}`;

const decisionStarter = String.raw`#[derive(Debug, PartialEq, Eq)]
enum Regression { Keep, Investigate(&'static str) }

fn decide_regression(_baseline: usize, _candidate: usize, _threshold: usize) -> Regression {
    Regression::Investigate("unknown")
}`;

const decisionSolution = String.raw`#[derive(Debug, PartialEq, Eq)]
enum Regression { Keep, Investigate(&'static str) }

fn decide_regression(baseline: usize, candidate: usize, threshold: usize) -> Regression {
    if candidate <= baseline.saturating_add(threshold) {
        Regression::Keep
    } else {
        Regression::Investigate("allocation-regression")
    }
}`;

const decisionTests = String.raw`fn alternative_decide_regression(baseline: usize, candidate: usize, threshold: usize) -> Regression {
    match candidate.checked_sub(baseline) {
        Some(delta) if delta > threshold => Regression::Investigate("allocation-regression"),
        _ => Regression::Keep,
    }
}

#[test]
fn regression_decision_accepts_threshold_equality() {
    for (baseline, candidate, threshold) in [(10, 10, 0), (10, 12, 2), (10, 13, 2), (usize::MAX, usize::MAX, 0)] {
        assert_eq!(decide_regression(baseline, candidate, threshold), alternative_decide_regression(baseline, candidate, threshold));
    }
}`;

const decisionRecallTests = String.raw`fn expected_decide_regression(baseline: usize, candidate: usize, threshold: usize) -> Regression {
    if candidate.saturating_sub(baseline) > threshold {
        Regression::Investigate("allocation-regression")
    } else {
        Regression::Keep
    }
}

#[test]
fn recalled_regression_decision_handles_saturation_and_equality() {
    for (baseline, candidate, threshold) in [(0, 0, 0), (5, 7, 2), (5, 8, 2), (usize::MAX, usize::MAX, 0)] {
        assert_eq!(decide_regression(baseline, candidate, threshold), expected_decide_regression(baseline, candidate, threshold));
    }
}`;

const decisionBlankStarter = String.raw`#[derive(Debug, PartialEq, Eq)]
enum Regression { Keep, Investigate(&'static str) }

fn decide_with_correctness(correct: bool, baseline: usize, candidate: usize) -> Regression {
    if candidate <= baseline { Regression::Keep } else { Regression::Investigate("regression") }
}`;

const decisionEvidenceStarter = String.raw`#[derive(Debug, PartialEq, Eq)]
enum Regression { Keep, Investigate(&'static str) }

fn decide_with_correctness(correct: bool, baseline: usize, candidate: usize) -> Regression {
    if candidate <= baseline { Regression::Keep } else { Regression::Investigate("regression") }
}`;

const decisionEvidenceSolution = String.raw`#[derive(Debug, PartialEq, Eq)]
enum Regression { Keep, Investigate(&'static str) }

fn decide_with_correctness(correct: bool, baseline: usize, candidate: usize) -> Regression {
    if !correct { Regression::Investigate("incorrect-result") }
    else if candidate <= baseline { Regression::Keep }
    else { Regression::Investigate("regression") }
}`;

const decisionEvidenceTests = String.raw`fn alternative_decide_with_correctness(correct: bool, baseline: usize, candidate: usize) -> Regression {
    if !correct { Regression::Investigate("incorrect-result") }
    else { (candidate <= baseline).then_some(Regression::Keep).unwrap_or(Regression::Investigate("regression")) }
}

#[test]
fn decision_checks_correctness_before_cost() {
    for case in [(false, 10, 1), (true, 10, 10), (true, 10, 11)] {
        assert_eq!(decide_with_correctness(case.0, case.1, case.2), alternative_decide_with_correctness(case.0, case.1, case.2));
    }
}`;

const decisionBlankSolution = String.raw`#[derive(Debug, PartialEq, Eq)]
enum Regression { Keep, Investigate(&'static str) }

fn decide_with_correctness(correct: bool, baseline: usize, candidate: usize) -> Regression {
    if !correct { Regression::Investigate("incorrect-result") }
    else if candidate <= baseline { Regression::Keep }
    else { Regression::Investigate("regression") }
}`;

const decisionBlankTests = String.raw`fn alternative_decide_with_correctness(correct: bool, baseline: usize, candidate: usize) -> Regression {
    if !correct { Regression::Investigate("incorrect-result") }
    else { (candidate <= baseline).then_some(Regression::Keep).unwrap_or(Regression::Investigate("regression")) }
}

#[test]
fn decision_checks_functional_correctness_before_cost() {
    for case in [(false, 10, 1), (true, 10, 10), (true, 10, 11), (false, 10, 20)] {
        assert_eq!(decide_with_correctness(case.0, case.1, case.2), alternative_decide_with_correctness(case.0, case.1, case.2));
    }
}`;

export const profileEvidenceLessons: Lesson[] = appendPerformanceRecoverySteps([
  {
    id: "profile-instruction-cost",
    moduleId: "profile-evidence",
    conceptIds: ["instruction-cost-record"],
    competencyIds: ["record-instruction-cost"],
    prerequisites: ["performance-evidence-decisions"],
    title: "Zapisz koszt instrukcji jako rekord",
    subtitle:
      "Zamienisz jawny ślad operacji w powtarzalne proxy bez udawania pomiaru zegara.",
    minutes: 24,
    outcomes: [
      "Zbudujesz rekord z etykietą i liczbą kroków.",
      "Ograniczysz obserwację do przekazanego śladu.",
      "Rozpoznasz granicę między fixture a profilem sprzętowym.",
    ],
    steps: [
      choice(
        "instruction-predict",
        "Wybierz obserwację",
        "Co jest deterministycznym rekordem kosztu?",
        [
          "Liczba elementów jawnego śladu",
          "Jedno odczytanie czasu na laptopie",
          "Losowy wynik profilera",
        ],
        0,
        [
          "Ślad ma stałe wejście i granice.",
          "Wall-clock zależy od środowiska.",
          "Losowość nie tworzy kontraktu.",
        ],
      ),
      run(
        "instruction-run",
        "Uruchom rekord",
        "Fixture liczy trzy jawne kroki.",
        `fn main() { let trace = ["scan", "match", "emit"]; println!("{}", trace.len()); }`,
        "3\n",
      ),
      coding({
        id: "instruction-gate",
        suppliedSolutions: { solution: [{ lessonId: "profile-instruction-cost", stepId: "instruction-blank" }] },
        kind: "modify",
        title: "Policz ślad",
        prompt:
          "Uzupełnij `record_instruction_cost`. Zwróć etykietę `parser` i liczbę elementów w przekazanym śladzie; pusty ślad ma koszt zero.",
        code: instructionStarter,
        solution: instructionSolution,
        tests: instructionTests,
        gate: true,
      }),
      coding({
        id: "instruction-budget-gate",
        kind: "apply",
        title: "Zastosuj budżet śladu",
        prompt:
          "Zaimplementuj `within_instruction_budget`. Zaakceptuj rekord przy `steps <= budget`, w tym przy równości; odrzuć wyłącznie przekroczenie.",
        code: instructionBudgetStarter,
        solution: instructionBudgetSolution,
        tests: instructionBudgetTests,
        gate: true,
      }),
      coding({
        id: "instruction-blank",
        suppliedSolutions: { solution: [{ lessonId: "profile-instruction-cost", stepId: "instruction-gate" }] },
        kind: "blank",
        title: "Blank page: rekord instrukcji",
        prompt:
          "Napisz od zera `record_instruction_cost(trace: &[&'static str]) -> InstructionRecord`. Użyj dokładnie tej deklaracji: `#[derive(Debug, Clone, Copy, PartialEq, Eq)] struct InstructionRecord { label: &'static str, steps: usize }`. Zwróć etykietę `parser` i długość przekazanego śladu; nie dodawaj ukrytego kosztu.",
        solution: instructionBlankSolution,
        tests: instructionBlankTests,
      }),
      coding({
        id: "instruction-recall",
        kind: "recall",
        title: "Retrieval: budżet śladu",
        prompt:
          "Odtwórz `within_instruction_budget(record: InstructionRecord, budget: usize) -> bool` z pamięci. Zaakceptuj równość budżetu i odrzuć wyłącznie przekroczenie.",
        code: instructionBudgetStarter,
        solution: instructionBudgetSolution,
        tests: instructionRecallBudgetTests,
      }),
    ],
    misconceptions: [
      "Licznik fixture jest uniwersalną liczbą instrukcji CPU.",
      "Pusty workload powinien mieć ukryty koszt inicjalizacji.",
      "Równość budżetu jest automatycznie regresją.",
    ],
    transferTask:
      "Zapisz rekord dla parsera, rozdzielając liczbę odwiedzonych tokenów od liczby zaakceptowanych.",
    evidenceGate:
      "Bramki sprawdzają pustkę, równość i ograniczenie obserwacji do dostarczonego śladu.",
    sourceIds: ["profile-rust-performance-book"],
  },
  {
    id: "profile-allocation-events",
    moduleId: "profile-evidence",
    conceptIds: ["allocation-event-model"],
    competencyIds: ["model-allocation-events"],
    prerequisites: ["profile-instruction-cost"],
    title: "Zamodeluj zdarzenia alokacji",
    subtitle:
      "Rozdzielisz liczbę zdarzeń, bajty i miejsce powstania obserwacji.",
    minutes: 26,
    outcomes: [
      "Rozróżnisz Alloc i Dealloc.",
      "Zsumujesz tylko bajty nowych alokacji.",
      "Zachowasz site jako część dowodu.",
    ],
    steps: [
      choice(
        "allocation-predict",
        "Wybierz miarę",
        "Co oznacza suma bajtów zdarzeń Alloc?",
        [
          "Łączny rozmiar przydzielonych bloków w fixture",
          "Czas wykonania funkcji",
          "Liczba zwolnień bez rozmiaru",
        ],
        0,
        [
          "Suma ma jawny zakres zdarzeń.",
          "Czas wymaga osobnego pomiaru.",
          "Dealloc odpowiada innemu pytaniu.",
        ],
      ),
      run(
        "allocation-run",
        "Uruchom agregację",
        "Dwa zdarzenia Alloc dają 24 bajty.",
        `fn main() { let events = [("alloc", 8), ("dealloc", 8), ("alloc", 16)]; println!("{}", events.iter().filter(|(kind, _)| *kind == "alloc").map(|(_, bytes)| bytes).sum::<usize>()); }`,
        "24\n",
      ),
      coding({
        id: "allocation-gate",
        kind: "modify",
        title: "Zsumuj alokacje",
        prompt:
          "Uzupełnij `allocated_bytes`. Sumuj `bytes` wyłącznie dla `AllocationKind::Alloc`; pusta lista daje zero, a `Dealloc` nie zwiększa wyniku.",
        code: allocationStarter,
        solution: allocationSolution,
        tests: allocationTests,
        gate: true,
      }),
      coding({
        id: "allocation-count-gate",
        kind: "apply",
        title: "Policz zdarzenia",
        prompt:
          "Zaimplementuj `allocation_count`. Policz zdarzenia `Alloc`, niezależnie od ich rozmiaru; nie licz `Dealloc`.",
        code: allocationCountStarter,
        solution: allocationCountSolution,
        tests: allocationCountTests,
        gate: true,
      }),
      coding({
        id: "allocation-blank",
        kind: "blank",
        title: "Blank page: policz typ zdarzenia",
        prompt:
          "Napisz od zera `event_count(events: &[AllocationEvent], kind: AllocationKind) -> usize`. Użyj dokładnie tych deklaracji: `#[derive(Debug, Clone, Copy, PartialEq, Eq)] enum AllocationKind { Alloc, Dealloc }` oraz `#[derive(Debug, Clone, Copy, PartialEq, Eq)] struct AllocationEvent { kind: AllocationKind, bytes: usize, site: &'static str }`. Policz tylko zdarzenia dokładnie wskazanego rodzaju, zachowując działanie dla pustki.",
        solution: allocationBlankSolution,
        tests: allocationBlankTests,
      }),
      coding({
        id: "allocation-recall",
        kind: "recall",
        title: "Retrieval: bajty i rodzaj",
        prompt:
          "Odtwórz `allocated_bytes` z pamięci. Nie licz zwolnień jako nowych alokacji i nie używaj czasu.",
        code: allocationStarter,
        solution: allocationSolution,
        tests: allocationRecallTests,
      }),
    ],
    misconceptions: [
      "Liczba alokacji i liczba bajtów to ta sama metryka.",
      "Dealloc powiększa koszt przydzielenia.",
      "Site jest komentarzem i można go usunąć z rekordu.",
    ],
    transferTask:
      "Dodaj do rekordu źródło alokacji i opisz, które miejsca workloadu obserwujesz.",
    evidenceGate:
      "Bramki sprawdzają rozróżnienie Alloc/Dealloc, sumę bajtów i pusty zbiór zdarzeń.",
    sourceIds: ["profile-global-allocator"],
  },
  {
    id: "profile-optimization-transfer",
    moduleId: "profile-evidence",
    conceptIds: ["optimization-transfer"],
    competencyIds: ["transfer-optimization-evidence"],
    prerequisites: ["profile-allocation-events"],
    title: "Przenieś obserwację do optymalizacji",
    subtitle:
      "Porównasz baseline i wariant na tym samym workloadzie, bez mieszania metryk.",
    minutes: 27,
    outcomes: [
      "Obliczysz różnicę komponentami.",
      "Obsłużysz spadek saturująco.",
      "Sprawdzisz wspólne warunki porównania.",
    ],
    steps: [
      choice(
        "transfer-predict",
        "Zachowaj wspólny workload",
        "Co musi być takie samo w porównaniu?",
        [
          "Wejście, wynik i sposób agregacji",
          "Tylko nazwa funkcji",
          "Losowe próbki z różnych danych",
        ],
        0,
        [
          "Bez wspólnego workloadu różnica jest niewiarygodna.",
          "Nazwa nie określa zachowania.",
          "Różne dane mieszają koszt i obciążenie.",
        ],
      ),
      run(
        "transfer-run",
        "Uruchom transfer",
        "Baseline 10/4 i candidate 7/2 dają poprawę 3/2.",
        `fn main() { let baseline = (10usize, 4usize); let candidate = (7usize, 2usize); println!("{} {}", baseline.0 - candidate.0, baseline.1 - candidate.1); }`,
        "3 2\n",
      ),
      coding({
        id: "transfer-gate",
        kind: "apply",
        title: "Policz poprawę",
        prompt:
          "Zaimplementuj `improvement`. Odejmij komponenty candidate od baseline przez `saturating_sub`, aby brak poprawy dawał zero w każdym polu.",
        code: transferStarter,
        solution: transferSolution,
        tests: transferTests,
        gate: true,
      }),
      coding({
        id: "transfer-budget-gate",
        kind: "modify",
        title: "Rozpoznaj ten sam workload",
        prompt:
          "Uzupełnij `same_workload(baseline: Measurement, candidate: Measurement) -> bool`. Użyj deklaracji `#[derive(Debug, Clone, Copy, PartialEq, Eq)] struct Workload { input: &'static str, output: &'static str }`, `#[derive(Debug, Clone, Copy, PartialEq, Eq)] struct Cost { instructions: usize, allocations: usize }` oraz `#[derive(Debug, Clone, Copy, PartialEq, Eq)] struct Measurement { workload: Workload, cost: Cost }`. Porównuj wyłącznie `workload`, aby ten sam input i wynik przechodziły mimo różnych kosztów.",
        code: transferBudgetStarter,
        solution: transferBudgetSolution,
        tests: transferBudgetTests,
        gate: true,
      }),
      coding({
        id: "transfer-blank",
        kind: "blank",
        title: "Blank page: zgodność workloadu",
        prompt:
          "Napisz od zera `same_workload(baseline: Measurement, candidate: Measurement) -> bool`. Użyj dokładnie tych deklaracji: `#[derive(Debug, Clone, Copy, PartialEq, Eq)] struct Workload { input: &'static str, output: &'static str }`, `#[derive(Debug, Clone, Copy, PartialEq, Eq)] struct Cost { instructions: usize, allocations: usize }` oraz `#[derive(Debug, Clone, Copy, PartialEq, Eq)] struct Measurement { workload: Workload, cost: Cost }`. Porównaj wyłącznie tożsamość inputu i wyniku, tak aby ten sam workload z innym kosztem przechodził, a inny workload z równym kosztem był odrzucony.",
        solution: transferBlankSolution,
        tests: transferBlankTests,
      }),
      coding({
        id: "transfer-recall",
        kind: "recall",
        title: "Retrieval: transfer kosztu",
        prompt:
          "Odtwórz `improvement` z pamięci. Różnicę licz osobno dla instrukcji i alokacji, z bezpiecznym zachowaniem przy wzroście kosztu.",
        code: transferStarter,
        solution: transferSolution,
        tests: transferRecallTests,
      }),
    ],
    misconceptions: [
      "Mniejszy jeden komponent oznacza poprawę całego wariantu.",
      "Różne wejścia można porównywać, jeśli nazwa API jest taka sama.",
      "Odejmowanie bez saturacji opisuje regresję jako ogromną poprawę.",
    ],
    transferTask:
      "Przenieś porównanie do Log Analyzer i wypisz wspólne wejście, wynik oraz obserwowane proxy.",
    evidenceGate:
      "Bramki wymagają komponentowej poprawy, saturacji oraz rozdzielenia tożsamości workloadu od jego kosztu.",
    sourceIds: [
      "profile-rust-performance-book",
      "profile-criterion",
      "profile-valgrind-callgrind",
      "profile-valgrind-dhat",
    ],
  },
  {
    id: "profile-regression-decision",
    moduleId: "profile-evidence",
    conceptIds: ["allocation-regression-decision"],
    competencyIds: ["decide-regression"],
    prerequisites: ["profile-optimization-transfer"],
    title: "Podejmij decyzję o regresji",
    subtitle:
      "Najpierw sprawdzisz wynik funkcjonalny, potem koszt i próg decyzji.",
    minutes: 25,
    outcomes: [
      "Zaakceptujesz równość progu.",
      "Nazwiesz regresję stabilnym powodem.",
      "Odrzucisz kosztowny, lecz niepoprawny wariant.",
    ],
    steps: [
      choice(
        "decision-predict",
        "Ustal kolejność",
        "Co należy sprawdzić przed kosztem?",
        [
          "Poprawność wyniku funkcjonalnego",
          "Samą liczbę alokacji",
          "Nazwę benchmarku",
        ],
        0,
        [
          "Koszt nie ratuje błędnego wyniku.",
          "Niski koszt błędnego programu nie jest sukcesem.",
          "Nazwa nie jest dowodem.",
        ],
      ),
      run(
        "decision-run",
        "Uruchom próg",
        "Równość progu przechodzi, a przekroczenie zwraca investigate.",
        `fn main() { let baseline = 10usize; let threshold = 2usize; for candidate in [12, 13] { println!("{}", candidate <= baseline + threshold); } }`,
        "true\nfalse\n",
      ),
      coding({
        id: "decision-gate",
        kind: "modify",
        title: "Zwróć decyzję",
        prompt:
          'Uzupełnij `decide_regression`. `Keep` obejmuje candidate <= baseline + threshold; przekroczenie zwraca `Investigate("allocation-regression")`, także z równością progu.',
        code: decisionStarter,
        solution: decisionSolution,
        tests: decisionTests,
        gate: true,
      }),
      coding({
        id: "decision-evidence-gate",
        kind: "apply",
        title: "Sprawdź poprawność przed kosztem",
        prompt:
          "Zaimplementuj `decide_with_correctness`. Wynik niepoprawny zwraca `incorrect-result`; dopiero poprawny wariant może przejść lub zgłosić `regression`.",
        code: decisionEvidenceStarter,
        solution: decisionEvidenceSolution,
        tests: decisionEvidenceTests,
        gate: true,
      }),
      coding({
        id: "decision-blank",
        kind: "blank",
        title: "Blank page: poprawność przed kosztem",
        prompt:
          'Napisz od zera `decide_with_correctness(correct: bool, baseline: usize, candidate: usize) -> Regression`. Użyj deklaracji `#[derive(Debug, PartialEq, Eq)] enum Regression { Keep, Investigate(&\'static str) }`. Gdy `correct` jest false, zwróć `Investigate("incorrect-result")`; dopiero potem porównaj `candidate <= baseline`.',
        solution: decisionBlankSolution,
        tests: decisionBlankTests,
      }),
      coding({
        id: "decision-recall",
        kind: "recall",
        title: "Retrieval: próg regresji",
        prompt:
          "Odtwórz `decide_regression` z pamięci. Zachowaj równość progu i stabilny powód regresji.",
        code: decisionStarter,
        solution: decisionSolution,
        tests: decisionRecallTests,
      }),
    ],
    misconceptions: [
      "Próg jest uniwersalną gwarancją szybkości.",
      "Koszt może zastąpić sprawdzenie wyniku.",
      "Równość threshold powinna być zawsze odrzuceniem.",
    ],
    transferTask:
      "Zaprojektuj decyzję dla liczby bajtów alokacji, zapisując próg, baseline i warunek poprawności wyniku.",
    evidenceGate:
      "Bramki sprawdzają równość progu, stabilny powód oraz pierwszeństwo poprawności funkcjonalnej.",
    sourceIds: ["profile-rust-performance-book", "profile-criterion"],
  },
]);

export const profileEvidenceReviewExercises: Record<string, LessonStep> = {
  "instruction-cost-record": coding({
    id: "review-profile-instruction",
    kind: "apply",
    title: "Powtórka: budżet śladu",
    prompt:
      "Zaimplementuj `within_instruction_budget`, akceptując równość i odrzucając przekroczenie.",
    code: instructionBudgetStarter,
    solution: instructionBudgetSolution,
    tests: instructionReviewBudgetTests,
  }),
  "allocation-event-model": coding({
    id: "review-profile-allocation",
    kind: "apply",
    title: "Powtórka: typ alokacji",
    prompt:
      "Policz zdarzenia wskazanego rodzaju, bez pomylenia Alloc z Dealloc.",
    code: allocationBlankStarter,
    solution: allocationBlankSolution,
    tests: allocationBlankTests,
  }),
  "optimization-transfer": coding({
    id: "review-profile-transfer",
    kind: "apply",
    title: "Powtórka: wspólny workload",
    prompt:
      "Zaimplementuj `same_workload(baseline: Measurement, candidate: Measurement) -> bool`. Porównuj wyłącznie `Workload { input, output }`, aby ten sam workload z innym `Cost` przechodził. Odrzuć osobno różny input i różny output, nawet gdy koszt jest równy.",
    code: transferBudgetStarter,
    solution: transferBudgetSolution,
    tests: transferBudgetTests,
  }),
  "allocation-regression-decision": coding({
    id: "review-profile-decision",
    kind: "apply",
    title: "Powtórka: poprawność i koszt",
    prompt: "Wymuś sprawdzenie poprawności wyniku przed oceną regresji kosztu.",
    code: decisionBlankStarter,
    solution: decisionBlankSolution,
    tests: decisionBlankTests,
  }),
};

export const profileEvidenceModule: CourseModule = addPerformanceRecoveryRefs({
  id: "profile-evidence",
  title: "Profilowanie i dowody kosztu",
  whyItMatters:
    "Profilowanie pomaga podejmować decyzje dopiero wtedy, gdy zakres workloadu, obserwowana metryka i próg są jawne. Zbudujesz deterministyczne rekordy instrukcji i alokacji, przeniesiesz je do porównania wariantów oraz nazwiesz regresję bez obietnic globalnej szybkości.",
  capabilities: profileEvidenceCompetencies.map((item) => item.title),
  prerequisites: ["performance-evidence"],
  lessonIds: [...profileEvidenceLessons, ...runtimeAllocationEvidenceLessons].map((lesson) => lesson.id),
  exitGate: [
    "Zapiszesz instrukcyjny koszt fixture jako rekord ograniczony do jawnego śladu.",
    "Zamodelujesz alokacje jako zdarzenia z rodzajem, rozmiarem i miejscem.",
    "Porównasz baseline i wariant na tym samym workloadzie, a decyzję oprzesz o poprawność, próg i powód.",
  ],
  projectConnection:
    "W Log Analyzer opiszesz koszt parsera i agregatora przez wspólne wejście, rekordy alokacji oraz decyzję regresji. Benchmark i profiler pozostają źródłem dodatkowej obserwacji; fixture nie udaje pomiaru każdej maszyny.",
  assessmentId: "profile-regression-decision/decision-blank",
  gateCriteria: [
    {
      id: "profile-instruction-record-gate",
      label: "Rekord kosztu liczy wyłącznie jawny ślad.",
      taskRefs: [
        { lessonId: "profile-instruction-cost", stepId: "instruction-gate" },
        { lessonId: "profile-instruction-cost", stepId: "instruction-blank" },
      ],
    },
    {
      id: "profile-instruction-budget-gate",
      label: "Budżet instrukcji akceptuje równość.",
      taskRefs: [
        {
          lessonId: "profile-instruction-cost",
          stepId: "instruction-budget-gate",
        },
        { lessonId: "profile-instruction-cost", stepId: "instruction-recall" },
      ],
    },
    {
      id: "profile-allocation-bytes-gate",
      label: "Suma obejmuje tylko zdarzenia Alloc.",
      taskRefs: [
        { lessonId: "profile-allocation-events", stepId: "allocation-gate" },
        { lessonId: "profile-allocation-events", stepId: "allocation-recall" },
      ],
    },
    {
      id: "profile-allocation-kind-gate",
      label: "Licznik rozróżnia rodzaj zdarzenia i pustkę.",
      taskRefs: [
        {
          lessonId: "profile-allocation-events",
          stepId: "allocation-count-gate",
        },
        { lessonId: "profile-allocation-events", stepId: "allocation-blank" },
      ],
    },
    {
      id: "profile-transfer-improvement-gate",
      label: "Transfer kosztu jest komponentowy i saturujący.",
      taskRefs: [
        { lessonId: "profile-optimization-transfer", stepId: "transfer-gate" },
        { lessonId: "profile-optimization-transfer", stepId: "transfer-recall" },
      ],
    },
    {
      id: "profile-transfer-workload-gate",
      label: "Porównanie rozpoznaje ten sam workload niezależnie od kosztu.",
      taskRefs: [
        {
          lessonId: "profile-optimization-transfer",
          stepId: "transfer-budget-gate",
        },
        {
          lessonId: "profile-optimization-transfer",
          stepId: "transfer-blank",
        },
      ],
    },
    {
      id: "profile-regression-threshold-gate",
      label: "Decyzja akceptuje równość progu i nazywa regresję.",
      taskRefs: [
        { lessonId: "profile-regression-decision", stepId: "decision-gate" },
        { lessonId: "profile-regression-decision", stepId: "decision-recall" },
      ],
    },
    {
      id: "profile-regression-correctness-gate",
      label: "Poprawność funkcjonalna poprzedza decyzję kosztową.",
      taskRefs: [
        {
          lessonId: "profile-regression-decision",
          stepId: "decision-evidence-gate",
        },
        { lessonId: "profile-regression-decision", stepId: "decision-blank" },
      ],
    },
    {
      id: "runtime-allocation-scope-gate",
      label: "Okno alokacji ma osobny setup i zamyka się po Ok oraz Err.",
      taskRefs: [
        { lessonId: "runtime-allocation-scope", stepId: "allocation-scope-gate" },
        { lessonId: "runtime-allocation-scope", stepId: "allocation-scope-blank" },
      ],
    },
    {
      id: "runtime-allocation-scope-error-gate",
      label: "Niekompletne okno nie jest dowodem sukcesu.",
      taskRefs: [
        { lessonId: "runtime-allocation-scope", stepId: "allocation-scope-error-gate" },
        { lessonId: "runtime-allocation-scope", stepId: "allocation-scope-blank" },
      ],
    },
    {
      id: "runtime-allocation-comparison-gate",
      label: "Baseline i candidate mają ten sam input oraz Summary.",
      taskRefs: [
        { lessonId: "runtime-allocation-comparison", stepId: "allocation-comparison-gate" },
        { lessonId: "runtime-allocation-comparison", stepId: "allocation-comparison-blank" },
        { lessonId: "runtime-allocation-comparison", stepId: "allocation-comparison-audit" },
      ],
    },
    {
      id: "runtime-allocation-comparison-complete-gate",
      label: "Niekompletne lub nieporównywalne dane są odrzucane.",
      taskRefs: [
        { lessonId: "runtime-allocation-comparison", stepId: "allocation-comparison-complete-gate" },
        { lessonId: "runtime-allocation-comparison", stepId: "allocation-comparison-blank" },
        { lessonId: "runtime-allocation-comparison", stepId: "allocation-comparison-audit" },
      ],
    },
  ],
});

export const profileEvidenceExtendedLessons = runtimeAllocationEvidenceLessons;
export const profileEvidenceExtendedConcepts = runtimeAllocationEvidenceConcepts;
export const profileEvidenceExtendedReviewExercises = runtimeAllocationEvidenceReviewExercises;
