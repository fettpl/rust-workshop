"use client";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  GitBranch,
  Terminal,
  RotateCcw,
  Bookmark,
  Target,
} from "lucide-react";
import { useClock } from "./use-clock";
import { useLearning } from "./learning-provider";
import {
  lessons,
  concepts,
  modules,
  competencies,
  projects,
  roadmap,
} from "@/content/course";
import {
  courseMastery,
  courseReviewQueue,
  courseEvidenceSummary,
  courseCompetencyProgress,
  courseGateRecovery,
  courseModuleGate,
  courseNextGateTask,
} from "@/content/learning-context";
import { courseNoteKey } from "@/content/course-notes";
import { stepKey } from "@/persistence/state";
import {
  Eyebrow,
  MasteryBadge,
  ProgressLine,
  OwnershipPolicyNote,
  OwnershipEvidenceCount,
} from "./ui";
import type { Lesson, ProjectContract } from "@/domain/types";
import { ProjectPackage } from "./project-package";
import { LearningText } from "./learning-text";
import { LearnerInstruction } from "./learner-instruction";
import { ModulePicker } from "./module-picker";
import {
  mapModeForModule,
  normalizeMapPreference,
  recommendedModuleIds,
  type CourseMapMode,
} from "@/engine/course-route";
import { useLocale } from "./locale-provider";
export function useOpenLesson() {
  const { update } = useLearning();
  return (id: string, stepIndex?: number) =>
    update((s) => {
      const lesson = lessons.find((entry) => entry.id === id);
      const resumeHere =
        s.resume.lessonId === id && !!lesson?.steps[s.resume.stepIndex];
      return {
        ...s,
        resume: {
          ...s.resume,
          view: "lesson",
          lessonId: id,
          stepIndex:
            stepIndex ??
            (resumeHere
              ? s.resume.stepIndex
              : Math.max(
                  0,
                  lesson?.steps.findIndex(
                    (step) => !s.steps[stepKey(id, step.id)]?.completed,
                  ) ?? 0,
                )),
          panel:
            stepIndex === undefined && resumeHere ? s.resume.panel : "lesson",
        },
      };
    });
}
function lessonProgress(
  lesson: Lesson,
  steps: ReturnType<typeof useLearning>["state"]["steps"],
) {
  return lesson.steps.filter(
    (step) => steps[stepKey(lesson.id, step.id)]?.completed,
  ).length;
}
export function UnavailableLesson({
  standalone = false,
}: {
  standalone?: boolean;
}) {
  const { t } = useLocale();
  const { update } = useLearning();
  const Heading = standalone ? "h1" : "h2";
  return (
    <section className="continue-panel">
      <div className="continue-copy">
        <Heading>{t("Zapisany krok jest niedostępny")}</Heading>
        <p>
          {t(
            "Wybierz zadanie z obecnej wersji kursu. Wcześniejsze notatki i wyniki znajdziesz w swoim zapisie.",
          )}
        </p>
        <button
          className="primary"
          onClick={() =>
            update((state) => ({
              ...state,
              resume: { ...state.resume, view: "course" },
            }))
          }
        >
          {t("Wybierz lekcję na mapie")}
        </button>
      </div>
    </section>
  );
}

