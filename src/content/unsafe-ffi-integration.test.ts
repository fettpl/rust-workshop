import { historicalBeforeSendHandoff } from "./async-lending-send-compatibility-fixture";
import { historicalBeforeCancellationTransfer } from "./async-lending-cancel-compatibility-fixture";
import { historicalBeforeDocumentationRepair } from "./documentation-guided-repair-compatibility-fixture";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { moduleGate, recordEvidence } from "../engine/learning";
import { createInitialState } from "../persistence/state";
import {
  unsafeFfiConcepts,
  unsafeFfiLessons,
  unsafeFfiModule,
  unsafeFfiReviewExercises,
  unsafeFfiSources,
} from "./unsafe-ffi";
import * as currentCourse from "./course";
import { historicalBeforeFallibleComposition } from "./fallible-composition-compatibility-fixture";
import { historicalBeforeInitializedPrefix } from "./unsafe-miri-prefix-compatibility-fixture";
const { concepts, lessons, modules, projects, roadmap, sources } =
  historicalBeforeFallibleComposition(
    historicalBeforeDocumentationRepair(
      historicalBeforeSendHandoff(
        historicalBeforeCancellationTransfer(
          historicalBeforeInitializedPrefix(currentCourse),
        ),
      ),
    ),
  );
import {
  nestedPatternConcepts,
  nestedPatternLessons,
  nestedPatternSources,
} from "./nested-patterns";
import { functionOwnershipCalibrationLesson } from "./function-ownership-calibration";
import { sharedBorrowCalibrationLesson } from "./shared-borrow-calibration";

const lessonIds = [
  "unsafe-ffi-checked-view",
  "unsafe-ffi-split-regions",
  "unsafe-ffi-raw-record",
  "unsafe-ffi-owned-handle",
];

it("keeps four unsafe FFI lessons with explicit executable contracts", () => {
  expect(unsafeFfiLessons.map((lesson) => lesson.id)).toEqual(lessonIds);
  expect(unsafeFfiConcepts).toHaveLength(4);
  expect(unsafeFfiModule.lessonIds).toEqual(lessonIds);
  expect(unsafeFfiModule.gateCriteria).toHaveLength(4);

  for (const lesson of unsafeFfiLessons) {
    expect(lesson.steps.some((step) => step.kind === "predict")).toBe(true);
    expect(lesson.steps.some((step) => step.kind === "run")).toBe(true);
    expect(lesson.steps.some((step) => step.kind === "explain")).toBe(true);
    expect(lesson.steps.filter((step) => step.evidenceGate).length).toBe(2);
    expect(lesson.steps.filter((step) => step.kind === "blank")).toHaveLength(
      1,
    );
    expect(
      lesson.steps.filter(
        (step) => step.kind === "recall" && step.evaluator?.kind === "tests",
      ),
    ).toHaveLength(1);
    expect(unsafeFfiReviewExercises[lesson.conceptIds[0]]).toBeDefined();
  }
});

