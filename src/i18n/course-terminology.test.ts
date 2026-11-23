import { describe, expect, it } from "vitest";
import { evaluate } from "@/engine/evaluate";
import {
  courseTextInventory,
  getLocalizedCourse,
  translateCourseText,
} from "./course";

const identifiers =
  /(?<![\p{L}\p{N}_])(?:[a-z][a-z0-9]*(?:_[\p{L}0-9]+)+|[A-Z][a-z0-9]+(?:[A-Z][A-Za-z0-9]*)+)(?![\p{L}\p{N}_])/gu;

// These phrases name the conceptual parts of a tuple, not variables in the Rust API.
const tuplePartDescriptions = new Set(["nowa_koperta", "dawna_wartość"]);

const ownershipTerms = [
  { polish: /\bstert\w*|\bsterc\w*/, english: /\bheap\b/ },
  { polish: /\bstos(?:ie|em|u|y|ów)?\b/, english: /\bstack\b/ },
];

describe("English Rust terminology", () => {
  it("preserves whole snake_case and PascalCase identifiers in displayed course text", () => {
    const missing = courseTextInventory().flatMap((source) => {
      const translatedIdentifiers = new Set(
        translateCourseText(source, "en").match(identifiers),
      );
      return [...new Set(source.match(identifiers))]
        .filter(
          (identifier) =>
            !tuplePartDescriptions.has(identifier) &&
            !translatedIdentifiers.has(identifier),
        )
        .map((identifier) => ({ identifier, source: source.slice(0, 120) }));
    });

    expect(missing).toEqual([]);
  });

  it("preserves heap and stack vocabulary in ownership lessons, traces, and answers", () => {
    const incorrect = courseTextInventory().flatMap((source) => {
      const english = translateCourseText(source, "en");
      return ownershipTerms
        .filter(
          ({ polish, english: term }) =>
            polish.test(source) && !term.test(english),
        )
        .map(({ english: term }) => ({ term: term.source, source, english }));
    });

    expect(incorrect).toEqual([]);
  });

  it("retains the serde package and feature names in learner-facing Cargo text", () => {
    const serde = /(?<![\w-])serde(?![\w-])/g;
    const serdeFeatures = /(?:dep:serde|serde\/(?:alloc|derive))/g;
    const incorrect = courseTextInventory().flatMap((source) => {
      const english = translateCourseText(source, "en");
      return [serde, serdeFeatures].flatMap((pattern) => {
        const actual = new Set(english.match(pattern));
        return [...new Set(source.match(pattern))]
          .filter((term) => !actual.has(term))
          .map((term) => ({ term, source, english }));
      });
    });

    expect(incorrect).toEqual([]);
  });

  it.each(["consume", "depth-first"])(
    "preserves the exact technical term %s",
    (term) => {
      const word = new RegExp(`\\b${term}\\b`);
      const sources = courseTextInventory().filter((source) =>
        word.test(source),
      );
      expect(sources.length).toBeGreaterThan(0);
      expect(
        sources.filter(
          (source) => !word.test(translateCourseText(source, "en")),
        ),
      ).toEqual([]);
    },
  );

  it("preserves tuple terminology in the displayed course text", () => {
    const incorrect = courseTextInventory().flatMap((source) => {
      const english = translateCourseText(source, "en");
      return /\bkrot\w*/i.test(source) && !/\btuples?\b/i.test(english)
        ? [{ source, english }]
        : [];
    });

    expect(incorrect).toEqual([]);
  });

  it("describes the transferred heap allocation in the rendered String trace", () => {
    const trace = getLocalizedCourse("en").traces["trace-string-move"];

    expect(trace.frames.map((frame) => frame.heap[0]?.owner)).toEqual([
      "first",
      "second",
      "second",
    ]);
    expect(trace.frames[0].explanation).toContain(
      "bytes are stored on the heap",
    );
    expect(trace.frames[2].explanation).toContain("frees its heap buffer");
    expect(trace.code).toContain('String::from("rust")');
  });

  it("grades the empty default feature as the serde opt-in answer", () => {
    const step = getLocalizedCourse("en")
      .lessons.flatMap((lesson) => lesson.steps)
      .find((step) => step.id === "cargo-resolver-feature-unification-predict");

    expect(step?.prompt).toContain("optional `serde` dependency");
    const correct = step?.choices?.find((choice) =>
      choice.label.startsWith("`default = []`"),
    );
    expect(correct?.label).toContain("explicit opt-in");
    if (!step?.evaluator || !correct) throw new Error("Missing Cargo choice");
    expect(evaluate(step.evaluator, { answer: correct.id }).passed).toBe(true);
    const distractor = step.choices?.find((choice) =>
      choice.label.includes('["format"]'),
    );
    expect(distractor).toBeDefined();
    expect(evaluate(step.evaluator, { answer: distractor?.id }).passed).toBe(
      false,
    );
  });

  it("explains the upper call bound after an incorrect FnOnce prediction", () => {
    const step = getLocalizedCourse("en")
      .lessons.find((lesson) => lesson.id === "guess-random-boundary")
      ?.steps.find((item) => item.id === "guess-random-boundary-explain");
    if (step?.evaluator?.kind !== "choice") {
      throw new Error("Missing FnOnce assessment");
    }

    const result = evaluate(step.evaluator, { answer: "2" });
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain("at most once");
  });

  it("distinguishes a missing configuration value from a valid zero in the title", () => {
    const step = getLocalizedCourse("en")
      .lessons.find((lesson) => lesson.id === "fallible-value-composition")
      ?.steps.find((item) => item.id === "fallible-zero-counterexample");

    expect(step?.title).toBe("Absence is not zero");
  });

  it("avoids unrelated substitutions for common programming terms", () => {
    const artifacts =
      /\b(?:hearts?|hearte|Tokyo|overcrowding|proximal|poems?|Sam|abortion)\b/i;
    const incorrect = courseTextInventory()
      .map((source) => translateCourseText(source, "en"))
      .filter((english) => artifacts.test(english));

    expect(incorrect).toEqual([]);
  });
});