export function Dashboard() {
  const { t, courseText } = useLocale();
  const now = useClock();
  const { state, update } = useLearning();
  const savedLesson = lessons.find((l) => l.id === state.resume.lessonId);
  const lesson = savedLesson ?? lessons[0];
  const { due } = courseReviewQueue(state, now);

  const difficult = concepts
    .filter((c) =>
      state.events.some((e) => e.conceptIds.includes(c.id) && !e.passed),
    )
    .slice(0, 3);
  const progress = lessonProgress(lesson, state.steps);
  const stepIndex = Math.min(state.resume.stepIndex, lesson.steps.length - 1);
  const currentStep = lesson.steps[stepIndex];
  const isResuming =
    progress > 0 ||
    stepIndex > 0 ||
    state.resume.panel !== "lesson" ||
    Boolean(state.steps[stepKey(lesson.id, currentStep.id)]);
  const activeModule = modules.find((module) => module.id === lesson.moduleId)!;
  const open = useOpenLesson();
  const moduleConcepts = concepts.filter((concept) =>
    lessons.some(
      (item) =>
        item.moduleId === activeModule.id &&
        item.conceptIds.includes(concept.id),
    ),
  );
  const practiced = moduleConcepts.filter((concept) =>
    ["understood", "retained"].includes(courseMastery(state, concept.id).level),
  ).length;
  const project =
    projects.find((item) =>
      (item.lessonIds ?? [item.lessonId, item.adversarialLessonId]).includes(
        lesson.id,
      ),
    ) ?? projects[0];
  const projectLessons = lessons.filter((item) =>
    (
      project.lessonIds ?? [project.lessonId, project.adversarialLessonId]
    ).includes(item.id),
  );
  const projectCompleted = projectLessons.reduce(
    (sum, item) => sum + lessonProgress(item, state.steps),
    0,
  );
  const projectSteps = projectLessons.reduce(
    (sum, item) => sum + item.steps.length,
    0,
  );
  return (
    <div className="dashboard">
      <div className="page-heading">
        <div>
          <Eyebrow>{t("TWÓJ WARSZTAT · RUST 2024")}</Eyebrow>
          <h1>
            {state.onboarding.name
              ? t("Cześć, {0}.", state.onboarding.name)
              : t("Dobrze Cię widzieć.")}
          </h1>
        </div>
      </div>
      {savedLesson?.steps[state.resume.stepIndex] ? (
        <section className="continue-panel" aria-labelledby="continue-title">
          <div className="continue-copy">
            <span className="lesson-index">
              {mapModeForModule(activeModule.id) === "core"
                ? t("Ścieżka główna")
                : t("Rozszerzenie")}
              {" · "}
              {courseText(activeModule.title)}
            </span>
            <h2 id="continue-title">{courseText(lesson.title)}</h2>
            <p>
              <LearningText>
                {lesson.outcomes[0] ?? lesson.subtitle}
              </LearningText>
            </p>
            <div className="continue-meta">
              <span>
                {t("Krok ")}
                {stepIndex + 1} {t("z ")}
                {lesson.steps.length}
              </span>
              <strong>{courseText(currentStep.title)}</strong>
            </div>
            <button className="primary" onClick={() => open(lesson.id)}>
              {isResuming ? t("Kontynuuj naukę") : t("Wejdź do lekcji")}
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </div>
          <div className="session-outline">
            <div className="session-outline-header">
              <span className="micro">{t("TWOJA SESJA")}</span>
              <span>
                {progress} / {lesson.steps.length} {t("kroków sprawdzonych")}
              </span>
            </div>
            <ol>
              {lesson.steps.map((step, i) => (
                <li key={step.id}>
                  <button
                    className={`session-step ${i === stepIndex ? "current" : ""}`}
                    aria-current={i === stepIndex ? "step" : undefined}
                    onClick={() => open(lesson.id, i)}
                  >
                    <span className="session-step-number">
                      {state.steps[stepKey(lesson.id, step.id)]?.completed ? (
                        <Check size={17} />
                      ) : (
                        String(i + 1).padStart(2, "0")
                      )}
                    </span>
                    <span>{courseText(step.title)}</span>
                    {i === stepIndex && <ArrowRight size={16} />}
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : (
        <UnavailableLesson />
      )}
      {state.diagnostic.recommendation && (
        <p className="diagnostic-recommendation">
          <strong>{t("Twój punkt startowy:")}</strong>{" "}
          {t(state.diagnostic.recommendation)}
        </p>
      )}
      <div className="dashboard-secondary">
        <section className="review-teaser">
          <div className="section-heading">
            <span className="round-icon">
              <RotateCcw size={20} />
            </span>
            <span className="micro">{t("ODTWÓRZ Z PAMIĘCI")}</span>
          </div>
          <h2>
            {due.length
              ? `${due.length} ${due.length === 1 ? t("krótka powtórka") : t("krótkie powtórki")}`
              : t("Daj wiedzy chwilę.")}
          </h2>
          <p>
            {due.length
              ? t("Sprawdź, co potrafisz odtworzyć bez zaglądania do lekcji.")
              : t(
                  "Po pierwszych eksperymentach pojawią się tutaj krótkie powroty do poznanych zasad.",
                )}
          </p>
          <button
            className="text-button"
            onClick={() =>
              update((s) => ({ ...s, resume: { ...s.resume, view: "review" } }))
            }
          >
            {due.length ? t("Otwórz powtórki") : t("Zobacz plan powtórek")}
            <ArrowRight size={16} />
          </button>
        </section>
        <section className="project-teaser">
          <div className="section-heading">
            <span className="round-icon">
              <Terminal size={20} />
            </span>
            <span className="micro">{t("ZASTOSUJ W PRAKTYCE")}</span>
          </div>
          <h2>{courseText(project.title)}</h2>
          <p>{courseText(project.objective)}</p>
          <p className="footnote">
            {projectCompleted} / {projectSteps} {t("kroków sprawdzonych")}
          </p>
          <button
            className="text-button"
            onClick={() =>
              update((s) => ({
                ...s,
                resume: { ...s.resume, view: "project" },
              }))
            }
          >
            {t("Otwórz projekt")}
            <ArrowUpRight size={16} />
          </button>
        </section>
      </div>
      <section className="competency-section">
        <div className="section-heading spread">
          <div>
            <Eyebrow>{t("CO JUŻ POTRAFISZ")}</Eyebrow>
            <h2>{t("Pojęcia w bieżącym module")}</h2>
          </div>
          <span className="micro">
            {practiced} / {moduleConcepts.length} {t("Z DOWODEM ROZUMIENIA")}
          </span>
        </div>
        {activeModule.id === "ownership" && <OwnershipPolicyNote />}
        <div className="concept-grid">
          {moduleConcepts.map((concept, index) => (
            <div key={concept.id} className="concept-row">
              <span className="concept-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{courseText(concept.title)}</span>
              <span>
                <MasteryBadge
                  level={courseMastery(state, concept.id).level}
                  scope={
                    concept.evidenceCalibration
                      ? activeModule.id === "ownership"
                        ? "ownership"
                        : "calibrated"
                      : undefined
                  }
                />
                {concept.evidenceCalibration && (
                  <OwnershipEvidenceCount
                    count={
                      courseEvidenceSummary(state, concept.id)
                        .qualifyingCodingTasks
                    }
                    required={concept.evidenceCalibration.minimumCodingTasks}
                    legacy={
                      courseEvidenceSummary(state, concept.id).hasLegacyEvidence
                    }
                  />
                )}
              </span>
            </div>
          ))}
        </div>
        <p className="footnote">
          {t(
            "Opanowanie wynika z samodzielnych rozwiązań. Ukończenie lekcji i znajomość pojęcia to różne rzeczy.",
          )}
        </p>
      </section>
      <details className="competency-details">
        <summary>{t("Kompetencje z całego kursu")}</summary>
        <p className="footnote">
          {t(
            "Poziom uwzględnia wszystkie powiązane pojęcia. Samo ukończenie lekcji nie potwierdza kompetencji.",
          )}
        </p>
        {competencies.map((competency) => {
          const result = courseCompetencyProgress(state, competency.id);
          return (
            <div className="competency-row" key={competency.id}>
              <div>
                <strong>{courseText(competency.title)}</strong>
                <small>
                  {result.proven} / {result.total}{" "}
                  {t("pojęć z dowodem rozumienia ·")}{" "}
                  {t("kwalifikujące zadania w powiązanych pojęciach:")}{" "}
                  {result.independentTasks} {t("· lekcje: ")}
                  {result.lessonCount}
                </small>
              </div>
              <MasteryBadge level={result.level} />
            </div>
          );
        })}
      </details>
      {difficult.length > 0 && (
        <div className="recent-difficult">
          <Target size={18} />
          <span>
            {t("Warto wrócić do: ")}
            {difficult.map((c) => courseText(c.title)).join(", ")}
            {t(". Błąd jest wskazówką do kolejnego eksperymentu.")}
          </span>
        </div>
      )}
    </div>
  );
}
export function CourseMap() {
  const { t, courseText } = useLocale();
  const { state, update } = useLearning();
  const open = useOpenLesson();
  const currentModule =
    modules.find((module) =>
      module.lessonIds.includes(state.resume.lessonId),
    ) ?? modules[0];
  const [selected, setSelected] = useState(currentModule.id);
  const selectedModule =
    modules.find((module) => module.id === selected) ?? currentModule;
  const mode = normalizeMapPreference(state.routePreference);
  const moduleLessons = lessons.filter(
    (lesson) => lesson.moduleId === selectedModule.id,
  );
  const gate = courseModuleGate(
    state,
    selectedModule.gateCriteria ? lessons : moduleLessons,
    selectedModule,
  );
  const prerequisiteModules = selectedModule.prerequisites
    .map((id) => modules.find((module) => module.id === id))
    .filter((module): module is (typeof modules)[number] => Boolean(module));
  const recommendedModules = recommendedModuleIds(selectedModule.id)
    .map((id) => modules.find((module) => module.id === id))
    .filter((module): module is (typeof modules)[number] => Boolean(module));
  const recoveryTargets = (selectedModule.gateCriteria ?? []).flatMap(
    (criterion, index) => {
      const target = courseNextGateTask(state, criterion, lessons);
      const targetLesson = lessons.find(
        (lesson) => lesson.id === target?.lessonId,
      );
      if (!target || !targetLesson) return [];
      return [
        {
          id: `${criterion.id}-${target.stepId}`,
          label: gate.criteria[index]?.label,
          lessonId: target.lessonId,
          stepIndex: targetLesson.steps.findIndex(
            (step) => step.id === target.stepId,
          ),
        },
      ];
    },
  );
  const exhaustedCriteria = (selectedModule.gateCriteria ?? []).filter(
    (criterion) =>
      courseGateRecovery(state, criterion, lessons).status === "exhausted",
  );
  const fallbackRecoveryLesson =
    moduleLessons.find(
      (lesson) => lessonProgress(lesson, state.steps) < lesson.steps.length,
    ) ?? moduleLessons[0];
  const fallbackRecoveryStep = fallbackRecoveryLesson
    ? Math.max(
        0,
        fallbackRecoveryLesson.steps.findIndex(
          (step) =>
            !state.steps[stepKey(fallbackRecoveryLesson.id, step.id)]
              ?.completed,
        ),
      )
    : 0;
  return (
    <div className="course-page">
      <Eyebrow>{t("MAPA NAUKI")}</Eyebrow>
      <h1>{t("Od pierwszego programu do samodzielności.")}</h1>
      <p className="lede">
        {t(
          "Zacznij od fundamentów albo wróć do konkretnego problemu. Każda lekcja jest dostępna.",
        )}
      </p>
      <ModulePicker
        selectedId={selectedModule.id}
        onSelect={setSelected}
        mode={mode}
        onModeChange={(next: CourseMapMode) =>
          update((s) => ({ ...s, routePreference: next }))
        }
      />
      <div className="module-summary">
        <h2>{courseText(selectedModule.title)}</h2>
        <p className="lede">{courseText(selectedModule.whyItMatters)}</p>
        {selectedModule.id === "ownership" && <OwnershipPolicyNote />}
      </div>
      <div className="module-contract">
        <div>
          <h2>{t("Po tym module potrafisz")}</h2>
          <ul className="check-list">
            {selectedModule.capabilities.map((c) => (
              <li key={courseText(c)}>
                <Check size={16} />
                {courseText(c)}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2>{t("Sprawdzian samodzielności")}</h2>
          <p>{selectedModule.exitGate.map(courseText).join(" ")}</p>
          <div className="connection-note">
            <GitBranch size={18} />
            {courseText(selectedModule.projectConnection)}
          </div>
        </div>
      </div>
      <section
        className="module-connections"
        aria-label={t("Powiązania modułu")}
      >
        <div>
          <h2>{t("Wymagania wstępne")}</h2>
          {prerequisiteModules.length ? (
            <ul className="module-link-list">
              {prerequisiteModules.map((module) => (
                <li key={module.id}>
                  <button
                    className="text-button"
                    onClick={() => setSelected(module.id)}
                  >
                    {courseText(module.title)} <ArrowRight size={16} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="footnote">{t("Punkt wyjścia w tej trasie.")}</p>
          )}
        </div>
        <div>
          <h2>{t("Polecane rozszerzenia")}</h2>
          {recommendedModules.length ? (
            <ul className="module-link-list">
              {recommendedModules.map((module) => (
                <li key={module.id}>
                  <button
                    className="text-button"
                    onClick={() => setSelected(module.id)}
                  >
                    {courseText(module.title)} <ArrowRight size={16} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="footnote">
              {t(
                "Odkrywaj rozszerzenia według własnego celu; ta sekcja nie tworzy dodatkowych blokad.",
              )}
            </p>
          )}
        </div>
        <div>
          <h2>{t("Jak wrócić do praktyki")}</h2>
          <p className="footnote">
            {t(
              "Wybierz zadanie, które pomoże odbudować dowód samodzielności. Każda lekcja pozostaje dostępna.",
            )}
          </p>
          {exhaustedCriteria.length > 0 && (
            <p className="footnote">
              {t("Brak świeżego samodzielnego wariantu dla kryteriów:")}{" "}
              {exhaustedCriteria
                .map((criterion) => courseText(criterion.label))
                .join(" · ")}
              <br />
              {t(
                "Pozostałe zadania w tych kryteriach mają zapisane podpowiedzi lub rozwiązanie. Możesz nadal ćwiczyć; powtórzenie nie usuwa wcześniejszej pomocy.",
              )}
            </p>
          )}
          {recoveryTargets.length ? (
            <ul className="module-link-list">
              {recoveryTargets.map((target) => (
                <li key={target.id}>
                  <button
                    className="text-button"
                    onClick={() => open(target.lessonId, target.stepIndex)}
                  >
                    {courseText(target.label) || t("Najbliższe zadanie")}{" "}
                    <ArrowRight size={16} />
                  </button>
                </li>
              ))}
            </ul>
          ) : fallbackRecoveryLesson && !exhaustedCriteria.length ? (
            <button
              className="text-button"
              onClick={() =>
                open(fallbackRecoveryLesson.id, fallbackRecoveryStep)
              }
            >
              {t("Otwórz pierwszą lekcję do powtórki ")}
              <ArrowRight size={16} />
            </button>
          ) : (
            <p className="footnote">
              {t("Każdą lekcję możesz otworzyć ze ścieżki eksperymentów.")}
            </p>
          )}
        </div>
      </section>
      <section>
        <div className="section-heading spread">
          <h2>{t("Ścieżka eksperymentów")}</h2>
          <span className="micro">{t("WSZYSTKIE LEKCJE SĄ DOSTĘPNE")}</span>
        </div>
        <div className="lesson-list">
          {moduleLessons.map((lesson, index) => {
            const completed = lessonProgress(lesson, state.steps);
            return (
              <button
                key={lesson.id}
                className="lesson-list-item"
                onClick={() => open(lesson.id)}
              >
                <span
                  className={`lesson-list-number ${completed === lesson.steps.length ? "done" : ""}`}
                >
                  {completed === lesson.steps.length ? (
                    <Check size={20} />
                  ) : (
                    String(index + 1).padStart(2, "0")
                  )}
                </span>
                <div>
                  <h3>{courseText(lesson.title)}</h3>
                  <p>{courseText(lesson.subtitle)}</p>
                </div>
                <span className="lesson-completion">
                  {completed}/{lesson.steps.length} {t("kroków")}
                </span>
                <ArrowRight size={19} />
              </button>
            );
          })}
        </div>
      </section>
      <section className="gate-panel">
        <Eyebrow>{t("DOWODY, NIE ODHACZENIA")}</Eyebrow>
        <h2>
          {gate.passed
            ? t("Masz dowody samodzielności.")
            : t("Co pokaże, że rozumiesz?")}
        </h2>
        <ul className="check-list">
          {gate.criteria.map((criterion, index) => {
            const contract = selectedModule.gateCriteria?.[index];
            const target =
              contract && courseNextGateTask(state, contract, lessons);
            const exhausted =
              contract &&
              courseGateRecovery(state, contract, lessons).status ===
                "exhausted";
            const targetLesson =
              target && lessons.find((lesson) => lesson.id === target.lessonId);
            return (
              <li key={courseText(criterion.label)}>
                <span
                  aria-label={
                    criterion.passed ? t("Potwierdzone") : t("Do sprawdzenia")
                  }
                >
                  {criterion.passed ? "✓" : "○"}
                </span>
                <span>
                  {courseText(criterion.label)}
                  {exhausted && t(" · Brak świeżego samodzielnego wariantu")}
                </span>
                {!criterion.passed && target && targetLesson && (
                  <button
                    className="text-button gate-action"
                    onClick={() =>
                      open(
                        target.lessonId,
                        targetLesson.steps.findIndex(
                          (step) => step.id === target.stepId,
                        ),
                      )
                    }
                  >
                    {t("Sprawdź w zadaniu ")}
                    <ArrowRight size={16} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>
      <section className="graph-section">
        <Eyebrow>{t("POWIĄZANIA POJĘĆ")}</Eyebrow>
        <div className="graph-nodes">
          {concepts
            .filter((concept) =>
              moduleLessons.some((lesson) =>
                lesson.conceptIds.includes(concept.id),
              ),
            )
            .map((concept) => (
              <div key={concept.id}>
                <strong>{courseText(concept.title)}</strong>
                <small>
                  {concept.prerequisites.length
                    ? "← " +
                      concept.prerequisites
                        .map(
                          (id) =>
                            courseText(
                              concepts.find((c) => c.id === id)?.title,
                            ) || id,
                        )
                        .join(", ")
                    : t("Punkt wyjścia")}
                </small>
              </div>
            ))}
        </div>
      </section>
      <details className="roadmap">
        <summary>
          {t("Pełna ścieżka kursu — co jest dostępne, co przed nami?")}
        </summary>
        <p>
          {t(
            "Dostępne moduły mają własne zadania i kryteria samodzielności. Kolejne części rozwijamy według poniższej ścieżki.",
          )}
        </p>
        <ol>
          {roadmap.map((item) => (
            <li key={courseText(item.title)}>
              <span>{courseText(item.title)}</span>{" "}
              <small>
                {item.status === "available" ? t("Dostępne") : t("W planie")}
              </small>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}
export function ProjectView() {
  const { t, courseText } = useLocale();
  const { state } = useLearning();
  const [selectedId, setSelectedId] = useState(
    () =>
      projects.find((item) =>
        (item.lessonIds ?? [item.lessonId, item.adversarialLessonId]).includes(
          state.resume.lessonId,
        ),
      )?.id ?? projects[0].id,
  );
  const selected =
    projects.find((item) => item.id === selectedId) ?? projects[0];
  return (
    <div>
      <nav className="module-picker" aria-label={t("Wybierz projekt")}>
        {projects.map((item, index) => (
          <button
            key={item.id}
            className={item.id === selected.id ? "selected" : ""}
            aria-pressed={item.id === selected.id}
            onClick={() => setSelectedId(item.id)}
          >
            <span className="micro">{String(index + 1).padStart(2, "0")}</span>
            <strong>{courseText(item.title)}</strong>
          </button>
        ))}
      </nav>
      <ProjectDetails key={selected.id} project={selected} />
    </div>
  );
}

function ProjectDetails({ project }: { project: ProjectContract }) {
  const { t, courseText } = useLocale();
  const { state, update } = useLearning();
  const open = useOpenLesson();
  const noteKey = courseNoteKey("project", project.id);
  const projectLessonIds = project.lessonIds ?? [
    project.lessonId,
    project.adversarialLessonId,
  ];
  const projectLessons = lessons.filter((lesson) =>
    projectLessonIds.includes(lesson.id),
  );
  const resumeLessonId = projectLessonIds.includes(state.resume.lessonId)
    ? state.resume.lessonId
    : (projectLessons.find(
        (lesson) => lessonProgress(lesson, state.steps) < lesson.steps.length,
      )?.id ?? project.lessonId);
  const completed = projectLessons.reduce(
    (total, lesson) => total + lessonProgress(lesson, state.steps),
    0,
  );
  const totalSteps = projectLessons.reduce(
    (total, lesson) => total + lesson.steps.length,
    0,
  );
  const reviewConcepts = concepts.filter((concept) =>
    (
      project.reviewConceptIds ??
      projectLessons.flatMap((lesson) => lesson.conceptIds)
    ).includes(concept.id),
  );
  return (
    <div className="project-page">
      <Eyebrow>{t("PROJEKT / TRANSFER")}</Eyebrow>
      <h1>{courseText(project.title)}</h1>
      <p className="lede">{courseText(project.objective)}</p>
      <div className="project-contract-grid">
        <section>
          <h2>{t("Program ma…")}</h2>
          <ul>
            {project.requiredBehaviors.map((x) => (
              <li key={courseText(x)}>{courseText(x)}</li>
            ))}
          </ul>
        </section>
        <section>
          <h2>{t("Dowody poprawności")}</h2>
          <ul>
            {project.requiredEvidence.map((x) => (
              <li key={courseText(x)}>{courseText(x)}</li>
            ))}
          </ul>
        </section>
        <section>
          <h2>{t("Ograniczenia, które uczą")}</h2>
          <ul>
            {project.constraints.map((x) => (
              <li key={courseText(x)}>{courseText(x)}</li>
            ))}
          </ul>
        </section>
      </div>
      <div className="project-launch">
        <span className="round-icon">
          <Terminal size={23} />
        </span>
        <div>
          <h2>{t("Od pomysłu do działającego kodu")}</h2>
          <p>
            {completed} / {totalSteps}{" "}
            {t("kroków · Twój kod zapisuje się automatycznie.")}
          </p>
          <ProgressLine
            value={totalSteps ? (100 * completed) / totalSteps : 0}
            label={t("Ukończone kroki projektu")}
          />
        </div>
        <button className="primary" onClick={() => open(resumeLessonId)}>
          {t("Pracuj nad projektem")}
          <ArrowRight size={18} />
        </button>
      </div>
      <LearnerInstruction project={project} />
      {project.package && (
        <ProjectPackage key={project.package.id} project={project.package} />
      )}
      <section className="adversarial">
        <Eyebrow>{t("ZMIANA WYMAGAŃ")}</Eyebrow>
        <h2>{t("A jeśli warunki się zmienią?")}</h2>
        <p>{courseText(project.adversarialInject)}</p>
        <button
          className="secondary"
          onClick={() => open(project.adversarialLessonId)}
        >
          {t("Podejmij nowy wariant")}
          <ArrowUpRight size={16} />
        </button>
      </section>
      <section className="retrospective">
        <Eyebrow>{t("RETROSPEKTYWA")}</Eyebrow>
        <h2>{t("Zachowaj to, co odkrywasz.")}</h2>
        <ul>
          {project.retrospective.map((x) => (
            <li key={courseText(x)}>{courseText(x)}</li>
          ))}
        </ul>
        <label>
          {t("Twoje obserwacje")}
          <textarea
            value={state.notes[noteKey] ?? state.notes[project.id] ?? ""}
            onChange={(e) =>
              update((s) => ({
                ...s,
                notes: { ...s.notes, [noteKey]: e.target.value },
              }))
            }
            placeholder={t("Który błąd zmienił Twój model myślenia?")}
          />
        </label>
        {reviewConcepts.map((concept) => (
          <button
            key={concept.id}
            className="text-button"
            onClick={() =>
              update((s) => {
                const now = Date.now();
                const previous = s.review.find(
                  (item) => item.conceptId === concept.id,
                );
                const reminder = {
                  ...(previous ?? {
                    conceptId: concept.id,
                    intervalDays: 0,
                    attempts: 0,
                  }),
                  dueAt: Math.min(now, previous?.dueAt ?? now),
                  reason: "Niepewność zaznaczona w retrospektywie projektu",
                };
                return {
                  ...s,
                  review: previous
                    ? s.review.map((item) =>
                        item === previous ? reminder : item,
                      )
                    : [...s.review, reminder],
                };
              })
            }
          >
            <Bookmark size={16} />
            {t("Powtórz: ")}
            {courseText(concept.title)}
          </button>
        ))}
      </section>
    </div>
  );
}