it("publishes the unsafe view preconditions and observable C record contract", () => {
  const checkedView = unsafeFfiLessons
    .find((lesson) => lesson.id === "unsafe-ffi-checked-view")!
    .steps.find((step) => step.id === "checked-view-blank")!;
  expect(checkedView.prompt).toMatch(/unsafe fn checked_view/);
  expect(checkedView.prompt).toMatch(/non-null|niezerowy/i);
  expect(checkedView.prompt).toMatch(/initialized|zainicjaliz/i);
  expect(checkedView.prompt).toMatch(/alive|żyw/i);
  expect(checkedView.prompt).toMatch(/isize::MAX/);
  expect(checkedView.prompt).toMatch(/non-wrapping|zawij/i);
  expect(checkedView.solution).toMatch(/isize::MAX/);
  expect(checkedView.solution).toMatch(/non-wrapping|zawij|wrap/i);
  const equivalent = unsafeFfiLessons
    .find((lesson) => lesson.id === "unsafe-ffi-checked-view")!
    .steps.find((step) => step.id === "checked-view-contract-gate")!;
  expect(equivalent.solution).toMatch(/isize::MAX/);
  expect(equivalent.solution).toMatch(/non-wrapping|zawij|wrap/i);

  const explanation = unsafeFfiLessons
    .find((lesson) => lesson.id === "unsafe-ffi-checked-view")!
    .steps.find((step) => step.id === "checked-view-explain")!;
  expect(explanation.rubric?.join(" ")).toMatch(/narusza precondition/i);
  expect(explanation.rubric?.join(" ")).not.toMatch(/daje `None`/i);

  const rawRecord = unsafeFfiLessons
    .find((lesson) => lesson.id === "unsafe-ffi-raw-record")!
    .steps.find((step) => step.id === "raw-record-blank")!;
  expect(rawRecord.prompt).toMatch(
    /#\[repr\(C\)\].*RawRecord.*tag:\s*u8.*flags:\s*u16.*value:\s*i64/s,
  );
  expect(rawRecord.prompt).toMatch(/Debug.*Clone.*Copy.*PartialEq.*Eq/s);
  expect(rawRecord.prompt).toMatch(/InvalidTag.*InvalidFlags/s);
  expect(rawRecord.solution).toMatch(
    /#\[repr\(C\)\]\s*\n#\[derive\(Debug, Clone, Copy, PartialEq, Eq\)\]\s*\nstruct RawRecord/s,
  );
  expect(rawRecord.evaluator?.kind).toBe("tests");
  if (rawRecord.evaluator?.kind === "tests") {
    expect(rawRecord.evaluator.tests).toMatch(/offset_of!\(RawRecord, tag\)/);
    expect(rawRecord.evaluator.tests).toMatch(/offset_of!\(RawRecord, flags\)/);
    expect(rawRecord.evaluator.tests).toMatch(/offset_of!\(RawRecord, value\)/);
    expect(rawRecord.evaluator.tests).toMatch(/size_of::<RawRecord>\(\), 16/);
  }
});

