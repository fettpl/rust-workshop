import { appendPerformanceRecoverySteps, addPerformanceRecoveryRefs } from "./performance-recovery-practice";
import type {
  Competency,
  Concept,
  CourseModule,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";

const reviewedAt = "2026-09-17";

export const performanceEvidenceSources: Source[] = [
  {
    id: "performance-benchmarking-book",
    title: "rustc-perf: Rust compiler performance suite",
    url: "https://github.com/rust-lang/rustc-perf",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie definicji workloadu, rozdzielenia pomiaru od poprawności lub przykładów benchmarku.",
  },
  {
    id: "performance-rust-iterator",
    title: "Rust standard library: Iterator",
    url: "https://doc.rust-lang.org/std/iter/trait.Iterator.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie przykładów leniwego przetwarzania, borrowingu i krótkiego obiegu.",
  },
  {
    id: "performance-bufread",
    title: "Rust standard library: BufRead",
    url: "https://doc.rust-lang.org/std/io/trait.BufRead.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie kontraktu read_line, bufora roboczego lub obsługi EOF.",
  },
  {
    id: "performance-string-clear",
    title: "Rust standard library: String::clear",
    url: "https://doc.rust-lang.org/std/string/struct.String.html#method.clear",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie opisu czyszczenia bufora i zachowania jego pojemności.",
  },
  {
    id: "performance-vec-capacity",
    title: "Rust standard library: Vec::with_capacity",
    url: "https://doc.rust-lang.org/std/vec/struct.Vec.html#method.with_capacity",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie deterministycznych testów pojemności i ograniczenia alokacji.",
  },
];

export const performanceEvidenceCompetencies: Competency[] = [
  {
    id: "define-measured-workload",
    title:
      "Definiujesz workload przez wejście, operacje i obserwowalny wynik, oddzielając dowód od zegara.",
  },
  {
    id: "preserve-borrowed-stream",
    title:
      "Przetwarzasz strumień pożyczająco i rozpoznajesz, kiedy materializacja zmienia kontrakt.",
  },
  {
    id: "reuse-bounded-buffer",
    title:
      "Budujesz pętlę z jednym buforem roboczym, czyszczonym i ponownie używanym; read_line może zwiększyć jego pojemność dla długiego rekordu.",
  },
  {
    id: "interpret-performance-evidence",
    title:
      "Interpretujesz deterministyczne dowody i podejmujesz warunkową decyzję bez przedstawiania proxy jako wyniku absolutnego.",
  },
];

export const performanceEvidenceConcepts: Concept[] = [
  {
    id: "measured-workload-contract",
    title: "Mierzony workload jest jawnie ograniczonym kontraktem",
    prerequisites: ["property-metamorphic-transfer"],
    competencyIds: ["define-measured-workload"],
    reviewPrompt:
      "Jak opisać workload tak, aby test był powtarzalny i wiadomo było, co naprawdę obserwuje?",
    reviewAnswer:
      "Podaj stałe wejście lub generator z granicami, operację oraz obserwowalny wynik, na przykład liczbę odwiedzonych i zaakceptowanych elementów. Test nie powinien zależeć od czasu ściennego ani od niejawnego stanu maszyny; taki kontrakt jest dowodem zachowania w zadeklarowanej dziedzinie.",
    distinguish:
      "Workload opisuje pracę, którą wykonuje program. Wynik proxy, taki jak liczba odwiedzin lub alokacji, pozwala porównywać warianty w tym samym kontrakcie, lecz sam nie jest uniwersalną obietnicą szybkości.",
    evidenceArtifact: "rust-code",
  },
  {
    id: "borrowed-stream-no-materialization",
    title: "Pożyczany strumień bez materializacji",
    prerequisites: ["measured-workload-contract"],
    competencyIds: ["preserve-borrowed-stream"],
    reviewPrompt:
      "Dlaczego `map` zwracający `&str` może zachować kontrakt bez budowania nowych napisów?",
    reviewAnswer:
      "Iterator może oddawać widoki związane z życiem wejścia, a konsument pobiera je tylko na czas użycia. `map` i `filter` są leniwe, więc sama konstrukcja potoku nie tworzy kolekcji; `collect::<Vec<&str>>()` materializuje kontener widoków, ale nie kopiuje treści napisów.",
    distinguish:
      "Pożyczony wynik wymaga, aby wejście żyło dostatecznie długo i nie było mutowane w konflikcie z pożyczką. `to_owned` albo `collect::<Vec<String>>()` zmienia koszt i własność, nawet gdy tekst końcowy wygląda tak samo.",
    evidenceArtifact: "rust-code",
  },
  {
    id: "bounded-buffer-reuse",
    title: "Bufor roboczy i ponowne użycie pamięci",
    prerequisites: ["borrowed-stream-no-materialization"],
    competencyIds: ["reuse-bounded-buffer"],
    reviewPrompt:
      "Co daje `String::clear()` w pętli `BufRead::read_line` i czego ta operacja nie obiecuje?",
    reviewAnswer:
      "`clear` usuwa długość napisu, zachowując jego pojemność, więc następny wiersz może użyć tego samego bufora. read_line może zwiększyć pojemność dla długiego wiersza. Osobny limit długości lub ograniczony czytnik pakietu zapewnia inną granicę.",
    distinguish:
      "Ponowne użycie bufora jest własnością implementacji, którą można obserwować przez pojemność lub licznik kontrolowanego alokatora. Nie należy wyciągać z niego wniosku o czasie wykonania na każdej maszynie.",
    evidenceArtifact: "rust-code",
  },
  {
    id: "conditional-performance-decision",
    title: "Dowód, proxy i decyzja warunkowa",
    prerequisites: ["bounded-buffer-reuse"],
    competencyIds: ["interpret-performance-evidence"],
    reviewPrompt:
      "Jak sformułować decyzję `keep` lub `investigate`, gdy dowód spełnia budżet tylko dla określonego workloadu?",
    reviewAnswer:
      "Zapisz baseline, wariant, granice workloadu i próg decyzji. Zwróć `keep` tylko wtedy, gdy każdy wymagany warunek jest spełniony; w przeciwnym razie zwróć `investigate` z powodem. Wynik dotyczy tego kontraktu i nie jest deklaracją absolutnej przewagi wydajności.",
    distinguish:
      "Równość wyniku funkcji nie dowodzi równości kosztu, a pojedynczy proxy nie dowodzi jakości całego systemu. Decyzja warunkowa zachowuje zakres dowodu i wskazuje, kiedy potrzebna jest dalsza obserwacja.",
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

function practiceChoice(options: {
  id: string;
  kind: "predict" | "explain" | "observe" | "recall";
  title: string;
  prompt: string;
  choices: { id: string; label: string }[];
  correct: string;
  explanations: Record<string, string>;
  evidenceKind: "prediction" | "exposure" | "recall";
}): LessonStep {
  return {
    id: options.id,
    kind: options.kind,
    title: options.title,
    prompt: options.prompt,
    choices: options.choices,
    evaluator: {
      kind: "choice",
      correct: options.correct,
      explanations: options.explanations,
    },
    evidenceKind: options.evidenceKind,
  };
}

function practicePacket(options: {
  id: string;
  title: string;
  prompt: string;
  criteria: string[];
}): LessonStep {
  return {
    id: options.id,
    kind: "assessment",
    title: options.title,
    prompt: options.prompt,
    evaluator: { kind: "rubric", criteria: options.criteria },
    rubric: options.criteria,
    evidenceKind: "self-rating",
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
}): LessonStep {
  return {
    id: options.id,
    kind: options.kind,
    title: options.title,
    prompt: options.prompt,
    ...(options.code === undefined ? {} : { code: options.code }),
    solution: options.solution,
    hints: [
      "Wypisz najpierw kontrakt: wejście, granicę i obserwowalny wynik.",
      "Sprawdź także pustkę, przypadek graniczny oraz wariant mutanta opisany w testach.",
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

const workloadStarter = String.raw`#[derive(Debug, PartialEq, Eq)]
struct WorkloadEvidence { visited: usize, accepted: usize, rejected: usize }

fn inspect_workload(_items: &[u8]) -> WorkloadEvidence {
    WorkloadEvidence { visited: 0, accepted: 0, rejected: 0 }
}`;

const workloadSolution = String.raw`#[derive(Debug, PartialEq, Eq)]
struct WorkloadEvidence { visited: usize, accepted: usize, rejected: usize }

fn inspect_workload(items: &[u8]) -> WorkloadEvidence {
    let mut evidence = WorkloadEvidence { visited: 0, accepted: 0, rejected: 0 };
    for item in items {
        evidence.visited += 1;
        if *item >= b'a' && *item <= b'z' { evidence.accepted += 1; }
        else { evidence.rejected += 1; }
    }
    evidence
}`;

const workloadTests = String.raw`fn alternative_workload(items: &[u8]) -> WorkloadEvidence {
    let accepted = items.iter().filter(|item| item.is_ascii_lowercase()).count();
    WorkloadEvidence { visited: items.len(), accepted, rejected: items.len() - accepted }
}

#[test]
fn workload_contract_accepts_empty_unicode_safe_bytes() {
    for items in [&[][..], &[b'a', b'Z', b'0', b'z'][..], &[0, 255, b'b'][..]] {
        assert_eq!(inspect_workload(items), alternative_workload(items));
    }
}`;

const workloadBudgetStarter = String.raw`#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct WorkloadEvidence { visited: usize, accepted: usize, rejected: usize }

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Budget { max_visits: usize, max_rejections: usize }

fn fits_budget(_evidence: WorkloadEvidence, _budget: Budget) -> bool {
    false
}`;

const workloadBudgetSolution = String.raw`#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct WorkloadEvidence { visited: usize, accepted: usize, rejected: usize }

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Budget { max_visits: usize, max_rejections: usize }

fn fits_budget(evidence: WorkloadEvidence, budget: Budget) -> bool {
    evidence.visited <= budget.max_visits && evidence.rejected <= budget.max_rejections
}`;

const workloadBudgetTests = String.raw`fn alternative_budget(evidence: WorkloadEvidence, budget: Budget) -> bool {
    !(evidence.visited > budget.max_visits || evidence.rejected > budget.max_rejections)
}

#[test]
fn budget_contract_keeps_equality() {
    let cases = [
        (WorkloadEvidence { visited: 0, accepted: 0, rejected: 0 }, Budget { max_visits: 0, max_rejections: 0 }),
        (WorkloadEvidence { visited: 4, accepted: 2, rejected: 2 }, Budget { max_visits: 4, max_rejections: 2 }),
        (WorkloadEvidence { visited: 5, accepted: 2, rejected: 3 }, Budget { max_visits: 4, max_rejections: 3 }),
        (WorkloadEvidence { visited: 4, accepted: 1, rejected: 3 }, Budget { max_visits: 4, max_rejections: 2 }),
    ];
    for (evidence, budget) in cases { assert_eq!(fits_budget(evidence, budget), alternative_budget(evidence, budget)); }
}`;

const borrowStarter = String.raw`fn first_field<'a>(_line: &'a str) -> Option<&'a str> {
    None
}`;

const borrowSolution = String.raw`fn first_field<'a>(line: &'a str) -> Option<&'a str> {
    line.split_once('|').map(|(_, value)| value)
}`;

const borrowTests = String.raw`fn alternative_first_field<'a>(line: &'a str) -> Option<&'a str> {
    line.strip_prefix(line.split_once('|')?.0)?.strip_prefix('|')
}

#[test]
fn borrowed_stream_preserves_remainder() {
    let input = String::from("42|temperatura|żółć 🙂");
    let expected = Some("temperatura|żółć 🙂");
    assert_eq!(first_field(&input), expected);
    assert_eq!(alternative_first_field(&input), expected);
    let view = first_field(&input).unwrap();
    assert_eq!(view.as_ptr(), input.as_ptr().wrapping_add(3));
    assert_eq!(first_field("brak separatora"), None);
}`;

const borrowNormalizeStarter = String.raw`fn matching_views<'a>(lines: &'a [&'a str], prefix: &str) -> Vec<&'a str> {
    let _ = prefix;
    lines.to_vec()
}`;

const borrowNormalizeSolution = String.raw`fn matching_views<'a>(lines: &'a [&'a str], prefix: &str) -> Vec<&'a str> {
    lines.iter().copied().filter(|line| line.starts_with(prefix)).collect()
}`;

const borrowNormalizeTests = String.raw`fn alternative_views<'a>(lines: &'a [&'a str], prefix: &str) -> Vec<&'a str> {
    lines.iter().copied().filter_map(|line| line.strip_prefix(prefix).map(|_| line)).collect()
}

#[test]
fn borrowed_views_keep_order_duplicates_and_empty_result() {
    let lines = ["żółć", "rust", "rust", "終"];
    for prefix in ["rust", "ż", "x"] {
        assert_eq!(matching_views(&lines, prefix), alternative_views(&lines, prefix));
    }
}`;

const bufferStarter = String.raw`use std::io::{self, BufRead};

fn count_lines<R: BufRead>(mut reader: R, _scratch: &mut String) -> io::Result<usize> {
    let mut line = String::new();
    let mut count = 0;
    while reader.read_line(&mut line)? > 0 { count += 1; line.clear(); }
    Ok(count)
}`;

const bufferSolution = String.raw`use std::io::{self, BufRead};

fn count_lines<R: BufRead>(mut reader: R, scratch: &mut String) -> io::Result<usize> {
    let mut count = 0;
    loop {
        scratch.clear();
        if reader.read_line(scratch)? == 0 { break; }
        count += 1;
    }
    Ok(count)
}`;

const bufferTests = String.raw`use std::io::Cursor;

struct CallerScratchReader {
    inner: Cursor<&'static [u8]>,
    expected: *mut String,
}

impl std::io::Read for CallerScratchReader {
    fn read(&mut self, buf: &mut [u8]) -> io::Result<usize> {
        self.inner.read(buf)
    }
}

impl BufRead for CallerScratchReader {
    fn fill_buf(&mut self) -> io::Result<&[u8]> { self.inner.fill_buf() }
    fn consume(&mut self, amount: usize) { self.inner.consume(amount); }
    fn read_line(&mut self, buf: &mut String) -> io::Result<usize> {
        if (buf as *mut String) != self.expected {
            return Err(io::Error::new(io::ErrorKind::Other, "reader was not given caller scratch"));
        }
        self.inner.read_line(buf)
    }
}

fn observing_reader(input: &'static str, scratch: &mut String) -> CallerScratchReader {
    CallerScratchReader { inner: Cursor::new(input.as_bytes()), expected: scratch as *mut String }
}

fn alternative_count<R: BufRead>(mut reader: R, scratch: &mut String) -> io::Result<usize> {
    let mut count = 0;
    loop {
        scratch.clear();
        if reader.read_line(scratch)? == 0 { return Ok(count); }
        count += 1;
    }
}

#[test]
fn buffer_reuse_handles_eof_without_counting_the_last_empty_read() {
    for input in ["", "a\n", "a\nb\n", "żółć\nkoniec"] {
        let mut first = String::with_capacity(32);
        let mut second = String::with_capacity(32);
        assert_eq!(count_lines(Cursor::new(input.as_bytes()), &mut first).unwrap(), alternative_count(Cursor::new(input.as_bytes()), &mut second).unwrap());
    }
    let mut correct_scratch = String::new();
    assert_eq!(count_lines(Cursor::new("a\nb"), &mut correct_scratch).unwrap(), 2);
    assert!(correct_scratch.is_empty());
    let mut stale_scratch = String::from("stale");
    assert_eq!(count_lines(Cursor::new(""), &mut stale_scratch).unwrap(), 0);
    assert!(stale_scratch.is_empty());
    let mut stale_before_record = String::from("stale");
    assert_eq!(count_lines(Cursor::new("a\n"), &mut stale_before_record).unwrap(), 1);
    assert!(stale_before_record.is_empty());
    let mut observed_scratch = String::from("stale");
    assert_eq!(count_lines(observing_reader("a\nb", &mut observed_scratch), &mut observed_scratch).unwrap(), 2);
    assert!(observed_scratch.is_empty());
}`;

const bufferLimitStarter = String.raw`fn within_capacity(scratch: &String, limit: usize) -> bool {
    scratch.len() <= limit
}`;

const bufferLimitSolution = String.raw`fn within_capacity(scratch: &String, limit: usize) -> bool {
    scratch.capacity() <= limit
}`;

const bufferLimitTests = String.raw`fn alternative_capacity(scratch: &String, limit: usize) -> bool {
    !scratch.capacity().gt(&limit)
}

#[test]
fn capacity_contract_is_independent_of_current_text_length() {
    let mut scratch = String::with_capacity(16);
    scratch.push_str("x");
    assert_eq!(within_capacity(&scratch, 16), alternative_capacity(&scratch, 16));
    assert!(!within_capacity(&scratch, 8));
}`;

const decisionStarter = String.raw`#[derive(Debug, PartialEq, Eq)]
enum Decision { Keep, Investigate(&'static str) }

fn decide(_baseline: usize, _candidate: usize, _budget: usize) -> Decision {
    Decision::Investigate("not implemented")
}`;

const decisionSolution = String.raw`#[derive(Debug, PartialEq, Eq)]
enum Decision { Keep, Investigate(&'static str) }

fn decide(baseline: usize, candidate: usize, budget: usize) -> Decision {
    if candidate <= budget && candidate <= baseline { Decision::Keep }
    else if candidate > budget { Decision::Investigate("budget") }
    else { Decision::Investigate("regression") }
}`;

const decisionTests = String.raw`fn alternative_decide(baseline: usize, candidate: usize, budget: usize) -> Decision {
    match (candidate <= budget, candidate <= baseline) {
        (true, true) => Decision::Keep,
        (false, _) => Decision::Investigate("budget"),
        (true, false) => Decision::Investigate("regression"),
    }
}

#[test]
fn conditional_decision_names_the_failed_contract() {
    for (baseline, candidate, budget) in [(10, 10, 10), (10, 8, 9), (10, 11, 20), (10, 12, 9)] {
        assert_eq!(decide(baseline, candidate, budget), alternative_decide(baseline, candidate, budget));
    }
}`;

const decisionEvidenceStarter = String.raw`#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Evidence { baseline: usize, candidate: usize, budget: usize }

fn explain(_evidence: Evidence) -> &'static str {
    "unknown"
}`;

const decisionEvidenceSolution = String.raw`#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Evidence { baseline: usize, candidate: usize, budget: usize }

fn explain(evidence: Evidence) -> &'static str {
    if evidence.candidate <= evidence.budget && evidence.candidate <= evidence.baseline { "keep" }
    else { "investigate" }
}`;

const decisionEvidenceTests = String.raw`fn alternative_explain(evidence: Evidence) -> &'static str {
    (evidence.candidate <= evidence.budget && evidence.candidate <= evidence.baseline).then_some("keep").unwrap_or("investigate")
}

#[test]
fn evidence_interpretation_requires_both_budget_and_baseline() {
    for evidence in [
        Evidence { baseline: 10, candidate: 8, budget: 9 },
        Evidence { baseline: 10, candidate: 10, budget: 10 },
        Evidence { baseline: 10, candidate: 8, budget: 7 },
        Evidence { baseline: 10, candidate: 11, budget: 20 },
    ] { assert_eq!(explain(evidence), alternative_explain(evidence)); }
}`;

export const performanceEvidenceLessons: Lesson[] = appendPerformanceRecoverySteps([
  {
    id: "performance-measured-workload",
    moduleId: "performance-evidence",
    conceptIds: ["measured-workload-contract"],
    competencyIds: ["define-measured-workload"],
    prerequisites: ["property-metamorphic-transfer"],
    title: "Zdefiniuj workload, zanim go porównasz",
    subtitle:
      "Ustalisz wejście, obserwowalną pracę i granicę dowodu bez zależności od zegara.",
    minutes: 24,
    outcomes: [
      "Rozdzielisz workload, proxy kosztu i wynik funkcji.",
      "Zbudujesz deterministyczny opis odwiedzonych, zaakceptowanych i odrzuconych elementów.",
      "Rozpoznasz, dlaczego test równości granicznej powinien obejmować także mutanta.",
    ],
    steps: [
      choice(
        "workload-predict",
        "Najpierw kontrakt, potem liczby",
        "Co jest najmocniejszą podstawą powtarzalnego porównania dwóch implementacji?",
        [
          "Stałe wejście, jawna operacja, proxy i granice interpretacji",
          "Jedno odczytanie czasu ściennego na komputerze autora",
          "Średnia z nieopisanych wejść, aby ukryć przypadki graniczne",
        ],
        0,
        [
          "Tak: test wie, co wykonano i czego wynik dotyczy.",
          "Zegar wnosi szum środowiska i nie opisuje sam workloadu.",
          "Bez granic nie wiadomo, jaki zakres obejmuje dowód.",
        ],
      ),
      run(
        "workload-run",
        "Uruchom jawny workload",
        "Kod przechodzi po tej samej tablicy bajtów za każdym razem. Zwróć uwagę, że obserwujemy liczby elementów, a nie czas.",
        `fn inspect(items: &[u8]) -> (usize, usize) { (items.len(), items.iter().filter(|item| item.is_ascii_lowercase()).count()) }
fn main() { println!("{:?}", inspect(&[b'a', b'Z', b'b', b'0'])); }`,
        "(4, 2)\n",
      ),
      coding({
        id: "workload-gate",
        kind: "modify",
        title: "Zapisz obserwowalną pracę",
        prompt:
          "Uzupełnij `inspect_workload`. Odwiedź każdy bajt dokładnie raz; mały ASCII od a do z jest zaakceptowany, pozostałe bajty odrzucone. Zachowaj związek `visited = accepted + rejected`, także dla pustki.",
        code: workloadStarter,
        solution: workloadSolution,
        tests: workloadTests,
        gate: true,
      }),
      coding({
        id: "workload-budget-gate",
        kind: "apply",
        title: "Sprawdź budżet na granicy",
        prompt:
          "Zaimplementuj `fits_budget`. Wynik ma być prawdziwy przy równości limitów i fałszywy, gdy liczba wizyt lub odrzuceń przekracza swój limit.",
        code: workloadBudgetStarter,
        solution: workloadBudgetSolution,
        tests: workloadBudgetTests,
        gate: true,
      }),
      coding({
        id: "workload-blank",
        kind: "blank",
        title: "Blank page: własny workload",
        prompt:
          "Zaimplementuj od zera `#[derive(Debug, PartialEq, Eq)] struct WorkloadEvidence { visited: usize, accepted: usize, rejected: usize }` oraz `fn inspect_workload(items: &[u8]) -> WorkloadEvidence`. Każdy bajt a-z jest zaakceptowany, pozostałe odrzucone; `visited` ma równać się sumie obu liczników. Testy zawierają pustkę i przypadki graniczne.",
        solution: workloadSolution,
        tests: workloadTests,
      }),
      coding({
        id: "workload-recall",
        kind: "recall",
        title: "Retrieval: zakres dowodu",
        prompt:
          "Samodzielnie odtwórz `fn fits_budget(evidence: WorkloadEvidence, budget: Budget) -> bool` dla deterministycznego workloadu. Zachowaj równość jako sukces i nie używaj zegara ani losowości.",
        code: workloadBudgetStarter,
        solution: workloadBudgetSolution,
        tests: workloadBudgetTests,
      }),
    ],
    misconceptions: [
      "Czas ścienny z jednego uruchomienia jest stabilnym oracle.",
      "Proxy liczby odwiedzin jest tym samym co uniwersalna szybkość.",
      "Warunek `<` jest bezpieczniejszy od `<=`, bo zostawia margines.",
    ],
    transferTask:
      "Zapisz workload dla parsera rekordów: określ wejście, limit, proxy odwiedzin i osobno wynik poprawności.",
    evidenceGate:
      "Dwie bramki wymagają kontraktu dla pustki, granicy równości i kontrolowanego mutanta. workload-blank odtwarza ten sam zadany kontrakt inspect_workload od pustej kartki; nie jest transferem do nowej domeny.",
    sourceIds: ["performance-benchmarking-book"],
  },
  {
    id: "performance-borrowed-stream",
    moduleId: "performance-evidence",
    conceptIds: ["borrowed-stream-no-materialization"],
    competencyIds: ["preserve-borrowed-stream"],
    prerequisites: ["performance-measured-workload"],
    title: "Przepuść strumień bez materializacji tekstu",
    subtitle:
      "Pożyczysz widoki z wejścia i odróżnisz kontener referencji od kopii treści.",
    minutes: 26,
    outcomes: [
      "Zwrócisz pożyczony remainder bez tworzenia String.",
      "Zbudujesz leniwy wybór widoków zachowujący kolejność i duplikaty.",
      "Wskażesz granicę życia wejścia przy materializacji Vec<&str>.",
    ],
    steps: [
      choice(
        "borrow-predict",
        "Wybierz typ wyniku",
        "Parser dostaje `&str` i ma oddać fragment tego samego wejścia. Który typ wyraża brak materializacji treści?",
        ["Option<&str>", "Option<String>", "usize bez związku z wejściem"],
        0,
        [
          "Widok ma lifetime związany z pożyczonym wejściem.",
          "String może być poprawny, lecz tworzy własność i koszt kopii.",
          "Sam indeks nie przekazuje kontraktu życia tekstu.",
        ],
      ),
      run(
        "borrow-run",
        "Uruchom leniwy wybór",
        "`filter` i `map` tworzą opis potoku. Dopiero `collect` pobiera pasujące widoki.",
        `fn views<'a>(lines: &'a [&'a str]) -> Vec<&'a str> { lines.iter().copied().filter(|line| line.contains("Rust")).collect() }
fn main() { println!("{}", views(&["Rust", "inne", "Rust 🙂"]).len()); }`,
        "2\n",
      ),
      coding({
        id: "borrow-gate",
        kind: "modify",
        title: "Zwróć pożyczany remainder",
        prompt:
          "Uzupełnij `first_field`. Ma oddać fragment po pierwszym `|`, zachować dalsze separatory, Unicode i życie wejścia. Brak separatora daje `None`; nie używaj `to_owned`.",
        code: borrowStarter,
        solution: borrowSolution,
        tests: borrowTests,
        gate: true,
      }),
      coding({
        id: "borrow-stream-gate",
        kind: "apply",
        title: "Wybierz widoki w kolejności",
        prompt:
          "Zaimplementuj `matching_views`. Zwróć pożyczone linie zaczynające się od prefiksu, zachowaj duplikaty i kolejność, a przy braku dopasowań zwróć pusty Vec.",
        code: borrowNormalizeStarter,
        solution: borrowNormalizeSolution,
        tests: borrowNormalizeTests,
        gate: true,
      }),
      coding({
        id: "borrow-blank",
        kind: "blank",
        title: "Blank page: widok rekordów",
        prompt:
          "Napisz od zera `fn matching_views<'a>(lines: &'a [&'a str], prefix: &str) -> Vec<&'a str>`. Zwróć całe pożyczane napisy, które zaczynają się od `prefix` (prefiks); zachowaj kolejność i duplikaty. Testy sprawdzą Unicode, pustkę i mutanta używającego końca napisu.",
        solution: borrowNormalizeSolution,
        tests: borrowNormalizeTests,
      }),
      coding({
        id: "borrow-recall",
        kind: "recall",
        title: "Retrieval: pożyczany remainder",
        prompt:
          "Odtwórz implementację `first_field` z pamięci. Oddaj cały tekst po pierwszym `|`, zachowaj lifetime wejścia i sprawdź brak separatora.",
        code: borrowStarter,
        solution: borrowSolution,
        tests: borrowTests,
      }),
    ],
    misconceptions: [
      "`collect::<Vec<&str>>()` zawsze kopiuje treść każdego napisu.",
      "Pożyczany wynik może żyć dłużej niż wejście.",
      "`map` wykonuje wszystkie operacje od razu.",
    ],
    transferTask:
      "Zastosuj pożyczany filtr do strumienia logów i opisz, kiedy świadomie wybierzesz Vec<String>.",
    evidenceGate:
      "Obie bramki wymagają pożyczanego wyniku, kolejności, duplikatów i pustki; test mutanta sprawdza, czy nie odwrócisz separatora ani predykatu.",
    sourceIds: ["performance-rust-iterator"],
  },
  {
    id: "performance-bounded-buffer",
    moduleId: "performance-evidence",
    conceptIds: ["bounded-buffer-reuse"],
    competencyIds: ["reuse-bounded-buffer"],
    prerequisites: ["performance-borrowed-stream"],
    title: "Użyj ponownie jednego bufora roboczego",
    subtitle:
      "Przeczytasz rekordy przez BufRead, wyczyścisz scratch i sprawdzisz pojemność deterministycznym proxy.",
    minutes: 28,
    outcomes: [
      "Zastosujesz `read_line` na jednym przekazanym buforze.",
      "Rozróżnisz długość bieżącego tekstu od pojemności pamięci roboczej.",
      "Obsłużysz EOF bez dodatkowego rekordu.",
    ],
    steps: [
      choice(
        "buffer-predict",
        "Przewidź efekt clear",
        "Co zachowuje `String::clear()` w pętli czytającej kolejne linie?",
        [
          "Pojemność bufora, ale nie jego długość",
          "Treść i długość, więc następna linia się dopisze",
          "Nic; za każdym razem powstaje nowa alokacja",
        ],
        0,
        [
          "clear zeruje długość i pozostawia przydzieloną pojemność.",
          "Treść znika; bez clear read_line dopisywałby kolejne dane.",
          "To właśnie ponowne użycie istniejącego bufora jest celem.",
        ],
      ),
      run(
        "buffer-run",
        "Zobacz stały scratch",
        "Program używa jednego String i po każdym rekordzie go czyści. Liczba linii jest niezależna od chwilowej długości tekstu.",
        `use std::io::{BufRead, Cursor};
fn main() { let mut reader = Cursor::new("a\nb\n"); let mut line = String::new(); let mut count = 0; while reader.read_line(&mut line).unwrap() > 0 { count += 1; line.clear(); } println!("{count}"); }`,
        "2\n",
      ),
      coding({
        id: "buffer-gate",
        kind: "modify",
        title: "Czytaj przez przekazany bufor",
        prompt:
          "Napraw `count_lines`. Używaj wyłącznie `scratch` przekazanego przez wywołującego: czytaj, zwiększ licznik i wywołaj `clear()` przed kolejnym wierszem. Nie licz końcowego EOF jako rekordu.",
        code: bufferStarter,
        solution: bufferSolution,
        tests: bufferTests,
        gate: true,
      }),
      coding({
        id: "buffer-capacity-gate",
        kind: "apply",
        title: "Odczytaj proxy pojemności",
        prompt:
          "Uzupełnij `within_capacity`. Decyzja ma zależeć od pojemności scratch, a nie od jego bieżącej długości; równość limitu jest akceptowana. To odczyt bieżącej pojemności, nie mechanizm blokujący wcześniejszą alokację ani twardy limit długości rekordu.",
        code: bufferLimitStarter,
        solution: bufferLimitSolution,
        tests: bufferLimitTests,
        gate: true,
      }),
      coding({
        id: "buffer-blank",
        kind: "blank",
        title: "Od pustej kartki: ponownie użyty bufor",
        prompt:
          "Zaimplementuj od zera `fn count_lines<R: BufRead>(reader: R, scratch: &mut String) -> io::Result<usize>`. Przed każdym `read_line` wywołaj `clear` na przekazanym scratch, zwiększ licznik dla odczytu większego od zera i zakończ przy EOF (0 bajtów), pozostawiając scratch pusty. Fixture obejmuje EOF i ostatni wiersz bez LF.",
        solution: bufferSolution,
        tests: bufferTests,
      }),
      coding({
        id: "buffer-recall",
        kind: "recall",
        title: "Retrieval: pojemność bufora",
        prompt:
          "Odtwórz `fn within_capacity(scratch: &String, limit: usize) -> bool`. Decyzja ma zależeć od `capacity`, a nie od długości tekstu; test jest deterministyczny i nie używa zegara.",
        code: bufferLimitStarter,
        solution: bufferLimitSolution,
        tests: bufferLimitTests,
      }),
    ],
    misconceptions: [
      "`clear` zmniejsza pojemność do zera.",
      "EOF jest kolejnym pustym rekordem.",
      "Długość tekstu jest tym samym co przydzielona pojemność.",
    ],
    transferTask:
      "Dodaj limit długości pojedynczego rekordu do czytnika Log Analyzer i wyjaśnij, jak test odróżnia limit od pojemności scratch.",
    evidenceGate:
      "Bramki sprawdzają ponowne użycie przekazanego bufora, EOF z i bez końcowego LF oraz rozróżnienie len od capacity.",
    sourceIds: [
      "performance-bufread",
      "performance-string-clear",
      "performance-vec-capacity",
    ],
  },
  {
    id: "performance-evidence-decisions",
    moduleId: "performance-evidence",
    conceptIds: ["conditional-performance-decision"],
    competencyIds: ["interpret-performance-evidence"],
    prerequisites: ["performance-bounded-buffer"],
    title: "Zinterpretuj dowód i podejmij decyzję",
    subtitle:
      "Połączysz baseline, budżet i proxy w decyzję, która jasno podaje zakres oraz powód odrzucenia.",
    minutes: 25,
    outcomes: [
      "Zapiszesz warunek keep jako koniunkcję niezależnych wymagań.",
      "Rozróżnisz regresję od przekroczenia budżetu.",
      "Przeniesiesz dowód do nowej domeny bez obietnicy globalnej poprawy.",
    ],
    steps: [
      choice(
        "decision-predict",
        "Wybierz ostrożną decyzję",
        "Candidate ma mniej odwiedzin niż baseline, ale przekracza ustalony budżet. Jaki wynik zachowuje zakres dowodu?",
        [
          "Investigate z powodem budget",
          "Keep, bo jest szybciej względem baseline",
          "Keep, bo każdy proxy wystarczy osobno",
        ],
        0,
        [
          "Niespełniony budżet jest osobnym warunkiem i wymaga dalszej obserwacji.",
          "Mniejszy jeden proxy nie unieważnia pozostałych warunków.",
          "Kontrakt decyzji wymaga koniunkcji, nie pojedynczej przesłanki.",
        ],
      ),
      run(
        "decision-run",
        "Uruchom decyzję warunkową",
        "Równość baseline, candidate i budżetu przechodzi, bo kontrakt używa granicy `<=`.",
        `fn keep(baseline: usize, candidate: usize, budget: usize) -> bool { candidate <= baseline && candidate <= budget }
fn main() { println!("{} {}", keep(10, 10, 10), keep(10, 11, 10)); }`,
        "true false\n",
      ),
      coding({
        id: "decision-gate",
        kind: "modify",
        title: "Zwróć powód warunkowej decyzji",
        prompt:
          "Uzupełnij `decide`. `Keep` wymaga candidate <= budget i candidate <= baseline. Najpierw raportuj `budget`, potem `regression`; równość obu granic jest sukcesem.",
        code: decisionStarter,
        solution: decisionSolution,
        tests: decisionTests,
        gate: true,
      }),
      coding({
        id: "decision-evidence-gate",
        kind: "apply",
        title: "Zinterpretuj pełny evidence record",
        prompt:
          "Zaimplementuj `explain`. Zwróć `keep` tylko po spełnieniu obu warunków; w każdym innym przypadku zwróć `investigate`. Nie wyciągaj wniosku z samego baseline.",
        code: decisionEvidenceStarter,
        solution: decisionEvidenceSolution,
        tests: decisionEvidenceTests,
        gate: true,
      }),
      coding({
        id: "decision-blank",
        kind: "blank",
        title: "Blank page: decyzja dla nowej metryki",
        prompt:
          'Zaimplementuj `#[derive(Debug, PartialEq, Eq)] enum Decision { Keep, Investigate(&\'static str) }` oraz `fn decide(baseline: usize, candidate: usize, budget: usize) -> Decision`. Zwróć `Keep` tylko przy spełnieniu obu warunków `candidate <= budget` i `candidate <= baseline`; w przeciwnym razie użyj `Investigate("budget")` dla przekroczenia budżetu, a `Investigate("regression")` dla regresji. Budget ma priorytet, gdy oba warunki zawodzą; równość jest sukcesem.',
        solution: decisionSolution,
        tests: decisionTests,
      }),
      coding({
        id: "decision-recall",
        kind: "recall",
        title: "Retrieval: proxy nie jest obietnicą",
        prompt:
          "Odtwórz `explain` z pamięci. Uzasadnij w kodzie, że decyzja jest warunkowa i oparta na pełnym rekordzie dowodu.",
        code: decisionEvidenceStarter,
        solution: decisionEvidenceSolution,
        tests: decisionEvidenceTests,
      }),
    ],
    misconceptions: [
      "Mniejsza liczba odwiedzin zawsze oznacza szybszy program.",
      "Spełnienie jednego limitu wystarcza do decyzji Keep.",
      "Wynik proxy można przedstawić jako gwarancję dla wszystkich workloadów.",
    ],
    transferTask:
      "Napisz krótką decyzję dla dwóch wersji agregatora logów, podając workload, proxy, baseline, budżet i powód ewentualnego investigate.",
    evidenceGate:
      "Bramki wymagają rozróżnienia budget/regression, obsługi równości i sprawdzenia pełnego rekordu. Interpretacja pozostaje warunkowa dla zdefiniowanego workloadu.",
    sourceIds: ["performance-benchmarking-book"],
  },
  {
    id: "performance-evidence-investigation",
    practiceOnly: true,
    moduleId: "performance-evidence",
    conceptIds: ["conditional-performance-decision"],
    competencyIds: ["interpret-performance-evidence"],
    prerequisites: ["performance-evidence-decisions"],
    title: "Zaplanuj własne badanie wydajności",
    subtitle:
      "Ułożysz własny, nieuzupełniony plan badania: workload, hipotezę, wybór narzędzia i ostrożną decyzję; opis nie obiecuje czasu nauki ani czasu wykonania.",
    minutes: 18,
    outcomes: [
      "Przewidzisz, jaki wynik i ryzyko chcesz rozstrzygnąć przed obserwacją.",
      "Dobierzesz narzędzie do pytania, rozdzielając poprawność od kosztu obserwacji.",
      "Odczytasz przygotowany model jako zakres dowodu, a nie obietnicę dla każdej maszyny.",
      "Zostawisz własny plan z hipotezą, kontrprzykładem i decyzją do dalszej weryfikacji.",
    ],
    steps: [
      practiceChoice({
        id: "performance-investigation-predict",
        kind: "predict",
        title: "Najpierw przewidź wynik",
        prompt:
          "Masz podstawy programowania i chcesz porównać dwa warianty tej samej operacji. Co zapisujesz przed wybraniem narzędzia?",
        choices: [
          {
            id: "same-workload",
            label:
              "Wejście, operację, obserwowalny wynik, hipotezę i granicę tego, czego wynik nie rozstrzyga.",
          },
          {
            id: "clock-first",
            label:
              "Jedną liczbę sekund z mojego komputera, a workload dopiero po obserwacji.",
          },
          {
            id: "tool-first",
            label:
              "Nazwę narzędzia bez opisu danych, wyniku i możliwego kontrprzykładu.",
          },
        ],
        correct: "same-workload",
        explanations: {
          "same-workload":
            "Hipoteza i granice przed obserwacją chronią przed dopasowaniem opisu do pojedynczej liczby.",
          "clock-first":
            "Czas z jednej maszyny nie definiuje workloadu ani zakresu wniosku.",
          "tool-first":
            "Narzędzie odpowiada na pytanie dopiero wtedy, gdy pytanie i wynik są jawne.",
        },
        evidenceKind: "prediction",
      }),
      practiceChoice({
        id: "performance-investigation-tool-choice",
        kind: "explain",
        title: "Dobierz narzędzie do ryzyka",
        prompt:
          "Który wybór najlepiej łączy pytanie z ryzykiem, które chcesz rozstrzygnąć?",
        choices: [
          {
            id: "risk-tool",
            label:
              "Najpierw test poprawności dla kontraktu, potem narzędzie obserwacji kosztu; każde ma osobny wynik.",
          },
          {
            id: "benchmark-proof",
            label:
              "Benchmark sam zastępuje test poprawności, bo szybszy wariant musi być prawidłowy.",
          },
          {
            id: "random-tool",
            label:
              "Wybieram najgłośniejsze narzędzie i zmieniam workload, aż wynik będzie interesujący.",
          },
        ],
        correct: "risk-tool",
        explanations: {
          "risk-tool":
            "Poprawność i koszt są różnymi pytaniami; narzędzie nie zastępuje kontraktu funkcji.",
          "benchmark-proof":
            "Równość wyników i pomiar kosztu wymagają osobnych obserwacji.",
          "random-tool":
            "Zmiana workloadu po fakcie niszczy porównywalność i selektywność wniosku.",
        },
        evidenceKind: "exposure",
      }),
      practiceChoice({
        id: "performance-investigation-reference-exposure",
        kind: "observe",
        title: "Obejrzyj model referencyjny",
        prompt:
          "Przygotowany przykład ma 2048 rekordów. Z przepisu, a nie z pomiaru, wynikają literalne oczekiwania: bez filtra INFO 1171, WARN 588, ERROR 196, malformed 93; z filtrem ERROR INFO 0, WARN 0, ERROR 196, malformed 93. W sześciu rekordach replay bez filtra to INFO 1, WARN 1, ERROR 2, malformed 2, a z filtrem ERROR INFO 0, WARN 0, ERROR 2, malformed 2. To oczekiwania statyczne, nie czasy ani wynik mojego programu. Co jest właściwą obserwacją?",
        choices: [
          {
            id: "scope",
            label:
              "To literalne oczekiwania z przepisu i sposób zawężenia pytania; nie są obserwowanym czasem ani dowodem poprawności mojego programu.",
          },
          {
            id: "measurement",
            label:
              "Sama ekspozycja na przykład dowodzi, że mój wariant jest szybszy.",
          },
          {
            id: "universal",
            label:
              "Wynik modelu jest uniwersalny, więc nie potrzebuję własnego workloadu ani alternatywy.",
          },
        ],
        correct: "scope",
        explanations: {
          scope:
            "Przykład uczy struktury dowodu; własny plan musi zachować własny workload i kontrprzykład.",
          measurement:
            "Ekspozycja nie tworzy pomiaru ani niezależnego dowodu własnego kodu.",
          universal:
            "Każdy wniosek pozostaje związany z zadeklarowanym workloadem i narzędziem.",
        },
        evidenceKind: "exposure",
      }),
      practiceChoice({
        id: "performance-investigation-run-model",
        kind: "explain",
        title: "Wyjaśnij statyczny model",
        prompt:
          "Baseline to istniejąca implementacja, a candidate to badany wariant; oba porównuje się na tym samym workloadzie, a niezależne literalne oracle sprawdza wynik. Które zdanie poprawnie opisuje trzy decyzje: keep, investigate-performance i inconclusive, bez wymyślania czasów?",
        choices: [
          {
            id: "bounded",
            label:
              "Oracle sprawdza wynik; keep wymaga pełnego dowodu, investigate-performance sygnalizuje problem, a inconclusive zostaje przy niepełnym lub nierozdzielonym dowodzie.",
          },
          {
            id: "speed",
            label:
              "Niższa liczba w jednej obserwacji wystarcza do keep bez sprawdzania wyniku i zakresu.",
          },
          {
            id: "timed",
            label:
              "Model obiecuje czas działania w sekundach dla każdego komputera i wejścia.",
          },
        ],
        correct: "bounded",
        explanations: {
          bounded:
            "Baseline, candidate i oddzielne oracle porządkują dowód; trzy decyzje opisują zakres bez wymyślania czasów.",
          speed:
            "Pojedyncza liczba nie zastępuje poprawności, porównywalności ani przedziału dowodu.",
          timed:
            "Model nie jest obietnicą czasu ani przenośności wyniku poza zadeklarowany kontrakt.",
        },
        evidenceKind: "exposure",
      }),
      practicePacket({
        id: "performance-investigation-own-packet",
        title: "Zostaw własny plan badania",
        prompt: [
          "Zostaw nieuzupełniony plan własnego badania. Nie uruchamiaj w nim Cargo ani narzędzia pomiarowego i nie wpisuj zmyślonych liczb.",
          "",
          "Zapisz inny niż referencyjny workload i jego selektywność, falsyfikowalną hipotezę, ryzyko stojące za wyborem narzędzia, niezależne literalne oracle, krótki replay lub kontrprzykład, alternatywę, miejsce na odpowiedź recenzenta, samoocenę oraz decyzję keep / investigate-performance / inconclusive z zakresem.",
          "",
          "Czytanie modelu i planowanie własnego doświadczenia nie sprawdza mojego programu, nie jest automatyczną oceną i nie daje samodzielnego zaliczenia.",
        ].join("\n"),
        criteria: [
          "workload jest inny niż referencyjny i ma jawne granice oraz selektywność",
          "hipoteza jest falsyfikowalna, a ryzyko wyjaśnia wybór narzędzia",
          "oracle jest niezależny od badanej implementacji i zawiera replay lub kontrprzykład",
          "plan zachowuje alternatywę, miejsce na odpowiedź recenzenta i samoocenę",
          "decyzja ma jedną z trzech nazw i nie obiecuje wyniku poza workloadem",
        ],
      }),
      practiceChoice({
        id: "performance-investigation-recall",
        kind: "recall",
        title: "Przypomnij granicę dowodu",
        prompt:
          "Które zdanie zachowuje sens całego badania po zakończeniu tej samej sesji?",
        choices: [
          {
            id: "bounded-recall",
            label:
              "Wynik opisuje konkretny workload i narzędzie; przy braku rozdzielenia poprawności od kosztu zostawiam decyzję do investigate albo inconclusive.",
          },
          {
            id: "keep-recall",
            label:
              "Każdy interesujący wynik należy nazwać keep, nawet jeśli oracle i workload są niepełne.",
          },
          {
            id: "duration-recall",
            label:
              "Plan powinien obiecywać czas wykonania w sekundach i zastąpić test poprawności.",
          },
        ],
        correct: "bounded-recall",
        explanations: {
          "bounded-recall":
            "Zakres, oracle i ostrożna decyzja są ważniejsze niż atrakcyjna pojedyncza liczba.",
          "keep-recall":
            "keep wymaga kompletnego, poprawnego dowodu w zadeklarowanym zakresie.",
          "duration-recall":
            "Plan nie jest obietnicą czasu i nie zastępuje sprawdzenia poprawności.",
        },
        evidenceKind: "recall",
      }),
    ],
    misconceptions: [
      "Benchmark lub pojedynczy wynik pomiaru zastępuje niezależny oracle poprawności.",
      "Przykład referencyjny dowodzi własnego programu i nie wymaga własnego workloadu.",
      "Decyzja keep jest właściwa zawsze, gdy liczba wygląda korzystnie.",
    ],
    transferTask:
      "Uzupełnij własny plan innym workloadem, literalnym oracle i decyzją ograniczoną do tego workloadu; nie wpisuj pomiarów bez rzeczywistej obserwacji.",
    evidenceGate:
      "To opcjonalna praktyka planowania i samooceny; nie tworzy nowej bramki ani samodzielnego zaliczenia.",
    sourceIds: ["performance-benchmarking-book", "profile-criterion"],
  },
]);

export const performanceEvidenceReviewExercises: Record<string, LessonStep> = {
  "measured-workload-contract": coding({
    id: "review-performance-workload",
    kind: "apply",
    title: "Powtórka: kontrakt budżetu",
    prompt:
      "Zaimplementuj `fn fits_budget(evidence: WorkloadEvidence, budget: Budget) -> bool`: zaakceptuj workload przy równości limitów i odrzuć go po przekroczeniu liczby wizyt lub odrzuceń. Test obejmuje pustkę, równość i mutanta z ostrzejszym operatorem.",
    code: workloadBudgetStarter,
    solution: workloadBudgetSolution,
    tests: workloadBudgetTests,
  }),
  "borrowed-stream-no-materialization": coding({
    id: "review-performance-borrow",
    kind: "apply",
    title: "Powtórka: pożyczane zdarzenia",
    prompt:
      "Zwróć pożyczane wpisy zaczynające się od prefiksu. Zachowaj kolejność i duplikaty oraz odrzuć mutanta kończącego się prefiksem.",
    code: borrowNormalizeStarter,
    solution: borrowNormalizeSolution,
    tests: borrowNormalizeTests,
  }),
  "bounded-buffer-reuse": coding({
    id: "review-performance-buffer",
    kind: "apply",
    title: "Powtórka: jeden scratch",
    prompt:
      "Napraw `count_lines`, używając przekazanego scratch i czyszcząc go między rekordami. Fixture z Cursor nie mierzy czasu i rozpoznaje brak EOF.",
    code: bufferStarter,
    solution: bufferSolution,
    tests: bufferTests,
  }),
  "conditional-performance-decision": coding({
    id: "review-performance-decision",
    kind: "apply",
    title: "Powtórka: decyzja z powodem",
    prompt:
      "Uzupełnij `decide`, sprawdzając oba warunki i rozróżniając powód budżetu od regresji. Równość ma być poprawna.",
    code: decisionStarter,
    solution: decisionSolution,
    tests: decisionTests,
  }),
};

export const performanceEvidenceModule: CourseModule = addPerformanceRecoveryRefs({
  id: "performance-evidence",
  title: "Performance Evidence: workload, pamięć i decyzje",
  whyItMatters:
    "Wydajność jest użyteczna dopiero wtedy, gdy wiesz, jaki workload mierzysz, jaki koszt obserwujesz i jak daleko sięga dowód. Zbudujesz deterministyczne proxy dla pożyczanego strumienia i ponownie używanego bufora roboczego, a następnie podejmiesz decyzję warunkową.",
  capabilities: performanceEvidenceCompetencies.map((item) => item.title),
  prerequisites: ["property-contracts"],
  lessonIds: performanceEvidenceLessons.map((lesson) => lesson.id),
  exitGate: [
    "Opiszesz workload przez wejście, operację, proxy i granice interpretacji bez wall-clock pass/fail.",
    "Przetworzysz dane przez pożyczane widoki i jeden czyszczony bufor, zachowując kolejność, pustkę i EOF.",
    "Zwrócisz decyzję Keep albo Investigate z powodem, gdy warunek baseline lub budżetu nie jest spełniony.",
  ],
  projectConnection:
    "Wnioski przeniesiesz do Log Analyzer: parser może pożyczać komunikat, czytnik może używać jednego scratch, a raport o proxy musi podawać workload i zakres dowodu zamiast obiecywać uniwersalną szybkość.",
  assessmentId: "performance-evidence-decisions/decision-blank",
  gateCriteria: [
    {
      id: "performance-workload-gate",
      label: "Workload ma jawne granice i poprawnie klasyfikuje każdy element.",
      taskRefs: [
        { lessonId: "performance-measured-workload", stepId: "workload-gate" },
        { lessonId: "performance-measured-workload", stepId: "workload-blank" },
      ],
    },
    {
      id: "performance-budget-gate",
      label: "Budżet akceptuje równość i odrzuca przekroczenie każdego limitu.",
      taskRefs: [
        {
          lessonId: "performance-measured-workload",
          stepId: "workload-budget-gate",
        },
        {
          lessonId: "performance-measured-workload",
          stepId: "workload-recall",
        },
      ],
    },
    {
      id: "performance-borrow-gate",
      label: "Parser zwraca remainder jako widok bez materializacji treści.",
      taskRefs: [
        { lessonId: "performance-borrowed-stream", stepId: "borrow-gate" },
        { lessonId: "performance-borrowed-stream", stepId: "borrow-recall" },
      ],
    },
    {
      id: "performance-stream-gate",
      label: "Pożyczany filtr zachowuje kolejność, duplikaty i pustkę.",
      taskRefs: [
        {
          lessonId: "performance-borrowed-stream",
          stepId: "borrow-stream-gate",
        },
        { lessonId: "performance-borrowed-stream", stepId: "borrow-blank" },
      ],
    },
    {
      id: "performance-buffer-gate",
      label: "Czytnik używa jednego bufora i nie liczy EOF jako rekordu.",
      taskRefs: [
        { lessonId: "performance-bounded-buffer", stepId: "buffer-gate" },
        { lessonId: "performance-bounded-buffer", stepId: "buffer-blank" },
      ],
    },
    {
      id: "performance-capacity-gate",
      label: "Proxy rozróżnia długość tekstu od pojemności scratch.",
      taskRefs: [
        {
          lessonId: "performance-bounded-buffer",
          stepId: "buffer-capacity-gate",
        },
        { lessonId: "performance-bounded-buffer", stepId: "buffer-recall" },
      ],
    },
    {
      id: "performance-decision-gate",
      label:
        "Decyzja rozróżnia przekroczenie budżetu od regresji i obsługuje równość.",
      taskRefs: [
        { lessonId: "performance-evidence-decisions", stepId: "decision-gate" },
        {
          lessonId: "performance-evidence-decisions",
          stepId: "decision-blank",
        },
      ],
    },
    {
      id: "performance-interpretation-gate",
      label: "Interpretacja wymaga jednocześnie baseline i budżetu.",
      taskRefs: [
        {
          lessonId: "performance-evidence-decisions",
          stepId: "decision-evidence-gate",
        },
        {
          lessonId: "performance-evidence-decisions",
          stepId: "decision-recall",
        },
      ],
    },
  ],
});
