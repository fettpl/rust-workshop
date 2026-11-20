import { describe, expect, it } from "vitest";
import type { LessonStep } from "../domain/types";
import { stepInteraction } from "./step-interaction";

const recall: LessonStep = {
  id: "recall",
  kind: "recall",
  title: "",
  prompt: "",
  evidenceKind: "recall",
};

describe("coding interaction", () => {
  it("offers a writable Rust editor for a tested recall without a starter", () => {
    expect(
      stepInteraction({ ...recall, evaluator: { kind: "tests", tests: "" } }),
    ).toEqual({ executable: true, hasCode: true, editable: true });
  });

  it("keeps TOML recall editable and outside the Rust runner", () => {
    expect(
      stepInteraction({
        ...recall,
        code: "",
        editorMode: "toml",
        evaluator: {
          kind: "manifest-contract",
          contract: { document: "package", assertions: [] },
        },
      }),
    ).toEqual({ executable: false, hasCode: true, editable: true });
  });

  it.each(["predict", "observe", "explain", "trace"] as const)(
    "keeps %s examples read only even when evaluated by tests",
    (kind) => {
      expect(
        stepInteraction({
          ...recall,
          kind,
          code: "fn main() {}",
          evaluator: { kind: "tests", tests: "" },
        }),
      ).toEqual({ executable: true, hasCode: true, editable: false });
    },
  );

  it("keeps prose recall as an answer instead of a coding exercise", () => {
    expect(
      stepInteraction({
        ...recall,
        evaluator: { kind: "answer", accepted: ["E0382"], feedback: "" },
      }),
    ).toEqual({ executable: false, hasCode: false, editable: false });
  });
});
