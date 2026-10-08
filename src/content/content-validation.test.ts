import { describe, expect, it } from "vitest";
import type { Lesson } from "@/domain/types";
import { evaluate } from "../engine/evaluate";
import {
  lessons,
  concepts,
  competencies,
  delayedReviewExercises,
  ownershipModule,
  modules,
  reviewExercises,
  sources,
  traces,
  project,
  projects,
  roadmap,
} from "./course";
import { validateContent, type ContentBundle } from "./validate";
import { frameTextContract } from "./ownership-evidence-contracts";

const bundle: ContentBundle = {
  lessons,
  concepts,
  competencies,
  modules,
  reviewExercises,
  delayedReviewExercises,
  sources,
  traces,
  project,
  projects,
  roadmap,
};

describe("curriculum content contract", () => {
  it("includes and validates the delayed executable contract", () => {
    const delayed = delayedReviewExercises["function-ownership"];
    expect(delayed.code).toBeTruthy();
    expect(delayed.solution).toBeTruthy();
    expect(delayed.expectedStatus).toBe("success");
    expect(delayed.code).toBe(frameTextContract.starter);
    expect(delayed.solution).toBe(frameTextContract.solution);
    expect(delayed.evaluator).toEqual({
      kind: "tests",
      tests: frameTextContract.tests,
    });
    const authored = [
      ...lessons.flatMap((lesson) =>
        lesson.steps.map((step) => ({ key: `${lesson.id}/${step.id}`, step })),
      ),
      ...Object.entries(reviewExercises).map(([key, step]) => ({
        key: `review/${key}`,
        step,
      })),
      ...Object.entries(delayedReviewExercises).map(([key, step]) => ({
        key: `delayed-review/${key}`,
        step,
      })),
    ];
    expect(
      authored.find(({ key }) => key === "delayed-review/function-ownership")
        ?.step,
    ).toBe(delayed);
    const broken: ContentBundle = {
      ...bundle,
      delayedReviewExercises: {
        "function-ownership": {
          ...delayed,
          code: undefined,
          solution: undefined,
          evaluator: { kind: "tests", tests: "" },
        },
      },
    };
    expect(
      validateContent(broken).some((error) => error.includes("delayed")),
    ).toBe(true);
  });
  it("accepts the official Rust blog without accepting lookalike hosts", () => {
    const check = (url: string) =>
      validateContent({
        ...bundle,
        sources: [{ ...sources[0], url }],
      }).filter((error) => error.includes("official Rust source"));
    expect(
      check("https://blog.rust-lang.org/2022/10/28/gats-stabilization/"),
    ).toEqual([]);
    for (const url of [
      "http://blog.rust-lang.org/2022/10/28/gats-stabilization/",
      "https://blog.rust-lang.org.example.org/2022/10/28/gats-stabilization/",
      "https://blog.rust-lang.org@example.org/2022/10/28/gats-stabilization/",
    ])
      expect(check(url), url).not.toEqual([]);
  });

  it("validates TOML declarations without requiring a compiler result", () => {
    const target = lessons[0];
    const changed = structuredClone(target);
    changed.steps[0] = {
      ...changed.steps[0],
      editorMode: "toml",
      editorFile: "Cargo.toml",
      code: '[package]\nname="wrong"',
      solution: '[package]\nname="demo"',
      kind: "modify",
      evidenceKind: "assessment",
      evidenceGate: true,
      evaluator: {
        kind: "manifest-contract",
        contract: {
          document: "package",
          assertions: [
            { kind: "path-equals", path: ["package", "name"], value: "demo" },
          ],
        },
      },
      expectedStatus: undefined,
      expectedError: undefined,
      expectedDiagnostic: undefined,
    };
    const errors = () =>
      validateContent({
        ...bundle,
        lessons: lessons.map((item) => (item === target ? changed : item)),
      });
    expect(errors()).toEqual([]);
    changed.steps[0].solution = '[package]\nname="wrong"';
    expect(errors().some((error) => error.includes("manifest solution"))).toBe(
      true,
    );
    changed.steps[0].solution = '[package]\nname="demo"';
    changed.steps[0].code = changed.steps[0].solution;
    expect(errors().some((error) => error.includes("manifest starter"))).toBe(
      true,
    );
  });

  it("accepts reviewed Rand sources and rejects lookalike hosts or unreviewed versions", () => {
    const check = (url: string) =>
      validateContent({
        ...bundle,
        sources: [{ ...sources[0], url }],
      }).filter((error) => error.includes("official Rust source"));
    for (const url of [
      "https://docs.rs/rand/0.10.2/rand/fn.random_range.html",
      "https://docs.rs/crate/rand/0.10.2/source/Cargo.toml.orig",
      "https://rust-random.github.io/book/crate-reprod.html",
    ])
      expect(check(url), url).toEqual([]);
    for (const url of [
      "https://docs.rs/rand/latest/rand/",
      "https://docs.rs/rand/0.10.1/rand/",
      "https://docs.rs/another/0.10.2/rand/",
      "https://docs.rs.example.org/rand/0.10.2/rand/",
      "https://rust-random.github.io.example.org/book/",
      "https://docs.rs/crate/rand/0.10.1/source/Cargo.toml.orig",
    ])
      expect(check(url), url).not.toEqual([]);
  });
  it("aligns authored compiler diagnostics with browser grading", () => {
    const lesson = lessons.find((x) => x.id === "tokio-task-boundaries")!;
    const step = lesson.steps.find((x) => x.expectedDiagnostic)!;
    const changed = {
      ...lesson,
      steps: lesson.steps.map((x) =>
        x === step
          ? {
              ...x,
              evaluator: { kind: "expected-error" as const, code: "E0277" },
            }
          : x,
      ),
    };
    const errors = validateContent({
      ...bundle,
      lessons: lessons.map((x) => (x === lesson ? changed : x)),
    });
    expect(
      errors.some((x) =>
        x.includes("expected-error evaluator must match authored diagnostic"),
      ),
    ).toBe(true);
  });
  it("allows exposure-only expected-error observations without a redundant solution", () => {
    const lesson = lessons.find((x) => x.id === "unsafe-borrowed-auto-traits")!;
    const target = lesson.steps.find(
      (x) => x.id === "unsafe-borrowed-auto-traits-compile-fail",
    )!;
    const changed = {
      ...lesson,
      steps: lesson.steps.map((x) =>
        x === target ? { ...x, solution: undefined } : x,
      ),
    };
    const errors = validateContent({
      ...bundle,
      lessons: lessons.map((x) => (x === lesson ? changed : x)),
    });
    expect(errors.filter((x) => x.includes("code but no solution"))).toEqual(
      [],
    );

    const assertMissingSolutionIsRejected = (
      override: Partial<typeof target>,
    ) => {
      const broken = {
        ...target,
        solution: undefined,
        ...override,
      } as typeof target;
      const brokenLesson = {
        ...lesson,
        steps: lesson.steps.map((step) => (step === target ? broken : step)),
      };
      expect(
        validateContent({
          ...bundle,
          lessons: lessons.map((item) =>
            item === lesson ? brokenLesson : item,
          ),
        }).some((x) => x.includes("code but no solution")),
      ).toBe(true);
    };
    assertMissingSolutionIsRejected({ kind: "modify" });
    assertMissingSolutionIsRejected({ evidenceKind: "assessment" });
    assertMissingSolutionIsRejected({ expectedStatus: "success" });
    assertMissingSolutionIsRejected({
      evaluator: { kind: "tests", tests: "#[test]fn checks(){}" },
    });
  });
  it("accepts the reviewed Tokio documentation and rejects lookalikes or another version", () => {
    const check = (url: string) =>
      validateContent({
        ...bundle,
        sources: [{ ...sources[0], url }, ...sources.slice(1)],
      }).filter((error) => error.includes("official Rust source"));
    expect(
      check("https://docs.rs/tokio/1.53.1/tokio/task/fn.spawn.html"),
    ).toEqual([]);
    expect(check("https://tokio.rs/tokio/tutorial/spawning")).toEqual([]);
    expect(
      check(
        "https://docs.rs/tokio-stream/0.1.19/tokio_stream/trait.StreamExt.html",
      ),
    ).toEqual([]);
    for (const url of [
      "https://docs.rs/tokio/latest/tokio/",
      "https://docs.rs/tokio/1.53.0/tokio/",
      "https://tokio.rs.example.org/",
      "https://docs.rs/unrelated/1.53.1/tokio/",
      "https://docs.rs/tokio-stream/latest/tokio_stream/",
      "https://docs.rs/tokio-stream/0.1.18/tokio_stream/",
      "https://docs.rs.example.org/tokio-stream/0.1.19/tokio_stream/",
    ])
      expect(check(url), url).not.toEqual([]);
  });
  it("checks Tokio metadata on both lesson code and review hidden tests", () => {
    const tokioCode =
      '#[tokio::main(flavor = "current_thread")] async fn main() {}';
    const changed = {
      ...lessons[0],
      steps: [
        { ...lessons[0].steps[0], code: tokioCode, solution: tokioCode },
        ...lessons[0].steps.slice(1),
      ],
    };
    expect(
      validateContent({
        ...bundle,
        lessons: [changed, ...lessons.slice(1)],
      }).some((error) => error.includes("Tokio fixture requires")),
    ).toBe(true);
    const first = concepts[0].id;
    const review = reviewExercises[first];
    const broken = {
      ...bundle,
      reviewExercises: {
        ...reviewExercises,
        [first]: {
          ...review,
          evaluator: {
            kind: "tests" as const,
            tests:
              '#[tokio::test(flavor = "current_thread")] async fn checks() {}',
          },
        },
      },
    };
    expect(
      validateContent(broken).some((error) =>
        error.includes(`review ${first}: Tokio fixture requires`),
      ),
    ).toBe(true);
    const fixed = {
      ...broken,
      reviewExercises: {
        ...broken.reviewExercises,
        [first]: {
          ...broken.reviewExercises[first],
          trustedFixtureTarget: "cargo-tokio-runtime-1.53.1" as const,
        },
      },
    };
    expect(
      validateContent(fixed).filter(
        (error) =>
          error.includes(`review ${first}:`) ||
          error.includes("must contain a Rust #[test]"),
      ),
    ).toEqual([]);
  });
  it("accepts pinned Loom documentation but rejects unrelated sources", () => {
    const checkSource = (url: string) =>
      validateContent({
        ...bundle,
        sources: [{ ...sources[0], url }, ...sources.slice(1)],
      }).filter((error) => error.includes("official Rust source"));
    expect(checkSource("https://docs.rs/loom/0.7.2/loom/")).toEqual([]);
    expect(
      checkSource("https://docs.rs/loom/0.7.2/loom/model/struct.Builder.html"),
    ).toEqual([]);
    expect(checkSource("https://docs.rs/unrelated/0.7.2/loom/")).not.toEqual(
      [],
    );
    expect(
      checkSource("https://docs.rs.example.org/loom/0.7.2/loom/"),
    ).not.toEqual([]);
  });
  it("ships a valid, connected learning graph", () => {
    expect(validateContent(bundle)).toEqual([]);
    expect(lessons.length).toBeGreaterThanOrEqual(6);
    expect(ownershipModule.lessonIds.length).toBeLessThanOrEqual(10);
    expect(
      lessons.every(
        (lesson) => lesson.steps.length >= 5 && lesson.steps.length <= 9,
      ),
    ).toBe(true);
    expect(
      lessons.some((lesson) =>
        lesson.steps.some((step) => step.evidenceKind === "recall"),
      ),
    ).toBe(true);
    expect(lessons.some((lesson) => lesson.id.includes("adversarial"))).toBe(
      true,
    );
    expect(project.adversarialInject.toLowerCase()).toContain("clone");
  });

  it("reports duplicate IDs and missing references instead of silently accepting them", () => {
    const broken: ContentBundle = {
      ...bundle,
      lessons: [...lessons, lessons[0]],
      modules: [
        {
          ...ownershipModule,
          lessonIds: [...ownershipModule.lessonIds, "missing-lesson"],
        },
      ],
    };
    const errors = validateContent(broken);
    expect(errors.some((error) => error.includes("duplicate lesson id"))).toBe(
      true,
    );
    expect(errors.some((error) => error.includes("unknown lesson id"))).toBe(
      true,
    );
  });

  it("rejects authored code without an expected compiler contract", () => {
    const lesson = lessons.find((item) =>
      item.steps.some((step) => step.code),
    )!;
    const step = lesson.steps.find((item) => item.code)!;
    const broken: ContentBundle = {
      ...bundle,
      lessons: lessons.map((item) =>
        item.id === lesson.id
          ? {
              ...item,
              steps: item.steps.map((candidate) =>
                candidate.id === step.id
                  ? { ...candidate, expectedStatus: undefined }
                  : candidate,
              ),
            }
          : item,
      ),
    };
    expect(
      validateContent(broken).some((error) => error.includes("expectedStatus")),
    ).toBe(true);
  });

  it("catches prerequisite cycles and missing transfer evidence", () => {
    const broken: ContentBundle = {
      ...bundle,
      concepts: concepts.map((concept) =>
        concept.id === "stack-heap"
          ? { ...concept, prerequisites: ["scope-drop"] }
          : concept,
      ),
      lessons: lessons.map((lesson) =>
        lesson.id === "memory-intro"
          ? { ...lesson, transferTask: "", evidenceGate: "" }
          : lesson,
      ),
    };
    const errors = validateContent(broken);
    expect(
      errors.some((error) => error.includes("concept prerequisite cycle")),
    ).toBe(true);
    expect(errors.some((error) => error.includes("missing transferTask"))).toBe(
      true,
    );
    expect(errors.some((error) => error.includes("missing evidenceGate"))).toBe(
      true,
    );
  });

  it("requires executable tests rather than a prose test placeholder", () => {
    const lesson = lessons.find((item) => item.id === "blank-page-repair")!;
    const broken: ContentBundle = {
      ...bundle,
      lessons: lessons.map((item) =>
        item.id === lesson.id
          ? {
              ...item,
              steps: item.steps.map((candidate) =>
                candidate.id === "blank-code"
                  ? {
                      ...candidate,
                      evaluator: {
                        kind: "tests" as const,
                        tests: "expected output",
                      },
                    }
                  : candidate,
              ),
            }
          : item,
      ),
    };
    expect(
      validateContent(broken).some((error) =>
        error.includes("must contain a Rust #[test]"),
      ),
    ).toBe(true);
  });

  it("validates module gate task references and keeps rubric refs supplementary", () => {
    const broken: ContentBundle = {
      ...bundle,
      modules: [
        {
          ...ownershipModule,
          gateCriteria: [
            {
              id: "broken",
              label: "Broken",
              taskRefs: [{ lessonId: "missing", stepId: "task" }],
              supplementaryStepRefs: [
                { lessonId: "move-copy-discovery", stepId: "move-predict" },
              ],
            },
          ],
        },
      ],
    };
    const errors = validateContent(broken);
    expect(errors.some((error) => error.includes("unknown lesson id"))).toBe(
      true,
    );
    expect(
      errors.some(
        (error) => error.includes("supplementary") && error.includes("rubric"),
      ),
    ).toBe(true);
  });

  it("keeps repair gates tied to a changed solution and an observable result", () => {
    const repairIds = [
      "move-error",
      "function-error",
      "borrow-conflict",
      "project-error",
      "blank-error",
      "adversarial-conflict",
      "assessment-repair",
    ];
    for (const id of repairIds) {
      const step = lessons
        .flatMap((lesson) => lesson.steps)
        .find((candidate) => candidate.id === id);
      expect(step?.code, id).toBeTruthy();
      expect(step?.solution, id).toBeTruthy();
      expect(step?.solution, id).not.toBe(step?.code);
      expect(step?.expectedStatus, id).toBe("compile-error");
      expect(step?.expectedError, id).toMatch(/^E0/);
      expect(
        step?.evaluator &&
          evaluate(step.evaluator, {
            code: step.code,
            result: {
              status: "compile-error",
              stdout: "",
              stderr: "borrow of moved value",
              diagnostics: [
                {
                  level: "error",
                  code: step.expectedError,
                  message: "borrow of moved value",
                },
              ],
              durationMs: 0,
            },
          }).passed,
        id,
      ).toBe(false);
    }
  });

  it("validates every module and rejects cross-module ownership and cycles", () => {
    const second = {
      ...ownershipModule,
      id: "second",
      lessonIds: [],
      prerequisites: [ownershipModule.id],
      assessmentId: `${lessons[0].id}/${lessons[0].steps[0].id}`,
      gateCriteria: [],
    };
    const errors = validateContent({
      ...bundle,
      modules: [{ ...ownershipModule, prerequisites: [second.id] }, second],
    } as ContentBundle);
    expect(
      errors.some((error) => error.includes("module prerequisite cycle")),
    ).toBe(true);
    expect(
      errors.some((error) => error.includes("assessment outside module")),
    ).toBe(true);
  });

  it("rejects a lesson listed under a different module", () => {
    const errors = validateContent({
      ...bundle,
      modules: [
        ownershipModule,
        {
          ...ownershipModule,
          id: "other-module",
          lessonIds: [lessons[0].id],
          prerequisites: [],
        },
      ],
    } as ContentBundle);
    expect(
      errors.some((error) => error.includes("declares another module")),
    ).toBe(true);
  });

  it("rejects repeated retrieval placeholders and missing active reviews", () => {
    const errors = validateContent({
      ...bundle,
      concepts: concepts.map((concept) => ({
        ...concept,
        reviewAnswer: "A generic answer for everything.",
      })),
      reviewExercises: {},
    });
    expect(
      errors.some((error) => error.includes("duplicate retrieval answer")),
    ).toBe(true);
    expect(
      errors.some((error) => error.includes("no active review exercise")),
    ).toBe(true);
  });
});