it("keeps the release fixture serialized and the RAII API internally allocating", () => {
  const owned = unsafeFfiLessons.find(
    (lesson) => lesson.id === "unsafe-ffi-owned-handle",
  )!;
  const blank = owned.steps.find((step) => step.id === "owned-handle-blank")!;
  expect(blank.prompt).toMatch(/RELEASES/);
  expect(blank.prompt).toMatch(/Ordering/);
  expect(blank.prompt).toMatch(/fixture_alloc/);
  expect(blank.prompt).toMatch(/fixture_free/);

  const tests = owned.steps.find(
    (step) => step.id === "owned-handle-gate",
  )!.evaluator;
  expect(tests?.kind).toBe("tests");
  if (tests?.kind === "tests") {
    expect(tests.tests.match(/#\[test\]/g)).toHaveLength(1);
  }
});

it("uses each gate and blank as an independent module criterion", () => {
  let state = createInitialState();
  expect(moduleGate(state, unsafeFfiLessons, unsafeFfiModule).passed).toBe(
    false,
  );

  for (const criterion of unsafeFfiModule.gateCriteria ?? []) {
    for (const ref of criterion.taskRefs) {
      const lesson = unsafeFfiLessons.find(
        (candidate) => candidate.id === ref.lessonId,
      )!;
      const step = lesson.steps.find(
        (candidate) => candidate.id === ref.stepId,
      )!;
      state = recordEvidence(state, {
        id: `unsafe/${ref.lessonId}/${ref.stepId}`,
        conceptIds: lesson.conceptIds,
        lessonId: lesson.id,
        stepId: step.id,
        kind: step.evidenceKind,
        passed: true,
        hints: 0,
        revealed: false,
        gate: true,
        evaluator: step.evaluator?.kind,
        at: state.updatedAt + 1,
      });
    }
  }

  expect(moduleGate(state, unsafeFfiLessons, unsafeFfiModule).passed).toBe(
    true,
  );
  expect(
    unsafeFfiModule.gateCriteria?.every(
      (criterion) => criterion.taskRefs.length === 2,
    ),
  ).toBe(true);
});

it("keeps Unsafe/FFI registered after Profile Evidence and before Service Operations", () => {
  expect(modules).toHaveLength(48);
  // Frozen post-PR40/PR41 pre-nested catalog cut plus the accepted nested exports.
  expect(lessons).toHaveLength(186 + nestedPatternLessons.length + 2);
  expect(lessons.at(-2)).toEqual(functionOwnershipCalibrationLesson);
  expect(lessons.at(-1)).toEqual(sharedBorrowCalibrationLesson);
  expect(concepts).toHaveLength(190 + nestedPatternConcepts.length);
  // Preserve the historical 332-source base. The nested export now includes
  // two approved pattern references; baseline correction adds five elsewhere.
  expect(sources).toHaveLength(332 + nestedPatternSources.length + 5);
  const nestedBlankSteps = nestedPatternLessons
    .flatMap((lesson) => lesson.steps)
    .filter((step) => step.kind === "blank").length;
  expect(
    lessons
      .flatMap((lesson) => lesson.steps)
      .filter((step) => step.kind === "blank"),
    // Three baseline blanks are outside the newly extended nested lesson.
  ).toHaveLength(141 + nestedBlankSteps + 3);
  const index = modules.findIndex((entry) => entry.id === unsafeFfiModule.id);
  expect(index).toBe(modules.length - 5);
  expect(unsafeFfiModule.prerequisites).toEqual(["performance-evidence"]);
  expect(modules[index - 1].id).toBe("profile-evidence");
  expect(modules[index - 2].id).toBe("performance-evidence");
  expect(modules[index + 1].id).toBe("unsafe-miri-contracts");
  expect(modules[index + 2].id).toBe("unsafe-borrowed-memory-soundness");
  expect(modules[index + 3].id).toBe("service-operations");
  expect(unsafeFfiSources).toHaveLength(4);
  expect(
    roadmap.find((entry) => entry.title.startsWith("Unsafe i FFI"))?.status,
  ).toBe("available");

  const project = projects.find((entry) => entry.id === "ffi-buffer");
  expect(project?.package?.id).toBe("ffi-buffer-workshop");
  expect(projects).toHaveLength(13);
  expect(project?.package?.revealStepRefs).toHaveLength(4);
  expect(project?.lessonIds).toEqual(unsafeFfiModule.lessonIds);

  const miriProject = projects.find((entry) => entry.id === "miri-safety");
  expect(miriProject?.package?.id).toBe("miri-safety-workshop");
  expect(miriProject?.package?.revealStepRefs).toHaveLength(4);
});

it("runs the FFI verifier before generic Cargo archives in both CI jobs", () => {
  const packageJson = JSON.parse(
    readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
  ) as { scripts?: Record<string, string> };
  expect(packageJson.scripts?.["precontent:ffi"]).toBe(
    "npm run content:packages",
  );
  expect(packageJson.scripts?.["content:ffi"]).toBe(
    "node --import tsx scripts/verify-ffi.ts",
  );

  const ci = readFileSync(
    new URL("../../.github/workflows/ci.yml", import.meta.url),
    "utf8",
  );
  expect(ci).toMatch(
    /- run: npm run content:ffi\n[\s\S]*?- run: npm run content:capstone -- --fetch[\s\S]*?- run: npm run content:cargo/g,
  );
  expect(ci).toMatch(
    /content:performance -- --fetch --msrv[\s\S]*?- run: npm run content:ffi -- --msrv\n[\s\S]*?- run: npm run content:capstone -- --fetch --msrv[\s\S]*?- run: npm run content:cargo/,
  );
});

it("supports fetching the locked FFI dependencies before offline checks", () => {
  const verifier = readFileSync(
    new URL("../../scripts/verify-ffi.ts", import.meta.url),
    "utf8",
  );
  expect(verifier).toMatch(/argument === "--fetch" \|\| argument === "--msrv"/);
  expect(verifier).toMatch(
    /const fetchDependencies = args\.includes\("--fetch"\)/,
  );
  expect(verifier).toMatch(
    /if \(fetchDependencies\)[\s\S]*run\(packageRoot, \["fetch", "--locked"\]\)/,
  );
});
