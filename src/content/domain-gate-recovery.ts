import type { LessonStep } from "@/domain/types";

/** Authored recovery tasks keep domain-specific gates reachable after assistance. */
export const boxTreeSummaryTransfer: LessonStep = {
  id: "box-tree-summary-transfer",
  kind: "blank",
  title: "Przenieś liście drzewa z Box",
  prompt:
    "Napisz od zera `enum SummaryTree<T> { Empty, Leaf(T), Branch(Box<SummaryTree<T>>, Box<SummaryTree<T>>) }` oraz `fn collect_leaves<T>(tree: SummaryTree<T>) -> Vec<T>`. Box przerywa rekurencję rozmiaru typu. Funkcja zużywa drzewo i zwraca wyłącznie wartości liści, od lewej do prawej, zachowując duplikaty i własność każdej oryginalnej wartości. Empty nie dodaje elementu, także wewnątrz Branch. Nie wymagaj Copy ani Clone i nie twórz wartości zastępczych. Testy używają małych drzew, niekopiowalnych tokenów i String z porównaniem adresu bufora; nie ma wymagania obsługi dowolnej głębokości bez rekurencji.",
  solution: `enum SummaryTree<T> {
    Empty,
    Leaf(T),
    Branch(Box<SummaryTree<T>>, Box<SummaryTree<T>>),
}

fn collect_leaves<T>(tree: SummaryTree<T>) -> Vec<T> {
    match tree {
        SummaryTree::Empty => Vec::new(),
        SummaryTree::Leaf(value) => vec![value],
        SummaryTree::Branch(left, right) => {
            let mut values = collect_leaves(*left);
            values.extend(collect_leaves(*right));
            values
        }
    }
}`,
  evaluator: {
    kind: "tests",
    tests: `#[test]
fn collects_empty_single_and_nested_leaves_in_order() {
    assert_eq!(collect_leaves::<i32>(SummaryTree::Empty), Vec::<i32>::new());
    assert_eq!(collect_leaves(SummaryTree::Leaf(7)), vec![7]);
    let tree = SummaryTree::Branch(
        Box::new(SummaryTree::Branch(Box::new(SummaryTree::Leaf(2)), Box::new(SummaryTree::Empty))),
        Box::new(SummaryTree::Branch(Box::new(SummaryTree::Leaf(9)), Box::new(SummaryTree::Leaf(2)))),
    );
    assert_eq!(collect_leaves(tree), vec![2, 9, 2]);
}

#[test]
fn transfers_non_clone_leaf_values_and_their_original_buffers() {
    struct Token(String);
    let first = Token(String::from("żółć 🙂"));
    let second = Token(String::from("drugi liść"));
    let pointers = (first.0.as_ptr(), second.0.as_ptr());
    let tree = SummaryTree::Branch(Box::new(SummaryTree::Leaf(first)), Box::new(SummaryTree::Leaf(second)));
    let values = collect_leaves(tree);
    assert_eq!(values.len(), 2);
    assert_eq!(values[0].0, "żółć 🙂");
    assert_eq!(values[1].0, "drugi liść");
    assert_eq!((values[0].0.as_ptr(), values[1].0.as_ptr()), pointers);
}`,
  },
  hints: [
    "Dopasuj trzy warianty enumu; przy Branch otwórz oba Box przez przeniesienie ich zawartości.",
    "Najpierw zbierz lewy wynik, potem dołącz prawy. Nie dodawaj ograniczenia Clone do T.",
  ],
  evidenceKind: "assessment",
  evidenceGate: true,
  evidence: {
    version: 1,
    conceptIds: ["box-recursive"],
    codingTaskId: "box/recursive-tree-leaves-v1",
  },
};

