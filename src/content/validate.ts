import { validateProjectPackage } from "../domain/project-package";
import {
  checkManifestContract,
  manifestContractIssues,
  manifestSyntaxIssues,
} from "../engine/manifest-contract";
import {
  hasRustTestAttribute,
  trustedFixtureIssues,
} from "../domain/trusted-fixtures";
import {
  delayedSharedCountLinesContract,
  frameTextContract,
} from "./ownership-evidence-contracts";
import type {
  Competency,
  Concept,
  CourseModule,
  Lesson,
  LessonStep,
  ProjectContract,
  Source,
  Trace,
} from "@/domain/types";

export interface ContentBundle {
  lessons: Lesson[];
  concepts: Concept[];
  competencies: Competency[];
  modules: CourseModule[];
  reviewExercises: Record<string, LessonStep>;
  delayedReviewExercises?: Record<string, LessonStep>;
  sources: Source[];
  traces: Record<string, Trace>;
  project: ProjectContract;
  projects?: ProjectContract[];
  roadmap?: Array<{ title: string; status: string }>;
}

const uniqueErrors = (errors: string[]) => [...new Set(errors)];

function manifestStepIssues(step: LessonStep): string[] {
  const errors: string[] = [];
  const evaluator = step.evaluator;
  if (evaluator?.kind === "manifest-contract" && step.editorMode !== "toml")
    errors.push("manifest evaluator requires TOML editor mode");
  if (step.editorMode !== "toml") return errors;
  if (
    step.expectedStatus ||
    step.expectedError ||
    step.expectedDiagnostic ||
    step.trustedFixtureTarget
  )
    errors.push(
      "TOML must not declare a Rust compiler status or fixture target",
    );
  if (
    evaluator &&
    ["tests", "compilation", "expected-error", "exact-output"].includes(
      evaluator.kind,
    )
  )
    errors.push("TOML must not use a Rust evaluator");
  for (const field of ["code", "solution"] as const) {
    if (step[field] !== undefined)
      errors.push(
        ...manifestSyntaxIssues(step[field]!).map(
          (issue) => `${field}: ${issue}`,
        ),
      );
  }
  if (evaluator?.kind === "manifest-contract") {
    errors.push(...manifestContractIssues(evaluator.contract));
    if (
      !step.solution?.trim() ||
      !checkManifestContract(step.solution, evaluator.contract).passed
    )
      errors.push("manifest solution does not satisfy its contract");
    if (
      step.code !== undefined &&
      checkManifestContract(step.code, evaluator.contract).passed
    )
      errors.push("manifest starter already satisfies its contract");
    if (step.kind === "blank" && step.code !== undefined)
      errors.push("blank manifest task must not provide starter code");
  }
  return errors;
}

function checkUnique(ids: string[], label: string, errors: string[]) {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) errors.push(`duplicate ${label} id: ${id}`);
    seen.add(id);
  }
}

function checkAcyclic(
  graph: Map<string, string[]>,
  label: string,
  errors: string[],
) {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string, path: string[]) => {
    if (visiting.has(id)) {
      errors.push(`${label} prerequisite cycle: ${[...path, id].join(" -> ")}`);
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const prerequisite of graph.get(id) ?? [])
      visit(prerequisite, [...path, id]);
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of graph.keys()) visit(id, []);
}

