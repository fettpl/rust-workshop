import type {
  Competency,
  Concept,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";

const owned = "from-owned-conversions";
const borrowed = "asref-borrowed-views";
const both = [owned, borrowed];
export const coreConversionsSources: Source[] = [
  {
    id: "core-conversions-std-from",
    title: "Rust std: From",
    url: "https://doc.rust-lang.org/std/convert/trait.From.html",
    classification: "dynamic",
    reviewedAt: "2026-10-07",
    recheckPolicy:
      "Sprawdzaj sygnaturę From::from i relację From/Into przy aktualizacji Rust lub zmianie przykładów konwersji.",
  },
  {
    id: "core-conversions-std-asref",
    title: "Rust std: AsRef",
    url: "https://doc.rust-lang.org/std/convert/trait.AsRef.html",
    classification: "dynamic",
    reviewedAt: "2026-10-07",
    recheckPolicy:
      "Sprawdzaj sygnaturę AsRef::as_ref oraz boundy dla str i wycinków przy aktualizacji Rust lub zmianie przykładów pożyczania.",
  },
];
export const coreConversionsCompetencies: Competency[] = [
  {
    id: "consume-conversion-apis",
    title: "Czytasz API konwersji i piszesz konsumentów pożyczonych widoków.",
  },
];
export const coreConversionsConcepts: Concept[] = [
  {
    id: owned,
    title: "From: konwersja przyjmująca wartość",
    prerequisites: ["trait-contract", "trait-consumers"],
    competencyIds: ["consume-conversion-apis"],
    reviewPrompt:
      "Co przejmuje From<String>, a co otrzymuje String::from(&str)?",
    reviewAnswer:
      "From<String> otrzymuje należący do wywołującego String przez wartość. String::from(&str) otrzymuje przez wartość referencję; źródłowy tekst pozostaje pożyczony. From nie zwraca Result.",
    distinguish:
      "From oznacza konwersję z wejścia T przez wartość, nie gwarantuje braku alokacji. From<T> dla U udostępnia również konwersję T przez Into<U>.",
  },
  {
    id: borrowed,
    title: "AsRef: pożyczony widok",
    prerequisites: ["trait-contract", "trait-consumers"],
    competencyIds: ["consume-conversion-apis"],
    reviewPrompt: "Co mówi fn as_ref(&self) -> &T o odbiorcy i wyniku?",
    reviewAnswer:
      "Pożycza odbiorcę i zwraca referencję powiązaną z tym pożyczeniem. Nie przejmuje własności i nie zwraca Result; właściciela można nadal używać po zakończeniu pożyczenia.",
    distinguish:
      "AsRef opisuje dostęp do widoku przez trait. Metoda inherentna o nazwie as_ref nie spełnia boundu T: AsRef<_>.",
  },
];

const runCode = `fn main() {
    let source = String::from("żółć");
    let copied = String::from(source.as_str());
    let view: &str = AsRef::<str>::as_ref(&source);
    println!("{} {}", copied, view.len());
    println!("{}", source);
}`;
const byteStarter = `fn byte_len<T: AsRef<str> + ?Sized>(_value: &T) -> usize { 0 }
fn main() {}`;
const byteSolution = `fn byte_len<T: AsRef<str> + ?Sized>(value: &T) -> usize { value.as_ref().len() }
fn main() {}`;
const byteTests = `#[test]
fn byte_length_contract() {
    struct Fresh { text: String }
    impl AsRef<str> for Fresh { fn as_ref(&self) -> &str { &self.text } }
    assert_eq!(byte_len("żółć"), 8);
    let source = String::from(" a ");
    assert_eq!(byte_len(&source), 3);
    assert_eq!(source, " a ");
    assert_eq!(byte_len(""), 0);
    let fresh = Fresh { text: String::from("język ") };
    assert_eq!(byte_len(&fresh), 7);
    assert_eq!(fresh.text, "język ");
}`;
const measureTargets = [{ lessonId: "scenario-assessment", stepId: "assessment-repair" }];
const labelStarter = `struct Label(String);
impl From<String> for Label {
    fn from(text: String) -> Self { Self(text) }
}
fn measure<T: AsRef<str>>(value: &T) -> usize { value.as_ref().len() }
fn main() { let label = Label::from(String::from("etykieta")); println!("{}", measure(&label)); }`;
const labelSolution = labelStarter.replace(
  "fn measure",
  "impl AsRef<str> for Label { fn as_ref(&self) -> &str { &self.0 } }\nfn measure",
);
const labelTests = `#[test]
fn label_trait_contract() {
    fn consumer<T: AsRef<str>>(value: &T) -> usize { value.as_ref().len() }
    for text in ["", " a ", "żółć"] {
        let input = String::from(text);
        let pointer = input.as_ptr();
        let label = <Label as From<String>>::from(input);
        let first = <Label as AsRef<str>>::as_ref(&label);
        assert_eq!(first, text);
        assert_eq!(consumer(&label), text.len());
        let second = <Label as AsRef<str>>::as_ref(&label);
        assert_eq!(second, text);
        if !text.is_empty() {
            assert_eq!(first.as_ptr(), pointer);
            assert_eq!(second.as_ptr(), pointer);
        }
    }
    let second: Label = String::from("drugie ż").into();
    assert_eq!(<Label as AsRef<str>>::as_ref(&second), "drugie ż");
}`;
const samplesSolution = `struct Samples(Vec<i32>);
impl From<Vec<i32>> for Samples {
    fn from(values: Vec<i32>) -> Self { Self(values) }
}
impl AsRef<[i32]> for Samples {
    fn as_ref(&self) -> &[i32] { &self.0 }
}
fn main() {}`;
const samplesTests = `#[test]
fn samples_trait_contract() {
    fn total<T: AsRef<[i32]>>(value: &T) -> i32 { value.as_ref().iter().sum() }
    for values in [vec![], vec![0], vec![-3, 0, -3, 8], vec![9, -2, 4]] {
        let expected = values.clone();
        let pointer = values.as_ptr();
        let samples = <Samples as From<Vec<i32>>>::from(values);
        let first = <Samples as AsRef<[i32]>>::as_ref(&samples);
        assert_eq!(first, expected.as_slice());
        assert_eq!(total(&samples), expected.iter().sum::<i32>());
        let second = <Samples as AsRef<[i32]>>::as_ref(&samples);
        assert_eq!(second, expected.as_slice());
        if !expected.is_empty() {
            assert_eq!(first.as_ptr(), pointer);
            assert_eq!(second.as_ptr(), pointer);
        }
    }
    let independent: Samples = vec![5, 5, -7].into();
    assert_eq!(<Samples as AsRef<[i32]>>::as_ref(&independent), &[5, 5, -7]);
}`;
const noteStarter = `struct Note(String);
impl From<String> for Note { fn from(_text: String) -> Self { Self(String::new()) } }
fn main() {}`;
const noteSolution = `struct Note(String);
impl From<String> for Note { fn from(text: String) -> Self { Self(text) } }
fn main() {}`;
const noteTests = `#[test]
fn note_conversion_contract() {
    for text in ["", "żółć", " a ", "kolejna notatka"] {
        let note = <Note as From<String>>::from(String::from(text));
        assert_eq!(note.0, text);
    }
    let note: Note = String::from("osobna ż").into();
    assert_eq!(note.0, "osobna ż");
}`;
const bytesStarter = `struct Bytes(Vec<u8>);
fn inspect<T: AsRef<[u8]>>(value: &T) -> usize { value.as_ref().len() }
fn main() { let bytes = Bytes(vec![0, 255]); println!("{}", inspect(&bytes)); }`;
const bytesSolution = bytesStarter.replace(
  "fn inspect",
  "impl AsRef<[u8]> for Bytes { fn as_ref(&self) -> &[u8] { &self.0 } }\nfn inspect",
);
const bytesTests = `#[test]
fn bytes_view_contract() {
    fn consumer<T: AsRef<[u8]>>(value: &T) -> usize { value.as_ref().len() }
    for values in [vec![], vec![0], vec![0, 128, 255, 128], vec![200, 1]] {
        let expected = values.clone();
        let bytes = Bytes(values);
        let pointer = bytes.0.as_ptr();
        let first = <Bytes as AsRef<[u8]>>::as_ref(&bytes);
        assert_eq!(first, expected.as_slice());
        assert_eq!(consumer(&bytes), expected.len());
        let second = <Bytes as AsRef<[u8]>>::as_ref(&bytes);
        assert_eq!(second, expected.as_slice());
        if !expected.is_empty() {
            assert_eq!(first.as_ptr(), pointer);
            assert_eq!(second.as_ptr(), pointer);
        }
        assert_eq!(bytes.0, expected);
    }
}`;

function exercise(
  step: Omit<LessonStep, "evidence" | "evaluator" | "evidenceKind"> & {
    tests: string;
    conceptIds: string[];
  },
): LessonStep {
  const { tests, conceptIds, ...rest } = step;
  return {
    ...rest,
    evaluator: { kind: "tests", tests },
    evidence: { version: 2, conceptIds, codingTaskId: step.id },
    evidenceKind:
      step.kind === "debug"
        ? "fix"
        : step.kind === "blank"
          ? "assessment"
          : "transfer",
  };
}
export const coreConversionsLessons: Lesson[] = [
  {
    id: "conversion-ownership-views",
    moduleId: "traits",
    conceptIds: both,
    competencyIds: ["consume-conversion-apis"],
    prerequisites: ["trait-dispatch"],
    title: "Konwersja wartości i pożyczony widok",
    subtitle: "From oraz AsRef w małych kontraktach API",
    minutes: 20,
    outcomes: [
      "Czytasz odbiorcę i wynik sygnatur From i AsRef.",
      "Przekazujesz String lub Vec do nowego właściciela, a potem pożyczasz jego widok.",
      "Piszesz konsumenta zależnego tylko od AsRef, zachowując bajty i elementy wejścia.",
    ],
    misconceptions: [
      "From zawsze przejmuje alokację: wejście może być referencją, a implementacja może alokować.",
      "AsRef wymaga Display albo Clone: wystarcza zadeklarowany trait.",
      "Długość str oznacza liczbę znaków: len() podaje liczbę bajtów UTF-8.",
      "Metoda o nazwie as_ref zastępuje impl AsRef: bound wymaga implementacji traita.",
    ],
    transferTask:
      "Z pustego edytora zbuduj Samples dla Vec<i32> z konwersją i wielokrotnie pożyczanym wycinkiem.",
    evidenceGate:
      "Testy sprawdzają byte_len, naprawę AsRef dla Label i oba traity Samples. Dostarczony From w Label nie jest dowodem samodzielnej implementacji From. Wynik obejmuje te jawne kontrakty API.",
    sourceIds: coreConversionsSources.map((source) => source.id),
    steps: [
      {
        id: "conversions-predict",
        kind: "predict",
        title: "Przewidź własność",
        prompt:
          "Porównaj fn from(value: String) -> Self oraz fn as_ref(&self) -> &str. Co dzieje się z wejściem i wynikiem?",
        choices: [
          { id: "borrow", label: "Oba wywołania przejmują String." },
          {
            id: "contract",
            label:
              "From<String> otrzymuje String przez wartość; AsRef pożycza odbiorcę i zwraca widok.",
          },
          { id: "copy", label: "AsRef musi sklonować tekst." },
        ],
        evaluator: {
          kind: "choice",
          correct: "contract",
          explanations: {
            borrow: "&self pożycza odbiorcę. Nie przenosi jego String.",
            contract:
              "Odczytaj typ wejścia: tutaj From dostaje String, a AsRef dostaje pożyczenie.",
            copy: "Wynik &str jest referencją; kontrakt nie wymaga klonowania tekstu.",
          },
        },
        evidenceKind: "prediction",
        evidence: { version: 2, conceptIds: both },
      },
      {
        id: "conversions-run",
        kind: "run",
        title: "Referencja też jest wartością",
        prompt:
          "Uruchom przykład i sprawdź, że source nadal działa po obu wywołaniach. String::from przyjmuje tu &str przez wartość. Samo &str jest pożyczoną wartością, więc From nie oznacza zawsze przejęcia alokacji źródła.",
        code: runCode,
        solution: runCode,
        evaluator: { kind: "exact-output", expected: "żółć 8\nżółć\n" },
        expectedStatus: "success",
        explanation:
          "String::from(&str) tworzy własny tekst z pożyczonego wejścia. AsRef::<str>::as_ref(&source) zwraca pożyczony widok. Oba pozostawiają source dostępne.",
        evidenceKind: "exposure",
        evidence: { version: 2, conceptIds: both },
      },
      exercise({
        id: "conversions-read-api",
        kind: "modify",
        title: "Odczytaj bound AsRef",
        prompt:
          "Lokalny fragment sygnatury metody AsRef: fn as_ref(&self) -> &T; (tutaj T oznacza str). Oficjalny opis: https://doc.rust-lang.org/std/convert/trait.AsRef.html. Z sygnatury wskaż odbiorcę, własność wejścia, typ wyniku i sposób sygnalizowania błędu (nie ma Result). Uzupełnij fn byte_len<T: AsRef<str> + ?Sized>(value: &T) -> usize: zwróć liczbę bajtów UTF-8 bez usuwania spacji i przejmowania wartości. ?Sized dopuszcza także str, którego rozmiar nie jest znany w czasie kompilacji, przekazane przez referencję. Konsument ma wymagać tylko AsRef<str>, także dla nowego typu bez Display, Deref i Clone.",
        code: byteStarter,
        solution: byteSolution,
        tests: byteTests,
        conceptIds: [borrowed],
        expectedStatus: "success",
        evidenceGate: true,
        hints: [
          "Bound udostępnia metodę, której wynikiem jest &str. Wywołanie korzysta z pożyczenia value.",
          "Odczytaj długość otrzymanego str: len() liczy bajty UTF-8; chars().count() liczy inne jednostki.",
        ],
      }),
      exercise({
        id: "conversions-label-repair",
        suppliedSolutions: { code: measureTargets, solution: measureTargets },
        kind: "debug",
        title: "Dodaj trait widoku Label",
        prompt:
          "Starter kończy się E0277: konsument wymaga Label: AsRef<str>. From<String> jest już dostarczony i przechowuje dokładnie wejściowy String. Dodaj impl AsRef<str> for Label z fn as_ref(&self) -> &str. Zwracaj widok tego samego przechowywanego bufora, również dla pustego tekstu, spacji i Unicode. Jawny kontrakt tej otoczki wymaga zachowania alokacji String bez trimowania i klonowania; nie jest to ogólna obietnica wszystkich implementacji From.",
        code: labelStarter,
        solution: labelSolution,
        tests: labelTests,
        conceptIds: [borrowed],
        expectedStatus: "compile-error",
        expectedError: "E0277",
        evidenceGate: true,
        hints: [
          "E0277 dotyczy brakującej implementacji traita. Sama metoda inherentna nie spełni boundu.",
          "Odbiorca &self udostępnia pożyczone pole .0; widok ma wskazywać na jego istniejący tekst.",
        ],
      }),
      exercise({
        id: "conversions-samples-transfer",
        kind: "blank",
        title: "Samples od pustego edytora",
        prompt:
          "Jawny kontrakt API: zdefiniuj struct Samples(Vec<i32>), impl From<Vec<i32>> for Samples z fn from(values: Vec<i32>) -> Self oraz impl AsRef<[i32]> for Samples z fn as_ref(&self) -> &[i32]. Dodaj fn main() {}. Konwersja ma zachować przejęty bufor, wszystkie elementy, kolejność i duplikaty bez klonowania. Widok ma wskazywać na ten bufor i działać wielokrotnie u konsumenta z jedynym boundem AsRef<[i32]>. Sprawdzane są m.in. puste wejście, [0], [-3, 0, -3, 8] i niezależne drugie wejście. From::from(values: Vec<i32>) -> Self przyjmuje wektor przez wartość, zwraca Samples i nie zwraca Result; AsRef pożycza &self i zwraca &[i32]. Oficjalne sygnatury: https://doc.rust-lang.org/std/convert/trait.From.html oraz https://doc.rust-lang.org/std/convert/trait.AsRef.html.",
        code: "",
        solution: samplesSolution,
        tests: samplesTests,
        conceptIds: both,
        expectedStatus: "success",
        evidenceGate: true,
        hints: [
          "Oddziel utworzenie właściciela z wejściowego Vec od późniejszego pożyczenia jego wycinka.",
          "Każdy trait ma własny impl. From zwraca Self, a AsRef zwraca referencję do danych w polu .0.",
        ],
      }),
      {
        id: "conversions-explain",
        kind: "explain",
        title: "Wyjaśnij dwie sygnatury",
        prompt:
          "Własnymi słowami porównaj From<String> z AsRef<str>. Uwzględnij odbiorcę, własność wejścia, wynik i brak Result. Wyjaśnij też, dlaczego String::from(&str) nie przejmuje alokacji źródła. To samoocena wyjaśnienia; nie zastępuje wykonania testów.",
        evaluator: {
          kind: "rubric",
          criteria: [
            "From<String> otrzymuje String przez wartość i zwraca Self.",
            "AsRef<str> pożycza &self i zwraca &str powiązane z pożyczeniem.",
            "Obie sygnatury nie zwracają Result; From z wejściem &str dostaje referencję, a nie właściciela tekstu.",
          ],
        },
        evidenceKind: "self-rating",
        evidence: { version: 2, conceptIds: both },
      },
      {
        id: "conversions-recall",
        kind: "recall",
        title: "Odtwórz kontrakt",
        prompt: "Które zdanie zgadza się z From i AsRef?",
        choices: [
          {
            id: "all",
            label:
              "Każde From jest bez alokacji, a AsRef zwraca nowego właściciela.",
          },
          {
            id: "view",
            label:
              "From dostaje T przez wartość; AsRef pożycza &self. Typ T rozstrzyga, czy wejście From jest właścicielem czy referencją.",
          },
          {
            id: "into",
            label:
              "Into wymaga osobnej implementacji, nawet gdy istnieje From.",
          },
        ],
        evaluator: {
          kind: "choice",
          correct: "view",
          explanations: {
            all: "From może alokować; wynik AsRef to pożyczona referencja.",
            view: "Czytaj konkretny typ wejścia. String i &str niosą inne informacje o własności.",
            into: "Standardowa implementacja Into korzysta z dostępnego From; przy .into() kontekst musi określić typ wyniku.",
          },
        },
        evidenceKind: "recall",
        evidence: { version: 2, conceptIds: both },
      },
    ],
  },
];
export const coreConversionsReviewExercises: Record<string, LessonStep> = {
  [owned]: exercise({
    id: "review-from-owned-conversions",
    kind: "modify",
    title: "Napraw konwersję Note",
    prompt:
      "Napraw impl From<String> for Note. fn from(text: String) -> Self ma przejąć i zachować dokładny tekst, także pusty i Unicode. Obecny kod usuwa zawartość. Konwersja ma działać przez From::from i przez .into() z typem Note.",
    code: noteStarter,
    solution: noteSolution,
    tests: noteTests,
    conceptIds: [owned],
    expectedStatus: "success",
    evidenceGate: true,
    hints: [
      "from otrzymuje gotowy String przez wartość.",
      "Przechowaj otrzymany tekst w polu Note zamiast tworzyć pusty String.",
    ],
  }),
  [borrowed]: exercise({
    id: "review-asref-borrowed-views",
    kind: "debug",
    title: "Pożycz bajty Bytes",
    prompt:
      "Dodaj impl AsRef<[u8]> for Bytes z fn as_ref(&self) -> &[u8]. Zwracaj widok istniejącego Vec<u8>, bez zmiany zawartości, także dla zera i wartości ponad 127. Widok ma zachować adres bufora dla niepustych danych i działać wielokrotnie. Starter kończy się E0277, bo brakuje traita.",
    code: bytesStarter,
    solution: bytesSolution,
    tests: bytesTests,
    conceptIds: [borrowed],
    expectedStatus: "compile-error",
    expectedError: "E0277",
    evidenceGate: true,
    hints: [
      "Konsument zależy od AsRef<[u8]>, więc dodaj impl tego traita.",
      "Pożycz pole .0 jako wycinek; nie twórz drugiego bufora.",
    ],
  }),
};
