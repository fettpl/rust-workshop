import { describe, expect, it } from "vitest";
import type { LessonStep } from "./types";
import {
  getTrustedFixtureTarget,
  trustedFixtureIssues,
  hasRustTestAttribute,
} from "./trusted-fixtures";

const plain: LessonStep = {
  id: "fixture",
  kind: "run",
  title: "Fixture",
  prompt: "Run",
  code: "fn main() {}",
  solution: "fn main() {}",
  evidenceKind: "exposure",
  evaluator: { kind: "compilation" },
  expectedStatus: "success",
};
const target = "cargo-tokio-runtime-1.53.1" as const;

describe("authored fixture compiler contract", () => {
  it("requires the Cargo profile for Stream-only examples, aliases and hidden tests", () => {
    for (const source of [
      "fn values() { let _ = tokio_stream::iter([1, 2]); }",
      "use tokio_stream as streams;",
      "extern crate tokio_stream;",
    ]) {
      for (const authored of [
        { code: source },
        { solution: source },
        { evaluator: { kind: "tests" as const, tests: source } },
      ]) {
        const step = { ...plain, ...authored };
        expect(() => getTrustedFixtureTarget(step)).toThrow(/requires/);
        expect(
          getTrustedFixtureTarget({ ...step, trustedFixtureTarget: target }),
        ).toBe(target);
      }
    }
  });
  it("keeps existing std fixtures on rustc and requires an explicit Tokio target", () => {
    expect(getTrustedFixtureTarget(plain)).toBe("rustc-2024");
    const tokio = {
      ...plain,
      code: '#[tokio::main(flavor = "current_thread")] async fn main() {}',
    };
    expect(trustedFixtureIssues(tokio).join(" ")).toContain("requires");
    expect(() => getTrustedFixtureTarget(tokio)).toThrow();
    expect(
      getTrustedFixtureTarget({ ...tokio, trustedFixtureTarget: target }),
    ).toBe(target);
  });
  it("checks hidden tests and blank solutions instead of inspecting only visible code", () => {
    const blank: LessonStep = {
      ...plain,
      kind: "blank",
      code: undefined,
      solution: "fn start() { tokio::spawn(async {}); }",
      trustedFixtureTarget: target,
    };
    expect(getTrustedFixtureTarget(blank)).toBe(target);
    expect(
      trustedFixtureIssues({ ...blank, trustedFixtureTarget: undefined }),
    ).not.toEqual([]);
    const hidden: LessonStep = {
      ...plain,
      evaluator: { kind: "tests", tests: "#[tokio::test] async fn check() {}" },
    };
    expect(() => getTrustedFixtureTarget(hidden)).toThrow();
  });
  it("fails closed for unknown targets or using Cargo to skip a std fixture", () => {
    expect(() =>
      getTrustedFixtureTarget({
        ...plain,
        trustedFixtureTarget: "arbitrary",
      } as unknown as LessonStep),
    ).toThrow(/unknown/i);
    expect(() =>
      getTrustedFixtureTarget({ ...plain, trustedFixtureTarget: target }),
    ).toThrow(/Tokio/);
    expect(() =>
      getTrustedFixtureTarget({
        ...plain,
        code: "use tokio as runtime;",
        trustedFixtureTarget: "rustc-2024",
      }),
    ).toThrow();
  });
  it("recognizes standard and Tokio test attributes but not a main macro", () => {
    expect(hasRustTestAttribute("#[test] fn works() {} ")).toBe(true);
    expect(
      hasRustTestAttribute(
        '#[tokio::test(flavor = "current_thread")] async fn works() {}',
      ),
    ).toBe(true);
    expect(hasRustTestAttribute("#[tokio::main] async fn main() {} ")).toBe(
      false,
    );
    expect(hasRustTestAttribute("expected output")).toBe(false);
  });
});