export function validateContent(content: ContentBundle): string[] {
  const errors: string[] = [];
  const lessonIds = new Set(content.lessons.map((lesson) => lesson.id));
  const conceptIds = new Set(content.concepts.map((concept) => concept.id));
  const competencyIds = new Set(
    content.competencies.map((competency) => competency.id),
  );
  const sourceIds = new Set(content.sources.map((source) => source.id));
  const traceIds = new Set(Object.keys(content.traces));
  const moduleIds = new Set(content.modules.map((module) => module.id));
  const stepsByRef = new Map<string, Lesson["steps"][number]>();
  const codingFamilies = new Map<
    string,
    { version: number; evaluator: string | undefined }
  >();
  const calibrationById = new Map(
    content.concepts.map((concept) => [
      concept.id,
      concept.evidenceCalibration,
    ]),
  );
  function evidenceIssues(step: LessonStep, scopeIds: string[], label: string) {
    const definition = step.evidence;
    const calibrations = scopeIds.flatMap((id) =>
      calibrationById.get(id) ? [calibrationById.get(id)!] : [],
    );
    if (!definition) {
      if (calibrations.length)
        errors.push(`${label} requires calibrated evidence metadata`);
      return;
    }
    if (!Number.isInteger(definition.version) || definition.version <= 0)
      errors.push(`${label} evidence version must be a positive integer`);
    if (
      new Set(definition.conceptIds).size !== definition.conceptIds.length ||
      definition.conceptIds.some(
        (id) => !conceptIds.has(id) || !scopeIds.includes(id),
      )
    )
      errors.push(
        `${label} evidence concepts must be a known unique subset of its scope`,
      );
    if (
      calibrations.some(
        (calibration) => calibration.version !== definition.version,
      )
    )
      errors.push(`${label} evidence version must match its calibration`);
    if (definition.codingTaskId !== undefined) {
      if (
        !definition.codingTaskId.trim() ||
        !definition.conceptIds.length ||
        step.evaluator?.kind !== "tests" ||
        !["fix", "transfer", "project", "assessment", "recall"].includes(
          step.evidenceKind,
        )
      )
        errors.push(
          `${label} coding task must have a nonempty identity and concepts with a tests-backed coding evidence kind`,
        );
      const previous = codingFamilies.get(definition.codingTaskId);
      if (
        previous &&
        (previous.version !== definition.version ||
          previous.evaluator !== step.evaluator?.kind ||
          previous.evaluator !== "tests")
      )
        errors.push(
          `${label} coding task family must share its version and tests evaluator`,
        );
      codingFamilies.set(definition.codingTaskId, {
        version: definition.version,
        evaluator: step.evaluator?.kind,
      });
    }
  }

  checkUnique(
    content.lessons.map((lesson) => lesson.id),
    "lesson",
    errors,
  );
  checkUnique(
    content.concepts.map((concept) => concept.id),
    "concept",
    errors,
  );
  checkUnique(
    content.competencies.map((competency) => competency.id),
    "competency",
    errors,
  );
  checkUnique(
    content.sources.map((source) => source.id),
    "source",
    errors,
  );
  checkUnique(Object.keys(content.traces), "trace", errors);
  checkUnique(
    content.modules.map((module) => module.id),
    "module",
    errors,
  );

  const conceptGraph = new Map<string, string[]>();
  checkUnique(
    content.concepts.map((concept) => concept.reviewAnswer.trim()),
    "retrieval answer",
    errors,
  );
  for (const concept of content.concepts) {
    conceptGraph.set(concept.id, concept.prerequisites);
    if (
      concept.evidenceCalibration &&
      (!Number.isInteger(concept.evidenceCalibration.version) ||
        concept.evidenceCalibration.version <= 0 ||
        !Number.isInteger(concept.evidenceCalibration.minimumCodingTasks) ||
        concept.evidenceCalibration.minimumCodingTasks <= 0)
    )
      errors.push(
        `concept ${concept.id} evidence calibration requires positive integers`,
      );
    if (
      !concept.title.trim() ||
      !concept.reviewPrompt.trim() ||
      !concept.reviewAnswer.trim() ||
      !concept.distinguish.trim()
    ) {
      errors.push(`concept ${concept.id} is missing review content`);
    }
    for (const prerequisite of concept.prerequisites) {
      if (!conceptIds.has(prerequisite))
        errors.push(
          `concept ${concept.id} has unknown prerequisite: ${prerequisite}`,
        );
    }
    for (const competencyId of concept.competencyIds) {
      if (!competencyIds.has(competencyId))
        errors.push(
          `concept ${concept.id} has unknown competency id: ${competencyId}`,
        );
    }
    const review = content.reviewExercises[concept.id];
    if (review) {
      evidenceIssues(review, [concept.id], `review ${concept.id}`);
      if (
        concept.evidenceCalibration &&
        (review.evidence?.conceptIds.length !== 1 ||
          review.evidence.conceptIds[0] !== concept.id)
      )
        errors.push(
          `review ${concept.id} evidence must claim exactly its concept`,
        );
      errors.push(
        ...manifestStepIssues(review).map(
          (error) => `review ${concept.id}: ${error}`,
        ),
      );
      errors.push(
        ...trustedFixtureIssues(review).map(
          (error) => `review ${concept.id}: ${error}`,
        ),
      );
      if (
        review.evaluator?.kind === "tests" &&
        !hasRustTestAttribute(review.evaluator.tests)
      )
        errors.push(
          `review ${concept.id} tests evaluator must contain a Rust #[test] or #[tokio::test]`,
        );
    }
    if (!review?.evaluator || !review.prompt.trim())
      errors.push(`concept ${concept.id} has no active review exercise`);
    else if (
      review.code !== undefined &&
      (!review.solution?.trim() ||
        (review.editorMode !== "toml" && !review.expectedStatus))
    )
      errors.push(
        `review ${concept.id} has code without a verifiable solution`,
      );
  }
  const delayedReviewExercises = content.delayedReviewExercises ?? {};
  for (const [conceptId, review] of Object.entries(delayedReviewExercises)) {
    const label = `delayed review ${conceptId}`;
    if (!conceptIds.has(conceptId))
      errors.push(`${label} references unknown concept`);
    evidenceIssues(review, [conceptId], label);
    if (
      review.evidence?.conceptIds.length !== 1 ||
      review.evidence.conceptIds[0] !== conceptId
    )
      errors.push(`${label} evidence must claim exactly its concept`);
    errors.push(
      ...manifestStepIssues(review).map((error) => `${label}: ${error}`),
    );
    errors.push(
      ...trustedFixtureIssues(review).map((error) => `${label}: ${error}`),
    );
    if (!review.evaluator || !review.prompt.trim())
      errors.push(`${label} has no active review exercise`);
    if (
      review.evaluator?.kind === "tests" &&
      !hasRustTestAttribute(review.evaluator.tests)
    )
      errors.push(
        `${label} tests evaluator must contain a Rust #[test] or #[tokio::test]`,
      );
    if (review.evaluator?.kind === "tests" && !review.evaluator.tests.trim())
      errors.push(`${label} has empty tests evaluator`);
    if (
      review.code !== undefined &&
      (!review.solution?.trim() ||
        (review.editorMode !== "toml" && !review.expectedStatus))
    )
      errors.push(`${label} has code without a verifiable solution`);
    if (conceptId === "function-ownership") {
      if (
        review.id !== "review-function-ownership-delayed-v1" ||
        review.evidence?.version !== 2 ||
        review.evidence.codingTaskId !==
          "ownership/function-delayed-recall-v1" ||
        review.evaluator?.kind !== "tests" ||
        review.code !== frameTextContract.starter ||
        review.solution !== frameTextContract.solution ||
        review.evaluator.tests !== frameTextContract.tests ||
        review.expectedStatus !== "success"
      )
        errors.push(
          `${label} does not match the authored delayed frame contract`,
        );
    }
    if (conceptId === "shared-borrow") {
      if (
        review.id !== "review-shared-borrow-delayed-v1" ||
        review.evidence?.version !== 2 ||
        review.evidence.codingTaskId !==
          "ownership/shared-count-lines-delayed-v1" ||
        review.evidence.conceptIds.length !== 1 ||
        review.evidence.conceptIds[0] !== "shared-borrow" ||
        review.evaluator?.kind !== "tests" ||
        review.code !== delayedSharedCountLinesContract.starter ||
        review.solution !== delayedSharedCountLinesContract.solution ||
        review.evaluator.tests !== delayedSharedCountLinesContract.tests ||
        review.expectedStatus !== "compile-error" ||
        review.expectedError !== "E0382" ||
        review.expectedDiagnostic !== undefined ||
        review.evidenceGate === true ||
        review.kind !== "recall" ||
        review.evidenceKind !== "recall"
      )
        errors.push(
          `${label} does not match the authored delayed shared-borrow contract`,
        );
    }
  }
  checkUnique(
    [
      ...Object.values(content.reviewExercises),
      ...Object.values(delayedReviewExercises),
    ].map((step) => step.id),
    "review step",
    errors,
  );
  checkAcyclic(conceptGraph, "concept", errors);

  const lessonGraph = new Map<string, string[]>();
  for (const lesson of content.lessons) {
    lessonGraph.set(lesson.id, lesson.prerequisites);
    if (
      !lesson.title.trim() ||
      !lesson.subtitle.trim() ||
      !lesson.outcomes.length ||
      !lesson.conceptIds.length ||
      !lesson.competencyIds.length ||
      !lesson.sourceIds.length ||
      lesson.minutes <= 0
    )
      errors.push(`lesson ${lesson.id} is missing required learning metadata`);
    if (!moduleIds.has(lesson.moduleId))
      errors.push(
        `lesson ${lesson.id} belongs to unknown module: ${lesson.moduleId}`,
      );
    if (lesson.steps.length < 5 || lesson.steps.length > 9)
      errors.push(`lesson ${lesson.id} must have 5-9 steps`);
    if (!lesson.transferTask.trim())
      errors.push(`lesson ${lesson.id} is missing transferTask`);
    if (!lesson.evidenceGate.trim())
      errors.push(`lesson ${lesson.id} is missing evidenceGate`);
    for (const prerequisite of lesson.prerequisites) {
      if (!lessonIds.has(prerequisite))
        errors.push(
          `lesson ${lesson.id} has unknown prerequisite: ${prerequisite}`,
        );
    }
    for (const conceptId of lesson.conceptIds) {
      if (!conceptIds.has(conceptId))
        errors.push(`lesson ${lesson.id} has unknown concept id: ${conceptId}`);
    }
    for (const competencyId of lesson.competencyIds) {
      if (!competencyIds.has(competencyId))
        errors.push(
          `lesson ${lesson.id} has unknown competency id: ${competencyId}`,
        );
    }
    for (const sourceId of lesson.sourceIds) {
      if (!sourceIds.has(sourceId))
        errors.push(`lesson ${lesson.id} has unknown source id: ${sourceId}`);
    }
    const localStepIds = new Set<string>();
    for (const step of lesson.steps) {
      const stepKey = `${lesson.id}/${step.id}`;
      evidenceIssues(step, lesson.conceptIds, `step ${stepKey}`);
      errors.push(
        ...manifestStepIssues(step).map((error) => `step ${stepKey}: ${error}`),
      );
      errors.push(
        ...trustedFixtureIssues(step).map(
          (error) => `step ${stepKey}: ${error}`,
        ),
      );
      stepsByRef.set(stepKey, step);
      if (localStepIds.has(step.id))
        errors.push(`duplicate step id in ${lesson.id}: ${step.id}`);
      localStepIds.add(step.id);
      if (!step.prompt.trim() || !step.title.trim())
        errors.push(`step ${stepKey} is missing prompt or title`);
      if (!step.evaluator) errors.push(`step ${stepKey} is missing evaluator`);
      if (step.code !== undefined) {
        const isExposureOnlyExpectedError =
          step.kind === "observe" &&
          step.evidenceKind === "exposure" &&
          step.expectedStatus === "compile-error" &&
          step.evaluator?.kind === "expected-error";
        if (!step.solution?.trim() && !isExposureOnlyExpectedError)
          errors.push(`step ${stepKey} has code but no solution`);
        if (step.editorMode !== "toml" && !step.expectedStatus)
          errors.push(`step ${stepKey} has code but no expectedStatus`);
        if (
          step.expectedStatus === "compile-error" &&
          !step.expectedError?.trim() &&
          !step.expectedDiagnostic?.trim()
        )
          errors.push(
            `step ${stepKey} has compile-error status but no expectedError or expectedDiagnostic`,
          );
        if (
          step.expectedStatus !== "compile-error" &&
          (step.expectedError || step.expectedDiagnostic)
        )
          errors.push(
            `step ${stepKey} has expectedError or expectedDiagnostic without compile-error status`,
          );
      }
      if (step.traceId && !traceIds.has(step.traceId))
        errors.push(`step ${stepKey} has unknown trace id: ${step.traceId}`);
      const evaluator = step.evaluator;
      if (
        evaluator?.kind === "expected-error" &&
        (step.expectedStatus !== "compile-error" ||
          (evaluator.code?.trim() || undefined) !==
            (step.expectedError?.trim() || undefined) ||
          (evaluator.diagnostic?.trim() || undefined) !==
            (step.expectedDiagnostic?.trim() || undefined))
      )
        errors.push(
          `step ${stepKey} expected-error evaluator must match authored diagnostic`,
        );
      if (
        step.kind === "predict" &&
        evaluator &&
        ["exact-output", "compilation", "expected-error", "tests"].includes(
          evaluator.kind,
        )
      )
        errors.push(
          `step ${stepKey} prediction needs an answer before running code`,
        );
      if (evaluator?.kind === "tests" && !evaluator.tests.trim())
        errors.push(`step ${stepKey} has empty tests evaluator`);
      if (evaluator?.kind === "tests" && !hasRustTestAttribute(evaluator.tests))
        errors.push(
          `step ${stepKey} tests evaluator must contain a Rust #[test] or #[tokio::test]`,
        );
      if (
        evaluator?.kind === "expected-error" &&
        !evaluator.code?.trim() &&
        !evaluator.diagnostic?.trim()
      )
        errors.push(
          `step ${stepKey} has empty expected-error code and diagnostic`,
        );
      if (evaluator?.kind === "answer" && evaluator.accepted.length === 0)
        errors.push(`step ${stepKey} has no accepted answers`);
      if (
        evaluator?.kind === "choice" &&
        (!evaluator.correct || !evaluator.explanations[evaluator.correct])
      )
        errors.push(`step ${stepKey} has invalid choice evaluator`);
      if (evaluator?.kind === "choice") {
        if (!step.choices?.some((choice) => choice.id === evaluator.correct))
          errors.push(
            `step ${stepKey} has no choice matching its correct answer`,
          );
        for (const choice of step.choices ?? [])
          if (!evaluator.explanations[choice.id]?.trim())
            errors.push(
              `step ${stepKey} choice ${choice.id} has no explanation`,
            );
      }
      if (evaluator?.kind === "ordering" && evaluator.correct.length === 0)
        errors.push(`step ${stepKey} has empty ordering evaluator`);
      if (evaluator?.kind === "rubric" && evaluator.criteria.length === 0)
        errors.push(`step ${stepKey} has empty rubric evaluator`);
    }
  }
  checkAcyclic(lessonGraph, "lesson", errors);

  const moduleGraph = new Map<string, string[]>();
  for (const courseModule of content.modules) {
    moduleGraph.set(courseModule.id, courseModule.prerequisites);
    if (
      !courseModule.title.trim() ||
      !courseModule.whyItMatters.trim() ||
      !courseModule.projectConnection.trim() ||
      !courseModule.capabilities.length ||
      !courseModule.exitGate.length ||
      !courseModule.lessonIds.length
    )
      errors.push(`module ${courseModule.id} has incomplete learning contract`);
    for (const prerequisite of courseModule.prerequisites)
      if (!moduleIds.has(prerequisite))
        errors.push(
          `module ${courseModule.id} has unknown prerequisite: ${prerequisite}`,
        );
    checkUnique(
      courseModule.lessonIds,
      `module ${courseModule.id} lesson`,
      errors,
    );
    for (const lessonId of courseModule.lessonIds) {
      if (!lessonIds.has(lessonId))
        errors.push(`module has unknown lesson id: ${lessonId}`);
      else if (
        content.lessons.find((lesson) => lesson.id === lessonId)?.moduleId !==
        courseModule.id
      )
        errors.push(
          `lesson ${lessonId} declares another module than ${courseModule.id}`,
        );
    }
    const moduleLessonSet = new Set(courseModule.lessonIds);
    for (const lesson of content.lessons) {
      if (
        lesson.moduleId === courseModule.id &&
        !moduleLessonSet.has(lesson.id)
      )
        errors.push(`lesson ${lesson.id} is missing from module lessonIds`);
    }

    const gateCriteria = courseModule.gateCriteria;
    if (gateCriteria) {
      checkUnique(
        gateCriteria.map((criterion) => criterion.id),
        "module gate criterion",
        errors,
      );
      for (const criterion of gateCriteria) {
        if (!criterion.id.trim() || !criterion.label.trim())
          errors.push("module gate criterion is missing id or label");
        if (criterion.taskRefs.length === 0)
          errors.push(`module gate criterion ${criterion.id} has no task refs`);
        const refs = [
          ...criterion.taskRefs.map((ref) => ({ ref, role: "task" as const })),
          ...(criterion.supplementaryStepRefs ?? []).map((ref) => ({
            ref,
            role: "supplementary" as const,
          })),
        ];
        if (criterion.requiredIndependentCodingTasks !== undefined) {
          const required = criterion.requiredIndependentCodingTasks;
          const families = new Set(
            criterion.taskRefs.flatMap((ref) => {
              const step = stepsByRef.get(`${ref.lessonId}/${ref.stepId}`);
              const definition = step?.evidence;
              return step?.evaluator?.kind === "tests" &&
                definition?.codingTaskId?.trim() &&
                definition.conceptIds.length &&
                Number.isInteger(definition.version) &&
                definition.version > 0 &&
                ["fix", "transfer", "project", "assessment"].includes(
                  step.evidenceKind,
                )
                ? [definition.codingTaskId]
                : [];
            }),
          );
          if (
            !Number.isInteger(required) ||
            required <= 0 ||
            required > families.size
          )
            errors.push(
              `module counted gate ${criterion.id} must require a positive integer no larger than its distinct eligible coding task families`,
            );
        }
        const seenRefs = new Set<string>();
        for (const { ref, role } of refs) {
          const key = `${ref.lessonId}/${ref.stepId}`;
          if (seenRefs.has(key))
            errors.push(
              `module gate criterion ${criterion.id} repeats task ref: ${key}`,
            );
          seenRefs.add(key);
          if (!lessonIds.has(ref.lessonId)) {
            errors.push(
              `module gate criterion ${criterion.id} has unknown lesson id: ${ref.lessonId}`,
            );
            continue;
          }
          if (!moduleLessonSet.has(ref.lessonId))
            errors.push(
              `module gate criterion ${criterion.id} references lesson outside module: ${ref.lessonId}`,
            );
          const step = stepsByRef.get(key);
          if (!step) {
            errors.push(
              `module gate criterion ${criterion.id} has unknown step ref: ${key}`,
            );
            continue;
          }
          if (role === "task" && step.evaluator?.kind === "rubric")
            errors.push(
              `module gate criterion ${criterion.id} task ref cannot use rubric evaluator: ${key}`,
            );
          if (role === "supplementary" && step.evaluator?.kind !== "rubric")
            errors.push(
              `module gate criterion ${criterion.id} supplementary ref must use rubric evaluator: ${key}`,
            );
        }
      }
    }
    const assessment = content.lessons.find((lesson) =>
      lesson.steps.some(
        (step) =>
          `${lesson.id}/${step.id}` === courseModule.assessmentId ||
          step.id === courseModule.assessmentId,
      ),
    );
    if (!assessment)
      errors.push(
        `module has unknown assessment step id: ${courseModule.assessmentId}`,
      );
    else if (!moduleLessonSet.has(assessment.id))
      errors.push(
        `module ${courseModule.id} has assessment outside module: ${courseModule.assessmentId}`,
      );
  }
  checkAcyclic(moduleGraph, "module", errors);

  for (const [traceId, trace] of Object.entries(content.traces)) {
    if (!trace.title.trim() || !trace.code.trim() || trace.frames.length === 0)
      errors.push(`trace ${traceId} is incomplete`);
    for (const frame of trace.frames) {
      if (frame.line < 1 || !frame.explanation.trim())
        errors.push(`trace ${traceId} has invalid frame`);
      if (frame.stack.length === 0 && frame.heap.length === 0)
        errors.push(`trace ${traceId} frame ${frame.line} has no memory state`);
    }
  }

  for (const source of content.sources) {
    if (
      !source.url.startsWith("https://doc.rust-lang.org/") &&
      !source.url.startsWith("https://blog.rust-lang.org/") &&
      !source.url.startsWith("https://play.rust-lang.org/") &&
      !source.url.startsWith("https://github.com/rust-lang/") &&
      !source.url.startsWith("https://github.com/RustSec/") &&
      !source.url.startsWith("https://github.com/fettpl/rustcrushcourse/") &&
      !source.url.startsWith("https://docs.rs/loom/0.7.2/loom/") &&
      !source.url.startsWith("https://docs.rs/rand/0.10.2/rand/") &&
      source.url !==
        "https://docs.rs/crate/rand/0.10.2/source/Cargo.toml.orig" &&
      !source.url.startsWith("https://rust-random.github.io/book/") &&
      !source.url.startsWith("https://docs.rs/tokio/1.53.1/tokio/") &&
      !source.url.startsWith(
        "https://docs.rs/tokio-stream/0.1.19/tokio_stream/",
      ) &&
      !source.url.startsWith("https://tokio.rs/") &&
      !source.url.startsWith("https://proptest-rs.github.io/proptest/") &&
      !source.url.startsWith("https://nnethercote.github.io/perf-book/") &&
      !source.url.startsWith("https://valgrind.org/docs/manual/") &&
      !source.url.startsWith("https://embarkstudios.github.io/cargo-deny/") &&
      !source.url.startsWith("https://www.sqlite.org/") &&
      !source.url.startsWith("https://docs.rs/rusqlite/0.40.2/rusqlite/")
    )
      errors.push(`source ${source.id} is not an official Rust source`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(source.reviewedAt))
      errors.push(`source ${source.id} has invalid reviewedAt`);
    if (!source.recheckPolicy.trim())
      errors.push(`source ${source.id} is missing recheckPolicy`);
  }

  const projects = content.projects ?? [content.project];
  checkUnique(
    projects.map((project) => project.id),
    "project",
    errors,
  );
  for (const project of projects) {
    if (project.package) {
      errors.push(
        ...validateProjectPackage(project.package).map(
          (error) => `project ${project.id}: ${error}`,
        ),
      );
      for (const ref of [
        ...project.package.revealStepRefs,
        ...(project.package.starterRevealStepRefs ?? []),
      ]) {
        if (!stepsByRef.has(`${ref.lessonId}/${ref.stepId}`))
          errors.push(
            `project ${project.id} package has unknown solution task: ${ref.lessonId}/${ref.stepId}`,
          );
      }
    }
    for (const id of [
      project.lessonId,
      project.adversarialLessonId,
      ...(project.lessonIds ?? []),
    ]) {
      if (!lessonIds.has(id))
        errors.push(`project ${project.id} has unknown lesson id: ${id}`);
    }
    for (const id of project.reviewConceptIds ?? []) {
      if (!conceptIds.has(id))
        errors.push(
          `project ${project.id} has unknown review concept id: ${id}`,
        );
    }
    if (!project.adversarialInject.trim())
      errors.push(`project ${project.id} has no change of requirements`);
    if (
      project.requiredBehaviors.length < 3 ||
      project.requiredEvidence.length < 3 ||
      !project.constraints.length ||
      !project.retrospective.length
    )
      errors.push(`project ${project.id} contract is too thin`);
  }
  if (
    !content.lessons.some((lesson) =>
      lesson.steps.some((step) => step.evidenceKind === "recall"),
    )
  )
    errors.push("curriculum needs a retrieval step");
  if (
    !content.lessons.some((lesson) =>
      lesson.steps.some((step) => step.evidenceKind === "assessment"),
    )
  )
    errors.push("curriculum needs an assessment step");
  if (
    !content.lessons.some((lesson) =>
      lesson.steps.some((step) => step.kind === "blank"),
    )
  )
    errors.push("curriculum needs a blank-page step");

  return uniqueErrors(errors);
}
