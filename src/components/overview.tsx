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
  courseEvidenceSummary,
  courseCompetencyProgress,
  courseGateRecovery,
  courseModuleGate,
  courseNextGateTask,
} from "@/content/learning-context";
import { dueReviews } from "@/engine/learning";
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
export function useOpenLesson() {
  const { update } = useLearning();
  return (id: string, stepIndex?: number) =>
    update((s) => ({
      ...s,
      resume: {
        ...s.resume,
        view: "lesson",
        lessonId: id,
        stepIndex:
          stepIndex ??
          (s.resume.lessonId === id
            ? s.resume.stepIndex
            : Math.max(
                0,
                lessons
                  .find((lesson) => lesson.id === id)
                  ?.steps.findIndex(
                    (step) => !s.steps[stepKey(id, step.id)]?.completed,
                  ) ?? 0,
              )),
        panel:
          stepIndex === undefined && s.resume.lessonId === id
            ? s.resume.panel
            : "lesson",
      },
    }));
}
function lessonProgress(
  lesson: Lesson,
  steps: ReturnType<typeof useLearning>["state"]["steps"],
) {
  return lesson.steps.filter(
    (step) => steps[stepKey(lesson.id, step.id)]?.completed,
  ).length;
}
export function Dashboard() {
  const now = useClock();
  const { state, update } = useLearning();
  const lesson =
    lessons.find((l) => l.id === state.resume.lessonId) ?? lessons[0];
  const due = dueReviews(state, now);

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
          <Eyebrow>TWÓJ WARSZTAT · RUST 2024</Eyebrow>
          <h1>
            {state.onboarding.name
              ? `Cześć, ${state.onboarding.name}.`
              : "Dobrze Cię widzieć."}
          </h1>
        </div>
      </div>
      <section className="continue-panel" aria-labelledby="continue-title">
        <div className="continue-copy">
          <span className="lesson-index">
            {mapModeForModule(activeModule.id) === "core"
              ? "Ścieżka główna"
              : "Rozszerzenie"}
            {" · "}
            {activeModule.title}
          </span>
          <h2 id="continue-title">{lesson.title}</h2>
          <p>
            <LearningText>{lesson.outcomes[0] ?? lesson.subtitle}</LearningText>
          </p>
          <div className="continue-meta">
            <span>
              Krok {stepIndex + 1} z {lesson.steps.length}
            </span>
            <strong>{currentStep.title}</strong>
          </div>
          <button className="primary" onClick={() => open(lesson.id)}>
            {isResuming ? "Kontynuuj naukę" : "Wejdź do lekcji"}
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="session-outline">
          <div className="session-outline-header">
            <span className="micro">TWOJA SESJA</span>
            <span>
              {progress} / {lesson.steps.length} kroków sprawdzonych
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
                  <span>{step.title}</span>
                  {i === stepIndex && <ArrowRight size={16} />}
                </button>
              </li>
            ))}
          </ol>
        </div>
      </section>
      {state.diagnostic.recommendation && (
        <p className="diagnostic-recommendation">
          <strong>Twój punkt startowy:</strong>{" "}
          {state.diagnostic.recommendation}
        </p>
      )}
      <div className="dashboard-secondary">
        <section className="review-teaser">
          <div className="section-heading">
            <span className="round-icon">
              <RotateCcw size={20} />
            </span>
            <span className="micro">ODTWÓRZ Z PAMIĘCI</span>
          </div>
          <h2>
            {due.length
              ? `${due.length} ${due.length === 1 ? "krótka powtórka" : "krótkie powtórki"}`
              : "Daj wiedzy chwilę."}
          </h2>
          <p>
            {due.length
              ? "Sprawdź, co potrafisz odtworzyć bez zaglądania do lekcji."
              : "Po pierwszych eksperymentach pojawią się tutaj krótkie powroty do poznanych zasad."}
          </p>
          <button
            className="text-button"
            onClick={() =>
              update((s) => ({ ...s, resume: { ...s.resume, view: "review" } }))
            }
          >
            {due.length ? "Otwórz powtórki" : "Zobacz plan powtórek"}
            <ArrowRight size={16} />
          </button>
        </section>
        <section className="project-teaser">
          <div className="section-heading">
            <span className="round-icon">
              <Terminal size={20} />
            </span>
            <span className="micro">ZASTOSUJ W PRAKTYCE</span>
          </div>
          <h2>{project.title}</h2>
          <p>{project.objective}</p>
          <p className="footnote">
            {projectCompleted} / {projectSteps} kroków sprawdzonych
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
            Otwórz projekt
            <ArrowUpRight size={16} />
          </button>
        </section>
      </div>
      <section className="competency-section">
        <div className="section-heading spread">
          <div>
            <Eyebrow>CO JUŻ POTRAFISZ</Eyebrow>
            <h2>Pojęcia w bieżącym module</h2>
          </div>
          <span className="micro">
            {practiced} / {moduleConcepts.length} Z DOWODEM ROZUMIENIA
          </span>
        </div>
        {activeModule.id === "ownership" && <OwnershipPolicyNote />}
        <div className="concept-grid">
          {moduleConcepts.map((concept, index) => (
            <div key={concept.id} className="concept-row">
              <span className="concept-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{concept.title}</span>
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
          Opanowanie wynika z samodzielnych rozwiązań. Ukończenie lekcji i
          znajomość pojęcia to różne rzeczy.
        </p>
      </section>
      <details className="competency-details">
        <summary>Kompetencje z całego kursu</summary>
        <p className="footnote">
          Poziom uwzględnia wszystkie powiązane pojęcia. Samo ukończenie lekcji
          nie potwierdza kompetencji.
        </p>
        {competencies.map((competency) => {
          const result = courseCompetencyProgress(state, competency.id);
          return (
            <div className="competency-row" key={competency.id}>
              <div>
                <strong>{competency.title}</strong>
                <small>
                  {result.proven} / {result.total} pojęć z dowodem rozumienia ·{" "}
                  kwalifikujące zadania w powiązanych pojęciach:{" "}
                  {result.independentTasks} · lekcje: {result.lessonCount}
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
            Warto wrócić do: {difficult.map((c) => c.title).join(", ")}. Błąd
            jest wskazówką do kolejnego eksperymentu.
          </span>
        </div>
      )}
    </div>
  );
}
export function CourseMap() {
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
  const gate = courseModuleGate(state, moduleLessons, selectedModule);
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
          label: gate.criteria[index]?.label ?? "Najbliższe zadanie",
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
      criterion.requiredIndependentCodingTasks !== undefined &&
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
      <Eyebrow>MAPA NAUKI</Eyebrow>
      <h1>Od pierwszego programu do samodzielności.</h1>
      <p className="lede">
        Zacznij od fundamentów albo wróć do konkretnego problemu. Każda lekcja
        jest dostępna.
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
        <h2>{selectedModule.title}</h2>
        <p className="lede">{selectedModule.whyItMatters}</p>
        {selectedModule.id === "ownership" && <OwnershipPolicyNote />}
      </div>
      <div className="module-contract">
        <div>
          <h2>Po tym module potrafisz</h2>
          <ul className="check-list">
            {selectedModule.capabilities.map((c) => (
              <li key={c}>
                <Check size={16} />
                {c}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2>Sprawdzian samodzielności</h2>
          <p>{selectedModule.exitGate.join(" ")}</p>
          <div className="connection-note">
            <GitBranch size={18} />
            {selectedModule.projectConnection}
          </div>
        </div>
      </div>
      <section className="module-connections" aria-label="Powiązania modułu">
        <div>
          <h2>Wymagania wstępne</h2>
          {prerequisiteModules.length ? (
            <ul className="module-link-list">
              {prerequisiteModules.map((module) => (
                <li key={module.id}>
                  <button
                    className="text-button"
                    onClick={() => setSelected(module.id)}
                  >
                    {module.title} <ArrowRight size={16} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="footnote">Punkt wyjścia w tej trasie.</p>
          )}
        </div>
        <div>
          <h2>Polecane rozszerzenia</h2>
          {recommendedModules.length ? (
            <ul className="module-link-list">
              {recommendedModules.map((module) => (
                <li key={module.id}>
                  <button
                    className="text-button"
                    onClick={() => setSelected(module.id)}
                  >
                    {module.title} <ArrowRight size={16} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="footnote">
              Odkrywaj rozszerzenia według własnego celu; ta sekcja nie tworzy
              dodatkowych blokad.
            </p>
          )}
        </div>
        <div>
          <h2>Jak wrócić do praktyki</h2>
          <p className="footnote">
            Wybierz zadanie, które pomoże odbudować dowód samodzielności. Każda
            lekcja pozostaje dostępna.
          </p>
          {exhaustedCriteria.length > 0 && (
            <p className="footnote">
              Brak świeżego samodzielnego wariantu: pozostałe zadania mają
              zapisane podpowiedzi lub rozwiązanie. Możesz nadal ćwiczyć;
              powtórzenie nie usuwa wcześniejszej pomocy.
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
                    {target.label} <ArrowRight size={16} />
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
              Otwórz pierwszą lekcję do powtórki <ArrowRight size={16} />
            </button>
          ) : (
            <p className="footnote">
              Każdą lekcję możesz otworzyć ze ścieżki eksperymentów.
            </p>
          )}
        </div>
      </section>
      <section>
        <div className="section-heading spread">
          <h2>Ścieżka eksperymentów</h2>
          <span className="micro">WSZYSTKIE LEKCJE SĄ DOSTĘPNE</span>
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
                  <h3>{lesson.title}</h3>
                  <p>{lesson.subtitle}</p>
                </div>
                <span className="lesson-completion">
                  {completed}/{lesson.steps.length} kroków
                </span>
                <ArrowRight size={19} />
              </button>
            );
          })}
        </div>
      </section>
      <section className="gate-panel">
        <Eyebrow>DOWODY, NIE ODHACZENIA</Eyebrow>
        <h2>
          {gate.passed
            ? "Masz dowody samodzielności."
            : "Co pokaże, że rozumiesz?"}
        </h2>
        <ul className="check-list">
          {gate.criteria.map((criterion, index) => {
            const contract = selectedModule.gateCriteria?.[index];
            const target =
              contract && courseNextGateTask(state, contract, lessons);
            const exhausted =
              contract &&
              contract.requiredIndependentCodingTasks !== undefined &&
              courseGateRecovery(state, contract, lessons).status ===
                "exhausted";
            const targetLesson =
              target && lessons.find((lesson) => lesson.id === target.lessonId);
            return (
              <li key={criterion.label}>
                <span
                  aria-label={
                    criterion.passed ? "Potwierdzone" : "Do sprawdzenia"
                  }
                >
                  {criterion.passed ? "✓" : "○"}
                </span>
                <span>
                  {criterion.label}
                  {exhausted && " · Brak świeżego samodzielnego wariantu"}
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
                    Sprawdź w zadaniu <ArrowRight size={16} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>
      <section className="graph-section">
        <Eyebrow>POWIĄZANIA POJĘĆ</Eyebrow>
        <div className="graph-nodes">
          {concepts
            .filter((concept) =>
              moduleLessons.some((lesson) =>
                lesson.conceptIds.includes(concept.id),
              ),
            )
            .map((concept) => (
              <div key={concept.id}>
                <strong>{concept.title}</strong>
                <small>
                  {concept.prerequisites.length
                    ? "← " +
                      concept.prerequisites
                        .map(
                          (id) =>
                            concepts.find((c) => c.id === id)?.title ?? id,
                        )
                        .join(", ")
                    : "Punkt wyjścia"}
                </small>
              </div>
            ))}
        </div>
      </section>
      <details className="roadmap">
        <summary>
          Pełna ścieżka kursu — co jest dostępne, co przed nami?
        </summary>
        <p>
          Dostępne moduły mają własne zadania i kryteria samodzielności. Kolejne
          części rozwijamy według poniższej ścieżki.
        </p>
        <ol>
          {roadmap.map((item) => (
            <li key={item.title}>
              <span>{item.title}</span>{" "}
              <small>
                {item.status === "available" ? "Dostępne" : "W planie"}
              </small>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}
export function ProjectView() {
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
      <nav className="module-picker" aria-label="Wybierz projekt">
        {projects.map((item, index) => (
          <button
            key={item.id}
            className={item.id === selected.id ? "selected" : ""}
            aria-pressed={item.id === selected.id}
            onClick={() => setSelectedId(item.id)}
          >
            <span className="micro">{String(index + 1).padStart(2, "0")}</span>
            <strong>{item.title}</strong>
          </button>
        ))}
      </nav>
      <ProjectDetails key={selected.id} project={selected} />
    </div>
  );
}

function ProjectDetails({ project }: { project: ProjectContract }) {
  const { state, update } = useLearning();
  const open = useOpenLesson();
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
      <Eyebrow>PROJEKT / TRANSFER</Eyebrow>
      <h1>{project.title}</h1>
      <p className="lede">{project.objective}</p>
      <div className="project-contract-grid">
        <section>
          <h2>Program ma…</h2>
          <ul>
            {project.requiredBehaviors.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </section>
        <section>
          <h2>Dowody poprawności</h2>
          <ul>
            {project.requiredEvidence.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </section>
        <section>
          <h2>Ograniczenia, które uczą</h2>
          <ul>
            {project.constraints.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </section>
      </div>
      <div className="project-launch">
        <span className="round-icon">
          <Terminal size={23} />
        </span>
        <div>
          <h2>Od pomysłu do działającego kodu</h2>
          <p>
            {completed} / {totalSteps} kroków · Twój kod zapisuje się
            automatycznie.
          </p>
          <ProgressLine
            value={totalSteps ? (100 * completed) / totalSteps : 0}
            label="Ukończone kroki projektu"
          />
        </div>
        <button className="primary" onClick={() => open(resumeLessonId)}>
          Pracuj nad projektem
          <ArrowRight size={18} />
        </button>
      </div>
      <LearnerInstruction project={project} />
      {project.package && (
        <ProjectPackage key={project.package.id} project={project.package} />
      )}
      <section className="adversarial">
        <Eyebrow>ZMIANA WYMAGAŃ</Eyebrow>
        <h2>A jeśli warunki się zmienią?</h2>
        <p>{project.adversarialInject}</p>
        <button
          className="secondary"
          onClick={() => open(project.adversarialLessonId)}
        >
          Podejmij nowy wariant
          <ArrowUpRight size={16} />
        </button>
      </section>
      <section className="retrospective">
        <Eyebrow>RETROSPEKTYWA</Eyebrow>
        <h2>Zachowaj to, co odkrywasz.</h2>
        <ul>
          {project.retrospective.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
        <label>
          Twoje obserwacje
          <textarea
            value={state.notes[project.id] ?? ""}
            onChange={(e) =>
              update((s) => ({
                ...s,
                notes: { ...s.notes, [project.id]: e.target.value },
              }))
            }
            placeholder="Który błąd zmienił Twój model myślenia?"
          />
        </label>
        {reviewConcepts.map((concept) => (
          <button
            key={concept.id}
            className="text-button"
            onClick={() =>
              update((s) => ({
                ...s,
                review: [
                  ...s.review.filter((r) => r.conceptId !== concept.id),
                  {
                    conceptId: concept.id,
                    dueAt: Date.now(),
                    intervalDays: 0,
                    attempts: 0,
                    reason: "Niepewność zaznaczona w retrospektywie projektu",
                  },
                ],
              }))
            }
          >
            <Bookmark size={16} />
            Powtórz: {concept.title}
          </button>
        ))}
      </section>
    </div>
  );
}