export const publicationReportTransfer: LessonStep = {
  id: "loom-evidence-publication-report-transfer",
  kind: "blank",
  title: "Sprawdź każdą publikację w raporcie",
  prompt:
    "Zdefiniuj `enum Publication { Pending, Value(usize), Contradiction }`, `struct PublicationReport<'a> { expected: usize, outcomes: &'a [Publication] }` oraz `fn assert_publication_reports(reports: &[PublicationReport<'_>])`. Funkcja zwraca (), a błędny raport odrzuca asercją. Partia raportów ma być niepusta. Osobno każdy raport musi mieć niepuste outcomes, co najmniej jedno Value równe jego expected, żadnego Contradiction i żadnego Value o innej wartości. Pending może współistnieć z poprawnym Value, ale same Pending są nierozstrzygające. Poprawny raport nie może ukryć wadliwego sąsiada. Testy używają catch_unwind. To ocena danych z małego modelu, nie uruchomienie Loom ani dowód całego programu.",
  solution: `enum Publication { Pending, Value(usize), Contradiction }

struct PublicationReport<'a> {
    expected: usize,
    outcomes: &'a [Publication],
}

fn assert_publication_reports(reports: &[PublicationReport<'_>]) {
    assert!(!reports.is_empty());
    for report in reports {
        assert!(!report.outcomes.is_empty());
        let mut published = false;
        for outcome in report.outcomes {
            match outcome {
                Publication::Pending => {},
                Publication::Value(value) => {
                    assert_eq!(*value, report.expected);
                    published = true;
                },
                Publication::Contradiction => panic!("sprzeczny wynik modelu"),
            }
        }
        assert!(published);
    }
}`,
  evaluator: {
    kind: "tests",
    tests: `#[test]
fn accepts_each_expected_payload_with_optional_pending_outcomes() {
    assert_publication_reports(&[
        PublicationReport { expected: 0, outcomes: &[Publication::Pending, Publication::Value(0)] },
        PublicationReport { expected: usize::MAX, outcomes: &[Publication::Value(usize::MAX), Publication::Value(usize::MAX)] },
    ]);
}

#[test]
fn rejects_empty_inconclusive_wrong_and_contradictory_reports() {
    assert!(std::panic::catch_unwind(|| assert_publication_reports(&[])).is_err());
    let cases: &[&[Publication]] = &[
        &[],
        &[Publication::Pending],
        &[Publication::Value(41)],
        &[Publication::Value(42), Publication::Value(41)],
        &[Publication::Value(42), Publication::Contradiction],
    ];
    for outcomes in cases {
        assert!(std::panic::catch_unwind(|| assert_publication_reports(&[
            PublicationReport { expected: 42, outcomes },
        ])).is_err());
    }
}

#[test]
fn a_valid_sibling_cannot_hide_an_invalid_publication_report() {
    for outcomes in [&[][..], &[Publication::Pending][..], &[Publication::Value(8)][..], &[Publication::Contradiction][..]] {
        assert!(std::panic::catch_unwind(|| assert_publication_reports(&[
            PublicationReport { expected: 7, outcomes: &[Publication::Value(7)] },
            PublicationReport { expected: 7, outcomes },
        ])).is_err());
    }
}`,
  },
  hints: [
    "Warunki sprawdzaj dla każdego raportu osobno, nie tylko raz dla całej partii.",
    "Value ma jednocześnie potwierdzić zgodność payloadu i obecność rozstrzygającego wyniku; Pending nie jest takim potwierdzeniem.",
  ],
  evidenceKind: "assessment",
  evidenceGate: true,
  evidence: {
    version: 1,
    conceptIds: ["loom-evidence"],
    codingTaskId: "memory-ordering/publication-report-batch-v1",
  },
};

