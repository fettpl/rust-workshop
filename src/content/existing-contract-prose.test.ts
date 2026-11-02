import { describe, expect, test } from "vitest";
import {
  unsafeMiriAssessmentSources,
  unsafeMiriConcepts,
  unsafeMiriLessons,
  unsafeMiriModule,
  unsafeMiriReviewExercises,
} from "./unsafe-miri";
import {
  genericsLessons,
  genericsReviewExercises,
  genericsModule,
} from "./generics";
import { foundationsLessons } from "./foundations";

function step(lessonId: string, stepId: string) {
  const lesson = unsafeMiriLessons.find((item) => item.id === lessonId);
  const result = lesson?.steps.find((item) => item.id === stepId);
  expect(result, `${lessonId}/${stepId} must remain mapped`).toBeDefined();
  return result!;
}

function testsOf(lessonId: string, stepId: string): string {
  const evaluator = step(lessonId, stepId).evaluator;
  if (!evaluator || evaluator.kind !== "tests") {
    throw new Error(`${lessonId}/${stepId} must use a tests evaluator`);
  }
  return evaluator.tests;
}

function allByteViewSafetyText(): Array<{
  name: string;
  text: string;
  signature: string;
}> {
  const byteLesson = unsafeMiriLessons.find(
    (lesson) => lesson.id === "unsafe-miri-byte-view",
  )!;
  const gateCriteria = unsafeMiriModule.gateCriteria!;
  const concept = unsafeMiriConcepts.find(
    (item) => item.id === "unsafe-miri-byte-view-contract",
  )!;
  const review = unsafeMiriReviewExercises["unsafe-miri-byte-view-contract"];
  const gate = byteLesson.steps.find((item) => item.id === "byte-view-gate")!;
  const contractGate = byteLesson.steps.find(
    (item) => item.id === "byte-view-contract-gate",
  )!;
  const blank = byteLesson.steps.find((item) => item.id === "byte-view-blank")!;
  const recall = byteLesson.steps.find(
    (item) => item.id === "byte-view-recall",
  )!;
  const canonical = unsafeMiriAssessmentSources.byteView.canonical;
  return [
    {
      name: "assessment-canonical",
      text: canonical,
      signature: canonical,
    },
    {
      name: "assessment-equivalent",
      text: unsafeMiriAssessmentSources.byteView.equivalent,
      signature: unsafeMiriAssessmentSources.byteView.equivalent,
    },
    { name: "byte-view-gate", text: gate.prompt, signature: gate.solution! },
    {
      name: "byte-view-contract-gate",
      text: contractGate.prompt,
      signature: contractGate.solution!,
    },
    { name: "byte-view-blank", text: blank.prompt, signature: blank.solution! },
    {
      name: "byte-view-recall",
      text: recall.prompt,
      signature: recall.solution!,
    },
    {
      name: "generated-review",
      text: review.prompt,
      signature: review.solution!,
    },
    {
      name: "concept-review-answer",
      text: concept.reviewAnswer,
      signature: canonical,
    },
    {
      name: "byte-view-gate-rubric",
      text: gateCriteria.find(
        (criterion) => criterion.id === "unsafe-miri-byte-view-gate",
      )!.label,
      signature: canonical,
    },
    {
      name: "byte-view-recall-rubric",
      text: gateCriteria.find(
        (criterion) => criterion.id === "unsafe-miri-byte-view-recall",
      )!.label,
      signature: recall.solution!,
    },
  ];
}

