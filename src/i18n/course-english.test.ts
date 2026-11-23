import { describe, expect, it } from "vitest";
import { courseTextInventory, translateCourseText } from "./course";

function englishFor(sourcePrefix: string): string {
  const source = courseTextInventory().find((text) =>
    text.startsWith(sourcePrefix),
  );
  expect(source).toBeDefined();
  return translateCourseText(source!, "en");
}

describe("English lesson contracts", () => {
  it("preserves the function name, comparison, and ownership in the admit exercise", () => {
    const prompt = englishFor("Napisz od zera generyczną funkcję admit.");
    expect(prompt).toContain("`admit`");
    expect(prompt).toContain("`==`");
    expect(prompt).toContain(
      "in `Err` if the values are equal and in `Ok` otherwise",
    );
  });

  it("preserves inclusive Rust ranges and unformatted public API signatures", () => {
    expect(englishFor("Uzupełnij `sum_even_to`.")).toContain("-10..=20");
    expect(englishFor("Uzupełnij helper dla sumowania list liczb")).toContain(
      "-1000..=1000",
    );
    expect(englishFor("Dostajesz Command::{")).toContain(
      "CommandError::{Empty, Unknown, InvalidTitle, InvalidId, NotFound}",
    );
    expect(englishFor("Dostajesz StorageError::{")).toContain(
      "StorageError::{Io(std::io::Error), Format(FormatError)}",
    );
  });

  it("keeps unformatted Rust ranges, types, paths, diagnostics, and constructor literals", () => {
    const tokenPatterns = [
      /(?<!\w)-?\d+\.\.=?-?\d+/g,
      /\b(?:[iu](?:8|16|32|64|128|size)|f(?:32|64)|E\d{4})\b/g,
      /\b[A-Za-z_][A-Za-z0-9_]*::[A-Za-z_][A-Za-z0-9_]*\b/g,
      /\b(?:Err|Ok|Some|String::from)\(\s*"(?:[^"\\]|\\.)*"\s*\)/g,
      /\(-?\d+(?:,\s*-?\d+)+\)/g,
      /\b[A-Za-z_][A-Za-z_0-9]*\(-?\d+(?:,\s*-?\d+)*\)/g,
      /\b\d{8}\b/g,
    ];
    const missing = courseTextInventory().flatMap((source) => {
      const translation = translateCourseText(source, "en");
      return tokenPatterns.flatMap((pattern) => {
        const actual = new Set(translation.match(pattern));
        return (source.match(pattern) ?? [])
          .filter((token) => !actual.has(token))
          .map((token) => ({ source, token }));
      });
    });
    expect(missing).toEqual([]);
  });

  it.each([
    "ok 36",
    "ok 42",
    '(10, "łagodnie")',
    '(5, "łagodnie")',
    '(-1, "zimno")',
  ])("preserves the predicted Rust output %s in both editions", (output) => {
    expect(translateCourseText(output, "en")).toBe(output);
    expect(translateCourseText(output, "pl")).toBe(output);
  });

  it.each([
    ["Starter zwraca stały rekord.", "a nonempty message"],
    [
      "Zaimplementuj publiczne API: pub struct BatchReceiver;",
      "a nonempty receiver and a positive limit",
    ],
    [
      "Zaimplementuj `active(&Exception, as_of_ymd)`",
      "all nonempty and `expires_ymd >= as_of_ymd`",
    ],
    [
      "Zaimplementuj `decide(&Dossier)`",
      "config are nonempty, `consumer == true`, and `publish == false`",
    ],
    [
      "Zdefiniuj `struct CostRow { baseline:",
      "only for a nonempty batch in which every row is Keep",
    ],
  ])("keeps the nonempty requirement in %s", (source, requirement) => {
    expect(englishFor(source)).toContain(requirement);
  });

  it("removes subtitle credits and misspelled Rust terminology", () => {
    const artifacts = courseTextInventory().filter((source) =>
      /sync, corrected by|@elder_man|\bpayoads?\b|\bcloseures?\b|\bhunchage collector\b/i.test(
        translateCourseText(source, "en"),
      ),
    );
    expect(artifacts).toEqual([]);
  });

  it.each([
    "An authored Tokio Cargo package for bounded admission, allowlisted telemetry, readiness/drain, and evidence-first incident diagnosis.",
    "Blank page: MutSlot lifetime and variance",
    "Blank page: disjoint mutable regions",
    "Rust blog: Generic associated types stabilization",
    "Cargo: specifying dependencies",
    "tokio-stream 0.1.19: wrappers::ReceiverStream",
    "SQLite: PRAGMA synchronous",
    "Won { attempts: ... }",
    "Packet::Arrived { code: Some(value) }",
    "Lost { secret: 9 }",
  ])("keeps authored English intact: %s", (source) => {
    expect(courseTextInventory()).toContain(source);
    expect(translateCourseText(source, "en")).toBe(source);
  });
});