export const scoreRoundTransfer: LessonStep = {
  id: "guess-round-score-transfer",
  kind: "blank",
  title: "Rozlicz rundę zbierania punktów",
  prompt:
    "Zaprojektuj inną ograniczoną rundę. Zdefiniuj porównywalne Debug, PartialEq i Eq `enum RoundError { Target, Attempts, Finished, Points }` i `enum RoundStatus { Playing, Won, Lost }` oraz `struct ScoreRound`. `ScoreRound::new(target: u16, attempts: u8) -> Result<Self, RoundError>` sprawdza najpierw target 1..=100, potem attempts 1..=10; zaczyna od sumy 0 i Playing. `play(&mut self, points: u8) -> Result<RoundStatus, RoundError>` najpierw odrzuca zakończoną rundę przez Finished, potem points spoza 0..=10 przez Points. Błąd nie zmienia stanu. Poprawny ruch dodaje punkty i zużywa jedną próbę. Suma co najmniej target daje Won, także w ostatniej próbie; inaczej brak prób daje Lost, a pozostała runda Playing. Udostępnij `total(&self) -> u16`, `remaining(&self) -> u8` i `status(&self) -> RoundStatus`. Status można uczynić Copy. Po Won albo Lost kolejne play ma zwracać Finished i zachować sumę oraz licznik. Granice kontraktu ograniczają sumę do 100, więc nie potrzebujesz arytmetyki zawijającej.",
  solution: `#[derive(Debug, PartialEq, Eq)]
enum RoundError { Target, Attempts, Finished, Points }

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum RoundStatus { Playing, Won, Lost }

struct ScoreRound { target: u16, remaining: u8, total: u16, status: RoundStatus }

impl ScoreRound {
    fn new(target: u16, attempts: u8) -> Result<Self, RoundError> {
        if !(1..=100).contains(&target) { return Err(RoundError::Target); }
        if !(1..=10).contains(&attempts) { return Err(RoundError::Attempts); }
        Ok(Self { target, remaining: attempts, total: 0, status: RoundStatus::Playing })
    }
    fn play(&mut self, points: u8) -> Result<RoundStatus, RoundError> {
        if self.status != RoundStatus::Playing { return Err(RoundError::Finished); }
        if points > 10 { return Err(RoundError::Points); }
        self.total += u16::from(points);
        self.remaining -= 1;
        self.status = if self.total >= self.target { RoundStatus::Won }
            else if self.remaining == 0 { RoundStatus::Lost }
            else { RoundStatus::Playing };
        Ok(self.status)
    }
    fn total(&self) -> u16 { self.total }
    fn remaining(&self) -> u8 { self.remaining }
    fn status(&self) -> RoundStatus { self.status }
}`,
  evaluator: {
    kind: "tests",
    tests: `#[test]
fn validates_configuration_and_preserves_state_after_bad_points() {
    assert_eq!(ScoreRound::new(0, 0).map(|_| ()), Err(RoundError::Target));
    assert_eq!(ScoreRound::new(101, 1).map(|_| ()), Err(RoundError::Target));
    assert_eq!(ScoreRound::new(1, 0).map(|_| ()), Err(RoundError::Attempts));
    assert_eq!(ScoreRound::new(1, 11).map(|_| ()), Err(RoundError::Attempts));
    let mut round = ScoreRound::new(100, 10).unwrap();
    assert_eq!(round.status(), RoundStatus::Playing);
    assert_eq!(round.play(11), Err(RoundError::Points));
    assert_eq!((round.total(), round.remaining()), (0, 10));
    assert_eq!(round.status(), RoundStatus::Playing);
    assert_eq!(round.play(0), Ok(RoundStatus::Playing));
    assert_eq!((round.total(), round.remaining()), (0, 9));
}

#[test]
fn accumulates_points_and_awards_win_before_last_attempt_loss() {
    let mut round = ScoreRound::new(9, 2).unwrap();
    assert_eq!(round.play(4), Ok(RoundStatus::Playing));
    assert_eq!((round.total(), round.remaining()), (4, 1));
    assert_eq!(round.play(5), Ok(RoundStatus::Won));
    assert_eq!((round.total(), round.remaining()), (9, 0));
    assert_eq!(round.play(255), Err(RoundError::Finished));
    assert_eq!(round.play(0), Err(RoundError::Finished));
    assert_eq!((round.total(), round.remaining(), round.status()), (9, 0, RoundStatus::Won));
    let mut early = ScoreRound::new(1, 10).unwrap();
    assert_eq!(early.play(10), Ok(RoundStatus::Won));
    assert_eq!((early.total(), early.remaining()), (10, 9));
    assert_eq!(early.play(10), Err(RoundError::Finished));
}

#[test]
fn losing_round_remains_finished_and_maximum_target_is_reachable() {
    let mut lost = ScoreRound::new(10, 2).unwrap();
    assert_eq!(lost.play(2), Ok(RoundStatus::Playing));
    assert_eq!(lost.play(3), Ok(RoundStatus::Lost));
    assert_eq!(lost.play(10), Err(RoundError::Finished));
    assert_eq!((lost.total(), lost.remaining(), lost.status()), (5, 0, RoundStatus::Lost));
    let mut maximum = ScoreRound::new(100, 10).unwrap();
    for _ in 0..9 { assert_eq!(maximum.play(10), Ok(RoundStatus::Playing)); }
    assert_eq!(maximum.play(10), Ok(RoundStatus::Won));
    assert_eq!((maximum.total(), maximum.remaining()), (100, 0));
}`,
  },
  hints: [
    "Przechowuj osobno sumę, pozostałe próby oraz jawny status; błędne wywołanie nie zmienia żadnego pola.",
    "Po poprawnym ruchu sprawdź osiągnięcie celu przed wyczerpaniem prób. Finished sprawdź przed zakresem points.",
  ],
  evidenceKind: "assessment",
  evidenceGate: true,
  evidence: {
    version: 1,
    conceptIds: ["guess-round-state"],
    codingTaskId: "guessing/cumulative-score-round-v1",
  },
};
