import type { CourseModule, Lesson, ProjectContract } from "./types";

export interface LessonEvidenceAudit {
  practiceOnlyLessons: string[];
  lessonsWithoutEvidence: string[];
  errors: string[];
}

type LessonWithAuthoredRole = Omit<Lesson, "practiceOnly"> & {
  practiceOnly?: unknown;
};

interface LessonEvidenceAuditInput {
  lessons: Lesson[];
  modules: CourseModule[];
  projects: ProjectContract[];
}

function assessmentCandidates(
  courseModule: CourseModule,
  lessons: Lesson[],
  lessonById: Map<string, Lesson>,
): Lesson[] {
  const assessmentId = courseModule.assessmentId;
  const explicit = lessons.filter(
    (lesson) =>
      lesson.id === assessmentId ||
      lesson.steps.some((step) => `${lesson.id}/${step.id}` === assessmentId),
  );
  if (explicit.length) return explicit;

  const moduleLessons = courseModule.lessonIds.flatMap((lessonId) => {
    const lesson = lessonById.get(lessonId);
    return lesson ? [lesson] : [];
  });
  return moduleLessons.filter((lesson) =>
    lesson.steps.some((step) => step.id === assessmentId),
  );
}

export function auditLessonEvidence({
  lessons,
  modules,
  projects,
}: LessonEvidenceAuditInput): LessonEvidenceAudit {
  const practiceOnlyLessons: string[] = [];
  const lessonsWithoutEvidence: string[] = [];
  const errors: string[] = [];
  const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  const practiceOnlyIds = new Set<string>();

  for (const lesson of lessons) {
    const authored = lesson as LessonWithAuthoredRole;
    const hasRoleField = Object.prototype.hasOwnProperty.call(
      authored,
      "practiceOnly",
    );
    if (
      hasRoleField &&
      authored.practiceOnly !== undefined &&
      authored.practiceOnly !== true
    ) {
      errors.push(
        `lesson ${lesson.id} practiceOnly role must be explicitly true`,
      );
      continue;
    }
    if (authored.practiceOnly === true) {
      practiceOnlyLessons.push(lesson.id);
      practiceOnlyIds.add(lesson.id);
      for (const step of lesson.steps) {
        if (step.evidenceGate === true)
          errors.push(
            `practice-only lesson ${lesson.id} must not declare an evidence gate`,
          );
        if (step.evidence?.codingTaskId !== undefined)
          errors.push(
            `practice-only lesson ${lesson.id} must not declare a primary coding task`,
          );
      }
      continue;
    }
    if (
      !lesson.steps.some(
        (step) =>
          step.evidenceGate === true && step.evaluator?.kind !== "rubric",
      )
    )
      lessonsWithoutEvidence.push(lesson.id);
  }

  for (const courseModule of modules) {
    for (const criterion of courseModule.gateCriteria ?? []) {
      for (const ref of criterion.taskRefs) {
        if (practiceOnlyIds.has(ref.lessonId))
          errors.push(
            `module gate criterion ${criterion.id} cannot use practice-only lesson ${ref.lessonId} as a task ref`,
          );
      }
    }
    for (const assessmentLesson of assessmentCandidates(
      courseModule,
      lessons,
      lessonById,
    ))
      if (practiceOnlyIds.has(assessmentLesson.id))
        errors.push(
          `module ${courseModule.id} cannot use practice-only lesson ${assessmentLesson.id} as its assessment`,
        );
  }

  for (const project of projects) {
    if (practiceOnlyIds.has(project.lessonId))
      errors.push(
        `project ${project.id} cannot use practice-only lesson ${project.lessonId} as its primary lesson`,
      );
  }

  return { practiceOnlyLessons, lessonsWithoutEvidence, errors };
}