describe("ownership evidence authoring validation", () => {
  function changedStep(
    change: (step: Lesson["steps"][number]) => void,
    lessonId = "borrow-intro",
    stepId = "borrow-conflict",
  ) {
    const copy = structuredClone(bundle);
    const step = copy.lessons
      .find((item) => item.id === lessonId)!
      .steps.find((item) => item.id === stepId)!;
    change(step);
    return validateContent(copy).filter((error) =>
      /evidence|coding task|counted gate/.test(error),
    );
  }
  it("accepts precise empty claims and different subsets of one family in the real catalog", () => {
    expect(validateContent(bundle)).toEqual([]);
    expect(
      changedStep((step) => {
        step.evidence = { version: 2, conceptIds: [] };
      }),
    ).toEqual([]);
  });
  it.each([0, -1, 1.5, 1, 3])(
    "rejects invalid or calibration-mismatched step version %s",
    (version) => {
      expect(
        changedStep((step) => {
          step.evidence!.version = version;
        }),
      ).not.toEqual([]);
    },
  );
  it.each([
    { ids: ["unknown"] },
    { ids: ["mutable-borrow", "mutable-borrow"] },
    { ids: ["copy-semantics"] },
  ])(
    "rejects a concept list outside the known unique lesson subset %j",
    ({ ids }) => {
      expect(
        changedStep((step) => {
          step.evidence!.conceptIds = ids;
        }),
      ).not.toEqual([]);
    },
  );
  it("requires metadata for calibrated lesson steps and singleton reviews", () => {
    expect(
      changedStep((step) => {
        delete step.evidence;
      }),
    ).not.toEqual([]);
    const copy = structuredClone(bundle);
    delete copy.reviewExercises["mutable-borrow"].evidence;
    expect(
      validateContent(copy).some((error) => error.includes("evidence")),
    ).toBe(true);
    copy.reviewExercises["mutable-borrow"].evidence = {
      version: 2,
      conceptIds: ["shared-borrow"],
    };
    expect(
      validateContent(copy).some((error) => error.includes("evidence")),
    ).toBe(true);
  });
  it.each([
    (step: Lesson["steps"][number]) => {
      step.evidence!.codingTaskId = " ";
    },
    (step: Lesson["steps"][number]) => {
      step.evidence!.conceptIds = [];
    },
    (step: Lesson["steps"][number]) => {
      step.evidenceKind = "prediction";
    },
    (step: Lesson["steps"][number]) => {
      step.evaluator = { kind: "exact-output", expected: "hi!" };
    },
  ])("rejects unauditable coding families", (change) => {
    expect(changedStep(change)).not.toEqual([]);
  });
  it("rejects conflicting versions of a shared coding family", () => {
    const copy = structuredClone(bundle);
    const a = copy.lessons
      .find((item) => item.id === "adversarial-no-clone")!
      .steps.find((item) => item.id === "adversarial-code")!;
    const b = copy.lessons
      .find((item) => item.id === "scenario-assessment")!
      .steps.find((item) => item.id === "assessment-repair")!;
    b.evidence!.version = a.evidence!.version + 1;
    expect(
      validateContent(copy).some((error) => error.includes("coding task")),
    ).toBe(true);
  });
  it.each([0, -1, 1.5, 4])(
    "rejects an impossible counted gate requirement %s",
    (required) => {
      const copy = structuredClone(bundle);
      copy.modules
        .find((item) => item.id === "ownership")!
        .gateCriteria!.find(
          (item) => item.id === "borrowing",
        )!.requiredIndependentCodingTasks = required;
      expect(
        validateContent(copy).some((error) => error.includes("counted gate")),
      ).toBe(true);
    },
  );
  it("counts stable families rather than repeated refs for a counted gate", () => {
    const copy = structuredClone(bundle);
    const replace = copy.lessons
      .find((item) => item.id === "borrow-intro")!
      .steps.find((item) => item.id === "borrow-mutable-run")!;
    replace.evidence!.codingTaskId = "ownership/mutate-append";
    const surround = copy.lessons
      .find((item) => item.id === "adversarial-no-clone")!
      .steps.find((item) => item.id === "adversarial-conflict")!;
    surround.evidence!.codingTaskId = "ownership/mutate-append";
    expect(
      validateContent(copy).some((error) => error.includes("counted gate")),
    ).toBe(true);
  });
});
