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
import { auditLessonEvidence } from "@/domain/lesson-evidence-role";
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
      check("https://docs.rs/tokio/1.54.1/tokio/task/fn.spawn.html"),
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
      "https://docs.rs/unrelated/1.54.1/tokio/",
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
          trustedFixtureTarget: "cargo-tokio-runtime-1.54.1" as const,
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
      lessons.some((lesson) =>
        lesson.steps.some((step) => step.evidenceKind === "recall"),
      ),
    ).toBe(true);
    expect(lessons.some((lesson) => lesson.id.includes("adversarial"))).toBe(
      true,
    );
    expect(project.adversarialInject.toLowerCase()).toContain("clone");
  });

  it("keeps long recovery lessons bound to their reviewed suffix and session break", () => {
    for (const id of ["service-client-bounded-retry", "service-client-ambiguous-driver", "documentation-guided-repair", "string-and-utf8"]) {
      const lesson = lessons.find(item => item.id === id)!;
      const invalid = [
        { ...lesson, sessionStops: [] },
        { ...lesson, steps: [...lesson.steps.slice(0, -1), { ...lesson.steps.at(-1)!, id: "unreviewed-extension" }] },
      ];
      for (const change of invalid) {
        expect(validateContent({ ...bundle, lessons: lessons.map(item => item.id === id ? change : item) }))
          .toContainEqual(expect.stringContaining(`lesson ${id} must have 5-9 steps`));
      }
    }
  });

  it("admits the historical and current authored MutSlot append shapes", () => {
    const mutSlot = lessons.find(
      (lesson) => lesson.id === "unsafe-miri-mut-slot",
    )!;
    const sizeErrors = (candidate: Lesson) =>
      validateContent({
        ...bundle,
        lessons: lessons.map((lesson) =>
          lesson.id === mutSlot.id ? candidate : lesson,
        ),
      }).filter((error) => error.includes("steps"));

    expect(sizeErrors(mutSlot)).toEqual([]);
    expect(sizeErrors({ ...mutSlot, steps: mutSlot.steps.slice(0, 10) })).toEqual([]);
    expect(sizeErrors({
      ...mutSlot, steps: [...mutSlot.steps.slice(0, 10), { ...mutSlot.steps[10], id: "unrelated-transfer" }],
    })).not.toEqual([]);
    expect(sizeErrors({ ...mutSlot, sessionStops: undefined })).not.toEqual([]);
    expect(
      sizeErrors({
        ...mutSlot,
        sessionStops: mutSlot.sessionStops?.map((stop) => ({
          ...stop,
          afterStepId: "mut-slot-with-mut-transfer",
        })),
      }),
    ).not.toEqual([]);
    expect(
      sizeErrors({ ...mutSlot, id: "unrelated-ten-step-lesson" }),
    ).not.toEqual([]);
    expect(
      sizeErrors({
        ...mutSlot,
        steps: [
          ...mutSlot.steps,
          { ...mutSlot.steps[0], id: "mut-slot-with-mut-extra" },
        ],
      }),
    ).not.toEqual([]);
    expect(
      sizeErrors({
        ...mutSlot,
        steps: mutSlot.steps.map((step, index) =>
          index === 9 ? { ...step, id: "mut-slot-with-mut-renamed" } : step,
        ),
      }),
    ).not.toEqual([]);
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

describe("practice-only lesson evidence role", () => {
  const roleInput = () => ({
    lessons: bundle.lessons,
    modules: bundle.modules,
    projects: [...(bundle.projects ?? []), bundle.project],
  });

  it("allows the authored A6 practice lesson and reports it outside required gates", () => {
    expect(validateContent(bundle)).toEqual([]);
    const audit = auditLessonEvidence(roleInput());
    expect(audit.practiceOnlyLessons).toContain(
      "api-frame-protocol-maintenance",
    );
    expect(audit.lessonsWithoutEvidence).not.toContain(
      "api-frame-protocol-maintenance",
    );
    expect(audit.errors).toEqual([]);
  });

  it("still reports an unmarked lesson without a non-rubric evidence gate", () => {
    const copy = structuredClone(bundle);
    const lesson = copy.lessons.find((item) => item.id === "borrow-intro")!;
    for (const step of lesson.steps) step.evidenceGate = false;
    const audit = auditLessonEvidence({
      lessons: copy.lessons,
      modules: copy.modules,
      projects: [...(copy.projects ?? []), copy.project],
    });
    expect(audit.lessonsWithoutEvidence).toContain("borrow-intro");
  });

  it("rejects a practice-only lesson that declares a primary coding task", () => {
    const copy = structuredClone(bundle);
    const lesson = copy.lessons.find(
      (item) => item.id === "api-frame-protocol-maintenance",
    )!;
    lesson.steps[0].evidence = {
      version: 1,
      conceptIds: lesson.conceptIds,
      codingTaskId: "api-frame-primary",
    };
    const errors = validateContent(copy);
    expect(errors.some((error) => error.includes("practice-only"))).toBe(true);
  });

  it("rejects a module gate task reference to a practice-only lesson", () => {
    const copy = structuredClone(bundle);
    copy.modules
      .find((module) => module.id === "public-api-workspaces")!
      .gateCriteria![0].taskRefs.push({
        lessonId: "api-frame-protocol-maintenance",
        stepId: "api-frame-protocol-maintenance-challenge",
      });
    const errors = validateContent(copy);
    expect(errors.some((error) => error.includes("module gate"))).toBe(true);
  });

  it("rejects module assessment and project primary references to practice-only lessons", () => {
    const copy = structuredClone(bundle);
    const courseModule = copy.modules.find(
      (item) => item.id === "public-api-workspaces",
    )!;
    courseModule.assessmentId = "api-frame-protocol-maintenance-recall";
    const project = copy.projects!.find(
      (item) => item.id === "frame-protocol",
    )!;
    project.lessonId = "api-frame-protocol-maintenance";
    const errors = validateContent(copy);
    expect(
      errors.filter((error) => error.includes("practice-only")),
    ).toHaveLength(2);
  });

  it.each([
    "api-frame-protocol-maintenance",
    "api-frame-protocol-maintenance/api-frame-protocol-maintenance-recall",
    "api-frame-protocol-maintenance-recall",
  ])("rejects a practice-only module assessment using %s", (assessmentId) => {
    const copy = structuredClone(bundle);
    copy.modules.find(
      (item) => item.id === "public-api-workspaces",
    )!.assessmentId = assessmentId;
    const errors = validateContent(copy);
    expect(errors.some((error) => error.includes("as its assessment"))).toBe(
      true,
    );
  });

  it.each([
    ["ordinary-first", false],
    ["practice-first", true],
  ])(
    "does not let an %s same-step collision hide a practice-only module assessment",
    (_, practiceFirst) => {
      const source = bundle.lessons.find(
        (item) => item.id === "api-frame-protocol-maintenance",
      )!;
      const ordinary = structuredClone(source);
      delete (
        ordinary as Omit<Lesson, "practiceOnly"> & { practiceOnly?: unknown }
      ).practiceOnly;
      ordinary.id = "api-frame-ordinary-collision";
      ordinary.steps = [structuredClone(ordinary.steps[0])];
      ordinary.steps[0].id = "shared-assessment-step";
      const practice = structuredClone(source);
      practice.id = "api-frame-practice-collision";
      practice.steps = [structuredClone(practice.steps[0])];
      practice.steps[0].id = "shared-assessment-step";
      const lessons = practiceFirst
        ? [practice, ordinary]
        : [ordinary, practice];
      const courseModule = structuredClone(
        bundle.modules.find((item) => item.id === "public-api-workspaces")!,
      );
      courseModule.id = "assessment-collision-module";
      courseModule.lessonIds = [ordinary.id, practice.id];
      courseModule.assessmentId = "shared-assessment-step";
      const audit = auditLessonEvidence({
        lessons,
        modules: [courseModule],
        projects: [],
      });
      expect(
        audit.errors.some((error) => error.includes("as its assessment")),
      ).toBe(true);
    },
  );

  it("does not reject a bare assessment step from another module's practice lesson", () => {
    const source = bundle.lessons.find(
      (item) => item.id === "api-frame-protocol-maintenance",
    )!;
    const ordinary = structuredClone(source);
    delete (
      ordinary as Omit<Lesson, "practiceOnly"> & { practiceOnly?: unknown }
    ).practiceOnly;
    ordinary.id = "api-frame-ordinary-module-assessment";
    ordinary.steps = [structuredClone(ordinary.steps[0])];
    ordinary.steps[0].id = "shared-assessment-step";
    const practice = structuredClone(source);
    practice.id = "api-frame-other-module-practice";
    practice.moduleId = "other-module";
    practice.steps = [structuredClone(practice.steps[0])];
    practice.steps[0].id = "shared-assessment-step";
    const courseModule = structuredClone(
      bundle.modules.find((item) => item.id === "public-api-workspaces")!,
    );
    courseModule.id = "ordinary-assessment-module";
    courseModule.lessonIds = [ordinary.id];
    courseModule.assessmentId = "shared-assessment-step";
    const audit = auditLessonEvidence({
      lessons: [ordinary, practice],
      modules: [courseModule],
      projects: [],
    });
    expect(audit.errors).toEqual([]);
  });

  it("uses module lesson membership before global bare-step matches", () => {
    const source = bundle.lessons.find(
      (item) => item.id === "api-frame-protocol-maintenance",
    )!;
    const ordinary = structuredClone(source);
    delete (
      ordinary as Omit<Lesson, "practiceOnly"> & { practiceOnly?: unknown }
    ).practiceOnly;
    ordinary.id = "api-frame-global-ordinary";
    ordinary.steps = [structuredClone(ordinary.steps[0])];
    ordinary.steps[0].id = "module-selected-step";
    const practice = structuredClone(source);
    practice.id = "api-frame-module-practice";
    practice.steps = [structuredClone(practice.steps[0])];
    practice.steps[0].id = "module-selected-step";
    const courseModule = structuredClone(
      bundle.modules.find((item) => item.id === "public-api-workspaces")!,
    );
    courseModule.id = "module-membership-selection";
    courseModule.lessonIds = [practice.id];
    courseModule.assessmentId = "module-selected-step";
    const audit = auditLessonEvidence({
      lessons: [ordinary, practice],
      modules: [courseModule],
      projects: [],
    });
    expect(
      audit.errors.some((error) => error.includes("as its assessment")),
    ).toBe(true);
  });

  it("rejects an explicitly false or unknown practice-only role", () => {
    const copy = structuredClone(bundle);
    const lesson = copy.lessons.find(
      (item) => item.id === "api-frame-protocol-maintenance",
    )! as Omit<Lesson, "practiceOnly"> & { practiceOnly?: unknown };
    lesson.practiceOnly = false;
    const errors = validateContent(copy);
    expect(errors.some((error) => error.includes("practiceOnly"))).toBe(true);
  });
});

describe("session-stop authored metadata validation", () => {
  type AuthoredSessionStop = {
    afterStepId: string;
    title: string;
    nextGoal: string;
  };
  type MutableLessonWithSessionStops = Omit<Lesson, "sessionStops"> & {
    sessionStops?: unknown;
  };
  type AuthoredLessonWithSessionStops = Omit<Lesson, "sessionStops"> & {
    sessionStops?: AuthoredSessionStop[];
  };

  const validStops: Record<string, AuthoredSessionStop[]> = {
    "todo-command-parser": [
      {
        afterStepId: "parser-explain",
        title: "Zatrzymaj się po wyjaśnieniu parsera",
        nextGoal: "Przenieś reguły parsera do kolejnego zadania.",
      },
      {
        afterStepId: "parser-add-gate",
        title: "Zatrzymaj się po bramce Add",
        nextGoal: "Sprawdź transfer parsera na innych komendach.",
      },
    ],
    "todo-state-invariants": [
      {
        afterStepId: "state-explain",
        title: "Zatrzymaj się po wyjaśnieniu stanu",
        nextGoal: "Przejdź do bramki poprawnej operacji Add i Done.",
      },
      {
        afterStepId: "state-add-done-gate",
        title: "Zatrzymaj się po bramce Add i Done",
        nextGoal: "Sprawdź bramkę listowania i transfer.",
      },
    ],
    "todo-session-project": [
      {
        afterStepId: "session-explain",
        title: "Zatrzymaj się po wyjaśnieniu sesji",
        nextGoal: "Uruchom bramkę sesji z błędem pośrodku.",
      },
      {
        afterStepId: "session-run-gate",
        title: "Zatrzymaj się po bramce sesji",
        nextGoal: "Porównaj sesję zwykłą ze ścisłą.",
      },
    ],
    "todo-storage-format": [
      {
        afterStepId: "format-explain",
        title: "Zatrzymaj się po wyjaśnieniu formatu",
        nextGoal: "Sprawdź bramkę kodowania i dekodowania.",
      },
      {
        afterStepId: "format-gate",
        title: "Zatrzymaj się po bramce formatu",
        nextGoal: "Obserwuj zachowanie przy uszkodzonym wierszu.",
      },
    ],
    "todo-file-persistence": [
      {
        afterStepId: "file-explain",
        title: "Zatrzymaj się po wyjaśnieniu pliku",
        nextGoal: "Sprawdź bramkę zapisu i odczytu.",
      },
      {
        afterStepId: "file-gate",
        title: "Zatrzymaj się po bramce pliku",
        nextGoal: "Obserwuj bezpieczne zastępowanie pliku.",
      },
    ],
    "todo-terminal-cli": [
      {
        afterStepId: "cli-explain",
        title: "Zatrzymaj się po wyjaśnieniu CLI",
        nextGoal: "Sprawdź bramkę wykonania komendy.",
      },
      {
        afterStepId: "cli-gate",
        title: "Zatrzymaj się po bramce CLI",
        nextGoal: "Przejdź do odczytu wejścia i lokalnej praktyki.",
      },
    ],
  };

  const expectedStepIds: Record<string, string[]> = {
    "todo-command-parser": [
      "parser-predict",
      "parser-run",
      "parser-explain",
      "parser-debug",
      "parser-add-gate",
      "parser-transfer",
      "parser-recall",
      "todo-import-command",
    ],
    "todo-state-invariants": [
      "state-predict",
      "state-run",
      "state-explain",
      "state-debug",
      "state-add-done-gate",
      "state-list-gate",
      "state-transfer",
      "state-recall",
      "todo-board-edits",
    ],
    "todo-session-project": [
      "session-predict",
      "session-run",
      "session-explain",
      "session-debug",
      "session-run-gate",
      "session-strict-gate",
      "session-recall",
      "session-blank",
      "todo-session-replay",
    ],
    "todo-storage-format": [
      "format-predict",
      "format-run",
      "format-explain",
      "format-debug",
      "format-gate",
      "format-observe",
      "format-recall",
      "format-length-prefixed-texts",
    ],
    "todo-file-persistence": [
      "file-predict",
      "file-run",
      "file-explain",
      "file-debug",
      "file-gate",
      "file-observe",
      "file-recall",
      "file-replace-current-text",
    ],
    "todo-terminal-cli": [
      "cli-predict",
      "cli-streams-run",
      "cli-explain",
      "cli-debug",
      "cli-gate",
      "cli-recall",
      "cli-input-boundary",
      "cli-local-practice",
    ],
  };

  function withSessionStops(
    lessonId: string,
    sessionStops: unknown,
  ): ContentBundle {
    const copy = structuredClone(bundle);
    const lesson = copy.lessons.find((item) => item.id === lessonId);
    expect(lesson).toBeDefined();
    (lesson as MutableLessonWithSessionStops).sessionStops = sessionStops;
    return copy;
  }

  function expectActionableSessionStopError(
    content: ContentBundle,
    lessonId: string,
  ) {
    const errors = validateContent(content);
    expect(
      errors.some(
        (error) =>
          error.includes(lessonId) && /session[-\s]*stops?/i.test(error),
      ),
    ).toBe(true);
  }

  it("accepts the exact ordered pair for each of the six packet lessons", () => {
    const copy = structuredClone(bundle);
    for (const [lessonId, sessionStops] of Object.entries(validStops)) {
      const lesson = copy.lessons.find((item) => item.id === lessonId);
      expect(lesson).toBeDefined();
      (lesson as MutableLessonWithSessionStops).sessionStops =
        structuredClone(sessionStops);
    }

    expect(validateContent(copy)).toEqual([]);
    for (const [lessonId, stepIds] of Object.entries(expectedStepIds)) {
      expect(
        copy.lessons
          .find((item) => item.id === lessonId)
          ?.steps.map((step) => step.id),
      ).toEqual(stepIds);
    }
  });

  it("authors the exact ordered stop pair on all six packet lessons", () => {
    const actual = Object.fromEntries(
      Object.keys(validStops).map((lessonId) => {
        const lesson = lessons.find((item) => item.id === lessonId)!;
        return [
          lessonId,
          (lesson as AuthoredLessonWithSessionStops).sessionStops,
        ];
      }),
    );
    expect(actual).toEqual(validStops);
  });

  it("rejects an unknown session-stop step ID", () => {
    const stops = structuredClone(validStops["todo-command-parser"]);
    stops[0].afterStepId = "parser-does-not-exist";
    expectActionableSessionStopError(
      withSessionStops("todo-command-parser", stops),
      "todo-command-parser",
    );
  });

  it("rejects a session-stop step ID from another lesson", () => {
    const stops = structuredClone(validStops["todo-command-parser"]);
    stops[0].afterStepId = "state-explain";
    expectActionableSessionStopError(
      withSessionStops("todo-command-parser", stops),
      "todo-command-parser",
    );
  });

  it("rejects duplicate session-stop step IDs", () => {
    const stops = structuredClone(validStops["todo-command-parser"]);
    stops[1].afterStepId = stops[0].afterStepId;
    expectActionableSessionStopError(
      withSessionStops("todo-command-parser", stops),
      "todo-command-parser",
    );
  });

  it("rejects unordered session stops", () => {
    const stops = structuredClone(validStops["todo-command-parser"]);
    [stops[0], stops[1]] = [stops[1], stops[0]];
    expectActionableSessionStopError(
      withSessionStops("todo-command-parser", stops),
      "todo-command-parser",
    );
  });

  it("rejects a malformed session-stop entry", () => {
    expectActionableSessionStopError(
      withSessionStops("todo-command-parser", [
        { afterStepId: "parser-explain", title: "tylko tytuł" },
      ]),
      "todo-command-parser",
    );
  });

  it.each([
    ["null", null],
    ["string", "not-an-entry"],
    ["number", 42],
  ])(
    "rejects a malformed %s session-stop entry without throwing",
    (_, entry) => {
      const content = withSessionStops("todo-command-parser", [entry]);
      expect(() => validateContent(content)).not.toThrow();
      expectActionableSessionStopError(content, "todo-command-parser");
    },
  );

  it("rejects non-array session-stop metadata", () => {
    expectActionableSessionStopError(
      withSessionStops("todo-command-parser", "not-an-array"),
      "todo-command-parser",
    );
  });

  it("rejects a whitespace-only session-stop title", () => {
    const stops = structuredClone(validStops["todo-command-parser"]);
    stops[0].title = " \t ";
    expectActionableSessionStopError(
      withSessionStops("todo-command-parser", stops),
      "todo-command-parser",
    );
  });

  it("rejects a whitespace-only session-stop next goal", () => {
    const stops = structuredClone(validStops["todo-command-parser"]);
    stops[0].nextGoal = " \n ";
    expectActionableSessionStopError(
      withSessionStops("todo-command-parser", stops),
      "todo-command-parser",
    );
  });

  it("keeps all six lesson step ID arrays unchanged when stops are authored", () => {
    const copy = structuredClone(bundle);
    const before = Object.fromEntries(
      Object.keys(expectedStepIds).map((lessonId) => [
        lessonId,
        copy.lessons
          .find((item) => item.id === lessonId)!
          .steps.map((step) => step.id),
      ]),
    );
    for (const [lessonId, sessionStops] of Object.entries(validStops)) {
      const lesson = copy.lessons.find((item) => item.id === lessonId)!;
      (lesson as MutableLessonWithSessionStops).sessionStops =
        structuredClone(sessionStops);
    }

    expect(validateContent(copy)).toEqual([]);
    expect(before).toEqual(expectedStepIds);
    expect(
      Object.fromEntries(
        Object.keys(expectedStepIds).map((lessonId) => [
          lessonId,
          copy.lessons
            .find((item) => item.id === lessonId)!
            .steps.map((step) => step.id),
        ]),
      ),
    ).toEqual(expectedStepIds);
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

it("rejects a review scaffold that discloses an unknown task", () => {
  const key = "struct-records";
  const review = { ...reviewExercises[key], suppliedSolutions: { code: [{ lessonId: "missing", stepId: "task" }] } };
  const errors = validateContent({ ...bundle, reviewExercises: { ...reviewExercises, [key]: review } });
  expect(errors).toContain("review-struct-records supplies an unknown solution: missing/task");
});