describe("C1 existing contract prose", () => {
  test("byte-view-valid-initialized-live-storage", () => {
    // Code signatures are the stable proof of u8 and read-only borrowing;
    // learner prose is checked separately for the storage/lifetime obligations.
    const requiredProse = [
      /initialized|zainicjaliz/,
      /one live[\s/]+allocation|jednej żywej alokacji/,
      /valid|ważn|żywej|storage|alokac/,
      /aligned|wyrównan/,
      /non-null|niezerow/,
      /unaliased|aliasowan|aliasing/,
    ];
    for (const surface of allByteViewSafetyText()) {
      expect(surface.signature, surface.name).toContain("bytes: &'a [u8]");
      expect(surface.signature, surface.name).toContain(
        "fn as_slice(&self) -> &[u8]",
      );
      expect(surface.text, surface.name).toMatch(/u8|bajt/);
      for (const phrase of requiredProse) {
        expect(surface.text, surface.name).toMatch(phrase);
      }
    }
  });

  test("byte-view-static-contract-requires-isize-max-and-nonwrapping-range", () => {
    for (const surface of allByteViewSafetyText()) {
      expect(surface.text, surface.name).toContain("isize::MAX");
      expect(surface.text, surface.name).toMatch(
        /non[- ]wrapp|without wrapping|does not wrap|must not wrap|nie zawijać|nie zawij|niezwij|zawijać|overflow/,
      );
    }
  });

  test("byte-view-mutable-aliasing-only-shared-readonly-permitted", () => {
    const byteLesson = unsafeMiriLessons.find(
      (lesson) => lesson.id === "unsafe-miri-byte-view",
    )!;
    const gate = byteLesson.steps.find((item) => item.id === "byte-view-gate")!;
    const contractGate = byteLesson.steps.find(
      (item) => item.id === "byte-view-contract-gate",
    )!;
    const blank = byteLesson.steps.find((item) => item.id === "byte-view-blank")!;
    const recall = byteLesson.steps.find((item) => item.id === "byte-view-recall")!;
    const criteria = unsafeMiriModule.gateCriteria!;
    const gateLabel = criteria.find(
      (criterion) => criterion.id === "unsafe-miri-byte-view-gate",
    )!.label;
    const recallLabel = criteria.find(
      (criterion) => criterion.id === "unsafe-miri-byte-view-recall",
    )!.label;
    const englishComments = [
      unsafeMiriAssessmentSources.byteView.canonical,
      unsafeMiriAssessmentSources.byteView.equivalent,
      recall.solution!,
    ];
    for (const text of englishComments) {
      expect(text).toMatch(/mutable(?:\s|\/)+aliasing/);
      expect(text).toMatch(/shared(?:\s|\/)+read-only aliases are permitted/);
      expect(text).not.toContain("unaliased");
    }
    const polishProse = [
      gate.prompt,
      contractGate.prompt,
      blank.prompt,
      recall.prompt,
      gateLabel,
      recallLabel,
    ];
    for (const text of polishProse) {
      expect(text).toContain("mutowalnego aliasowania");
      expect(text).toMatch(/współdzielone aliasy|aliasy współdzielone/);
      expect(text).toContain("dozwolone");
      expect(text).not.toMatch(/niealiasowaniu|brak aliasowania/);
    }
  });

  test("byte-view-null-zero-wrapper-policy", () => {
    const solutions = [
      unsafeMiriAssessmentSources.byteView.canonical,
      unsafeMiriAssessmentSources.byteView.equivalent,
      step("unsafe-miri-byte-view", "byte-view-recall").solution!,
      unsafeMiriReviewExercises["unsafe-miri-byte-view-contract"].solution!,
    ];
    for (const solution of solutions) {
      expect(solution).toMatch(/if len == 0|\(_, 0\)/);
      expect(solution).toContain("&[]");
      expect(solution).toContain("raw.is_null()");
    }
    const fixtures = [
      testsOf("unsafe-miri-byte-view", "byte-view-gate"),
      testsOf("unsafe-miri-byte-view", "byte-view-recall"),
    ];
    for (const fixture of fixtures) expect(fixture).toContain("null(), 0");
    expect(
      allByteViewSafetyText()
        .map((surface) => surface.text)
        .join("\n"),
    ).toMatch(
      /wrapper|opakow|odczytu|without calling|bez wywołania|from_raw_parts wymaga/i,
    );
  });

  test("byte-view-no-invalid-pointer-or-large-length-execution", () => {
    const byteLesson = unsafeMiriLessons.find(
      (lesson) => lesson.id === "unsafe-miri-byte-view",
    )!;
    const executionText = [
      byteLesson.steps.find((item) => item.id === "byte-view-run")!.code!,
      testsOf("unsafe-miri-byte-view", "byte-view-gate"),
      testsOf("unsafe-miri-byte-view", "byte-view-recall"),
    ].join("\n");
    expect(executionText).not.toMatch(
      /usize::MAX|isize::MAX|dangling|invalid|MaybeUninit|from_raw_parts\([^\n]*0x0/i,
    );
    expect(executionText).toContain("null(), 0");
  });

  test("generic-bounds-explain-borrowed-args-bool-result-partialeq-only", () => {
    expect(genericsModule.lessonIds).toContain("generic-bounds");
    const lesson = genericsLessons.find((item) => item.id === "generic-bounds")!;
    const item = lesson.steps.find(
      (candidate) => candidate.id === "bounds-explain",
    )!;
    expect(item.evaluator).toMatchObject({ kind: "choice", correct: "2" });
    if (!item.evaluator || item.evaluator.kind !== "choice") {
      throw new Error("bounds-explain must keep a choice evaluator");
    }
    expect(Object.keys(item.evaluator.explanations)).toEqual(["0", "1", "2"]);
    expect(item.evaluator.explanations["0"]).toContain("Copy");
    expect(item.evaluator.explanations["1"]).toContain("Clone");
    expect(item.evaluator.explanations["2"]).toContain("pożyczone");
    expect(item.choices?.map((choice) => choice.label)).toEqual([
      "PartialEq + Copy, bo return zawsze kopiuje",
      "PartialEq + Clone + Debug na wszelki wypadek",
      "PartialEq; samo przeniesienie wyniku nie wymaga dodatkowego traitu",
    ]);
    expect(item.prompt).toContain("pożyczone argumenty");
    expect(item.prompt).toContain("bool");
    expect(item.prompt).toContain("PartialEq");
    expect(item.prompt).not.toContain("przenosi jedno do wyniku");
    expect(item.prompt).not.toContain("posiadane T");
  });

  test("generic-review-count-remains-borrowed-minimal-bound", () => {
    expect(Object.keys(genericsReviewExercises).sort()).toEqual([
      "generic-ownership",
      "generic-type-parameters",
      "minimal-trait-bounds",
    ]);
    expect(Object.values(genericsReviewExercises)).toHaveLength(3);
    expect(
      Object.values(genericsReviewExercises)
        .map((review) => review.id)
        .sort(),
    ).toEqual([
      "review-generic-count",
      "review-generic-routing",
      "review-generic-slot",
    ]);
    const review = genericsReviewExercises["minimal-trait-bounds"];
    expect(review.prompt).toContain("pożyczone");
    expect(review.prompt).toContain("PartialEq");
    expect(review.prompt).toContain("first: &T");
    expect(review.prompt).toContain("second: &T");
    expect(review.prompt).toContain("target: &T");
    expect(review.solution).toContain("first: &T");
    expect(review.solution).toContain("T: PartialEq");
  });

  test("numeric-discover-identifies-slash-as-integer-division-operator", () => {
    const item = foundationsLessons
      .find((lesson) => lesson.id === "bindings-types")!
      .steps.find((step) => step.id === "numeric-discover")!;
    expect(item.prompt).toMatch(/operator `?\/?`? dla liczb całkowity/i);
    expect(item.prompt).toContain("`%` daje resztę");
    expect(item.code).toContain("inferred / 2");
  });

  test("numeric-discover-exact-output-unchanged", () => {
    const item = foundationsLessons
      .find((lesson) => lesson.id === "bindings-types")!
      .steps.find((step) => step.id === "numeric-discover")!;
    expect(item.evaluator).toMatchObject({
      kind: "answer",
      accepted: ["-2 255 3 3.5 4 4"],
    });
    expect(item.code).toBe(item.solution);
    for (const snippet of [
      "const PAIR_SIZE: u32 = 2;",
      "let signed: i8 = -2;",
      "let byte: u8 = 255;",
      "let inferred = 7;",
      "let fraction: f64 = 7.0 / 2.0;",
      'let length: usize = "Rust".len();',
      "let items = 8u32;",
      "let items = items / PAIR_SIZE;",
      'println!("{signed} {byte} {} {fraction} {length} {items}", inferred / 2);',
    ]) {
      expect(item.code).toContain(snippet);
    }
    const accepted = (
      item.evaluator as { kind: "answer"; accepted: string[] }
    ).accepted;
    expect(`${accepted[0]}\n`).toBe("-2 255 3 3.5 4 4\n");
  });
});
