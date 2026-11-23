"use client";
import { sourceClassificationLabels } from "@/i18n/ui-locale";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  Play,
  RotateCcw,
  NotebookPen,
  ExternalLink,
  TestTube2,
} from "lucide-react";
import { useLearning } from "./learning-provider";
import { useSuppliedSolutionExposure } from "./use-supplied-solution-exposure";
import {
  concepts,
  lessons,
  traces,
  sources,
  modules,
  projects,
} from "@/content/course";
import {
  STUDY_SESSION_PROJECT_ID,
  STUDY_SESSION_ENDPOINT_STEP_ID,
  STUDY_SESSION_ENTRY_LABEL,
} from "@/domain/study-session-practice";
import { LearnerInstruction } from "./learner-instruction";
import { courseNoteKey } from "@/content/course-notes";
import { createStepProgress, stepKey } from "@/persistence/state";
import { evaluate } from "@/engine/evaluate";
import { choicesForStep } from "@/engine/choices";
import { predictsRunResult, stepInteraction } from "@/engine/step-interaction";
import {
  recordCourseEvidence,
  evidenceForLessonStep,
  assistanceForLessonStep,
  courseEvidenceSummary,
  recordCourseLessonExposure,
  recordSuppliedSolutions,
  courseGateRecovery,
} from "@/content/learning-context";
import type { RunResult, StepProgress, EvaluationResult } from "@/domain/types";
import { LearningText } from "./learning-text";
import { CompilerCoach, type CoachRecoveryStatus } from "./compiler-coach";
import { CompilerOutput, compilerConnectionFailure } from "./compiler-output";
import { OwnershipVisualizer } from "./ownership-visualizer";
import { Eyebrow, ProgressLine } from "./ui";
import { nextLessonForNavigation } from "@/engine/course-route";
import { useLocale } from "./locale-provider";
const CodeEditor = dynamic(() => import("./code-editor"), { ssr: false });
const kindLabels = {
  predict: "Przewidź",
  run: "Uruchom",
  observe: "Zaobserwuj",
  explain: "Wyjaśnij",
  modify: "Zmień",
  debug: "Napraw",
  recall: "Przypomnij",
  apply: "Zastosuj",
  trace: "Prześledź",
  blank: "Od pustej kartki",
  assessment: "Sprawdź model",
};
type WorkspacePanel = "lesson" | "code" | "output";
type PanelDescriptor = {
  key: WorkspacePanel;
  tabId: `workspace-tab-${WorkspacePanel}`;
  panelId: `workspace-panel-${WorkspacePanel}`;
  label: string;
};
export function LessonWorkspace({
  lesson,
}: {
  lesson: (typeof lessons)[number];
}) {
  const { t, courseText } = useLocale();
  const { state, update, generation } = useLearning();
  const [pending, setPending] = useState(false);
  const [executionMessage, setExecutionMessage] = useState("");
  const index = state.resume.stepIndex;
  const noteKey = courseNoteKey("lesson", lesson.id);
  const step = lesson.steps[index];
  const currentModule = modules.find(
    (candidate) => candidate.id === lesson.moduleId,
  );
  const matchingPrimaryCriteria = (currentModule?.gateCriteria ?? []).filter(
    (criterion) =>
      criterion.requiredIndependentCodingTasks !== undefined &&
      criterion.taskRefs.some(
        (ref) => ref.lessonId === lesson.id && ref.stepId === step.id,
      ),
  );
  const matchingRecoveryStatuses = matchingPrimaryCriteria.map((criterion) =>
    courseGateRecovery(state, criterion, lessons),
  );
  const freshIndependentTaskAvailable = matchingRecoveryStatuses.some(
    (recovery, index) => {
      if (
        recovery.status !== "available" ||
        step.evaluator?.kind !== "tests" ||
        !step.evidence?.codingTaskId
      )
        return false;
      const criterion = matchingPrimaryCriteria[index];
      const targetRef = recovery.task;
      if (
        !criterion.taskRefs.some(
          (ref) =>
            ref.lessonId === targetRef.lessonId &&
            ref.stepId === targetRef.stepId,
        )
      )
        return false;
      const targetStep = lessons
        .find((candidate) => candidate.id === targetRef.lessonId)
        ?.steps.find((candidate) => candidate.id === targetRef.stepId);
      return (
        targetStep?.evaluator?.kind === "tests" &&
        targetStep.evidence?.codingTaskId !== undefined &&
        targetStep.evidence.codingTaskId !== step.evidence.codingTaskId
      );
    },
  );
  const recoveryStatus: CoachRecoveryStatus = freshIndependentTaskAvailable
    ? "available"
    : matchingRecoveryStatuses.some(
          (recovery) => recovery.status === "complete",
        )
      ? "complete"
      : matchingRecoveryStatuses.some(
            (recovery) => recovery.status === "exhausted",
          )
        ? "exhausted"
        : "none";
  const nextLesson = nextLessonForNavigation(lesson.id, lessons, modules);
  const learnerProject =
    lesson.id === STUDY_SESSION_PROJECT_ID &&
    step.id === STUDY_SESSION_ENDPOINT_STEP_ID
      ? projects.find((project) => project.id === STUDY_SESSION_PROJECT_ID)
      : undefined;
  const nextLabel =
    index < lesson.steps.length - 1
      ? t("Dalej")
      : !nextLesson
        ? t("Wróć do mapy")
        : nextLesson.moduleId !== lesson.moduleId
          ? t("Kolejny moduł")
          : t("Następna lekcja");
  const sessionStop = lesson.sessionStops?.find(
    (stop) => stop.afterStepId === step.id,
  );
  const finalSessionStop = lesson.sessionStops?.at(-1);
  const finalSessionStopIndex = finalSessionStop
    ? lesson.steps.findIndex(
        (candidate) => candidate.id === finalSessionStop.afterStepId,
      )
    : -1;
  const finalStage =
    finalSessionStopIndex >= 0
      ? lesson.steps[finalSessionStopIndex + 1]
      : undefined;
  const key = stepKey(lesson.id, step.id);
  const progress = state.steps[key] ?? createStepProgress(step.code);
  const assistance = assistanceForLessonStep(state, lesson, step);
  const code = progress.code ?? step.code ?? "";
  const suppliedCodeRef = useSuppliedSolutionExposure(step, "code", code);
  const suppliedSolutionRef = useSuppliedSolutionExposure<HTMLElement>(
    step,
    "solution",
    progress.revealed ? step.solution : undefined,
  );
  const lastAttempt = progress.attempts.at(-1);
  const lastRun = [...progress.attempts].reverse().find((a) => a.result);
  const result = lastRun?.result;
  const { hasCode, editable, executable: usesRun } = stepInteraction(step);
  const prediction = predictsRunResult(step);
  const needsPrediction =
    prediction &&
    !progress.attempts.some(
      (attempt) => attempt.answer !== undefined && !attempt.result,
    );
  const isManifest = step.evaluator?.kind === "manifest-contract";
  const isToml = step.editorMode === "toml";
  const panels = isToml
    ? (["lesson", "code"] as const)
    : (["lesson", "code", "output"] as const);
  const panel = !hasCode
    ? "lesson"
    : isToml && state.resume.panel === "output"
      ? "code"
      : state.resume.panel;
  const panelDescriptors: PanelDescriptor[] = panels.map((key) => ({
    key,
    tabId: `workspace-tab-${key}`,
    panelId: `workspace-panel-${key}`,
    label:
      key === "lesson"
        ? t("Zadanie")
        : key === "code"
          ? t("Kod")
          : `${t("Wyjście")}${result ? " • " + (result.status === "success" ? "OK" : "!") : ""}`,
  }));
  const lessonId = lesson.id;
  const stepId = step.id;
  const exposureConceptIds = step.evidence?.conceptIds ?? lesson.conceptIds;
  const openedStep = useRef("");
  useEffect(() => {
    if (openedStep.current === key) return;
    openedStep.current = key;
    update((s) =>
      recordCourseLessonExposure(s, {
        lessonId,
        stepId,
        conceptIds: exposureConceptIds,
        at: Date.now(),
      }),
    );
  }, [key, lessonId, stepId, exposureConceptIds, update]);
  function patch(values: Partial<StepProgress>) {
    update((s) => {
      let next = {
        ...s,
        steps: {
          ...s.steps,
          [key]: {
            ...(s.steps[key] ?? createStepProgress(step.code)),
            ...values,
          },
        },
      };
      if (values.revealed && step.solution) {
        next = recordSuppliedSolutions(next, step, "solution", Date.now());
      }
      return values.hints !== undefined ||
        values.revealed ||
        values.traceIndex !== undefined
        ? recordCourseLessonExposure(
            next,
            {
              lessonId,
              stepId,
              conceptIds: exposureConceptIds,
              at: Date.now(),
              hints: values.hints,
              revealed: values.revealed,
            },
            values.revealed === true ? "supplied-solution" : "exposure",
          )
        : next;
    });
  }
  function submit(outcome: EvaluationResult, run?: RunResult) {
    update((s) => {
      const prior = s.steps[key] ?? createStepProgress(step.code);
      const next = {
        ...s,
        steps: {
          ...s.steps,
          [key]: {
            ...prior,
            completed: prior.completed || outcome.passed,
            attempts: [
              ...prior.attempts,
              {
                at: Date.now(),
                answer: prior.answer,
                code: run || isManifest ? code : undefined,
                result: run,
                passed: outcome.passed,
                feedback: outcome.feedback,
              },
            ],
          },
        },
      };
      return recordCourseEvidence(next, {
        id: crypto.randomUUID(),
        ...evidenceForLessonStep(lesson, step),
        lessonId: lesson.id,
        stepId: step.id,
        kind:
          step.evaluator?.kind === "rubric" ? "self-rating" : step.evidenceKind,
        passed: outcome.passed,
        ...assistanceForLessonStep(s, lesson, step),
        at: Date.now(),
        gate: !!step.evidenceGate && step.evaluator?.kind !== "rubric",
        evaluator: step.evaluator?.kind,
      });
    });
  }
  function checkAnswer() {
    if (!step.evaluator) return;
    submit(
      evaluate(step.evaluator, {
        answer: progress.answer,
        code,
        rubricChecks: progress.rubricChecks,
      }),
    );
  }
  async function run() {
    if (isToml || needsPrediction) return;
    const requestGeneration = generation();
    setPending(true);
    setExecutionMessage("");
    const tests =
      step.evaluator?.kind === "tests" ? step.evaluator.tests : undefined;
    let output: RunResult;
    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, mode: tests ? "test" : "run", tests }),
        signal: AbortSignal.timeout(25000),
      });
      output = await response.json();
    } catch {
      output = compilerConnectionFailure;
    }
    setPending(false);
    if (generation() !== requestGeneration) return;
    if (["infrastructure-error", "timeout"].includes(output.status)) {
      setExecutionMessage("Próba nie wpływa na mastery. Spróbuj ponownie.");
      update((s) => {
        const prior = s.steps[key] ?? createStepProgress(step.code);
        return {
          ...s,
          steps: {
            ...s.steps,
            [key]: {
              ...prior,
              attempts: [
                ...prior.attempts,
                {
                  at: Date.now(),
                  passed: false,
                  feedback: "Problem z wykonaniem — bez oceny.",
                  result: output,
                  code,
                },
              ],
            },
          },
        };
      });
    } else if (usesRun && step.evaluator) {
      submit(evaluate(step.evaluator, { result: output, code }), output);
    } else {
      update((s) => {
        const prior = s.steps[key] ?? createStepProgress(step.code);
        const at = Date.now();
        const next = {
          ...s,
          steps: {
            ...s.steps,
            [key]: {
              ...prior,
              attempts: [
                ...prior.attempts,
                {
                  at,
                  passed: prior.completed,
                  feedback:
                    step.explanation ?? "Porównaj wynik z przewidywaniem.",
                  result: output,
                  code,
                },
              ],
            },
          },
        };
        return prediction
          ? recordCourseLessonExposure(next, {
              lessonId,
              stepId,
              conceptIds: exposureConceptIds,
              at,
              hints: 1,
            })
          : next;
      });
    }
  }
  function navigateStep(next: number) {
    setExecutionMessage("");
    update((s) => ({
      ...s,
      resume: { ...s.resume, stepIndex: next, panel: "lesson" },
    }));
  }
  function next() {
    if (index < lesson.steps.length - 1) navigateStep(index + 1);
    else {
      update((s) => ({
        ...s,
        resume: {
          ...s.resume,
          ...(nextLesson
            ? {
                view: "lesson" as const,
                lessonId: nextLesson.id,
                stepIndex: 0,
                panel: "lesson" as const,
              }
            : { view: "course" as const }),
        },
      }));
    }
  }
  function observed() {
    submit({
      passed: true,
      feedback:
        "Obserwacja zapisana. Następny eksperyment sprawdzi zastosowanie.",
      evaluator: "rubric",
    });
  }
  return (
    <div className={`lesson-workspace step-${step.kind} mobile-panel-${panel}`}>
      {panel !== "lesson" && (
        <h1 className="sr-only mobile-editor-title">
          {courseText(step.title)} · {panel === "code" ? t("Kod") : t("Wynik")}
        </h1>
      )}
      <div className="lesson-top">
        <button
          className="text-button"
          onClick={() =>
            update((s) => ({ ...s, resume: { ...s.resume, view: "course" } }))
          }
        >
          <ArrowLeft size={15} />
          {courseText(
            modules.find((module) => module.id === lesson.moduleId)?.title,
          ) || t("Mapa nauki")}
        </button>
        <span>{courseText(lesson.title)}</span>
        <button
          className={`icon-button ${state.bookmarks.includes(lesson.id) ? "bookmarked" : ""}`}
          aria-label={
            state.bookmarks.includes(lesson.id)
              ? t("Usuń zakładkę")
              : t("Dodaj zakładkę")
          }
          aria-pressed={state.bookmarks.includes(lesson.id)}
          onClick={() =>
            update((s) => ({
              ...s,
              bookmarks: s.bookmarks.includes(lesson.id)
                ? s.bookmarks.filter((id) => id !== lesson.id)
                : [...s.bookmarks, lesson.id],
            }))
          }
        >
          <Bookmark size={18} />
        </button>
      </div>
      <nav className="step-navigation" aria-label={t("Kroki lekcji")}>
        {lesson.steps.map((item, i) => (
          <button
            key={item.id}
            className={i === index ? "active" : ""}
            aria-current={i === index ? "step" : undefined}
            disabled={pending}
            onClick={() => navigateStep(i)}
          >
            <span
              aria-hidden={lesson.id === "first-program" ? true : undefined}
            >
              {state.steps[stepKey(lesson.id, item.id)]?.completed ? (
                <Check size={13} />
              ) : (
                String(i + 1).padStart(2, "0")
              )}
            </span>
            {lesson.id === "first-program"
              ? courseText(item.title)
              : t(kindLabels[item.kind])}
          </button>
        ))}
      </nav>
      <ProgressLine
        value={(100 * (index + 1)) / lesson.steps.length}
        label={t("Pozycja w lekcji")}
      />
      {hasCode && (
        <div
          className="mobile-workspace-tabs"
          role="tablist"
          aria-label={t("Panele zadania")}
        >
          {panelDescriptors.map((descriptor) => (
            <button
              role="tab"
              key={descriptor.key}
              id={descriptor.tabId}
              aria-selected={panel === descriptor.key}
              aria-controls={descriptor.panelId}
              tabIndex={panel === descriptor.key ? 0 : -1}
              onKeyDown={(event) => {
                const position = panelDescriptors.findIndex(
                  (item) => item.key === descriptor.key,
                );
                const nextIndex =
                  event.key === "ArrowRight"
                    ? (position + 1) % panels.length
                    : event.key === "ArrowLeft"
                      ? (position + panels.length - 1) % panels.length
                      : event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? panels.length - 1
                          : -1;
                if (nextIndex < 0) return;
                event.preventDefault();
                const target = panelDescriptors[nextIndex].key;
                update((s) => ({
                  ...s,
                  resume: { ...s.resume, panel: target },
                }));
                (
                  event.currentTarget.parentElement?.children[
                    nextIndex
                  ] as HTMLButtonElement
                )?.focus();
              }}
              onClick={() =>
                update((s) => ({
                  ...s,
                  resume: { ...s.resume, panel: descriptor.key },
                }))
              }
            >
              {descriptor.label}
            </button>
          ))}
        </div>
      )}
      <div className={`workspace-grid ${!hasCode ? "concept-workspace" : ""}`}>
        <section
          ref={suppliedSolutionRef}
          className="task-pane workspace-panel-lesson"
          id="workspace-panel-lesson"
          role={hasCode ? "tabpanel" : undefined}
          aria-labelledby={hasCode ? "workspace-tab-lesson" : undefined}
          aria-label={t("Zadanie")}
        >
          <Eyebrow>
            {t("KROK ")}
            {index + 1} {t("Z ")}
            {lesson.steps.length} · {kindLabels[step.kind]}
          </Eyebrow>
          <h1>{courseText(step.title)}</h1>
          {lesson.sessionStops?.length ? (
            <section
              className="lesson-context session-stop-plan"
              aria-label={t("Plan etapów lekcji")}
            >
              <h2>{t("Plan etapów")}</h2>
              <ol>
                {lesson.sessionStops.map((stop) => {
                  const boundaryIndex = lesson.steps.findIndex(
                    (candidate) => candidate.id === stop.afterStepId,
                  );
                  const boundaryStep =
                    boundaryIndex >= 0
                      ? lesson.steps[boundaryIndex]
                      : undefined;
                  return (
                    <li key={stop.afterStepId}>
                      <strong>{courseText(stop.title)}</strong>{" "}
                      {boundaryStep ? (
                        <>
                          {t("Po ukończeniu kroku ")}
                          {boundaryIndex + 1} {t("„")}
                          {courseText(boundaryStep.title)}
                          {t("” możesz zrobić przerwę.")}
                        </>
                      ) : (
                        <>
                          {t(
                            "Po ukończeniu tego zadania możesz zrobić przerwę.",
                          )}
                        </>
                      )}{" "}
                      {t("Następny etap: ")}
                      {courseText(stop.nextGoal)}
                    </li>
                  );
                })}
                {finalStage && (
                  <li>
                    <strong>{t("Końcowy etap:")}</strong>{" "}
                    {courseText(finalStage.title)}
                  </li>
                )}
              </ol>
            </section>
          ) : null}
          <p className="task-prompt">
            <LearningText>{step.prompt}</LearningText>
          </p>
          {sessionStop && (
            <aside
              className="lesson-context session-stop-note"
              aria-label={t("Miejsce na przerwę")}
            >
              <p>
                <strong>{courseText(sessionStop.title)}</strong>
              </p>
              <p>
                <strong>{t("Następny etap:")}</strong>{" "}
                {courseText(sessionStop.nextGoal)}
              </p>
              <p>
                {t(
                  "Po ukończeniu tego zadania możesz zrobić przerwę. Jeśli kończysz teraz, wrócisz do tego kroku wraz z zapisanym szkicem, pomocą i notatkami.",
                )}
              </p>
            </aside>
          )}
          {step.evidence?.codingTaskId && (
            <p className="footnote">
              {t("Bieżący kontrakt: wersja ")}
              {step.evidence.version}
              {t(
                ". Zapisany szkic i ukończenie pozostają dostępne. Potwierdzenie wymaga przejścia obecnych testów; wcześniejsze podpowiedzi pozostają przypisane do zadania.",
              )}
            </p>
          )}
          {(assistance.hints > progress.hints ||
            (assistance.revealed && !progress.revealed)) && (
            <p className="footnote">
              {t(
                "Historia tego zadania zawiera podpowiedź lub odsłonięcie. Bieżąca próba zachowa te podpowiedzi lub odsłonięcie; nadal możesz ukończyć zadanie i ćwiczyć.",
              )}
            </p>
          )}
          {step.evidence?.conceptIds.map((conceptId) => {
            const summary = courseEvidenceSummary(state, conceptId);
            return summary.requiredCodingTasks === undefined ? null : (
              <p className="footnote" key={conceptId}>
                {courseText(
                  concepts.find((concept) => concept.id === conceptId)?.title,
                )}
                {t(": samodzielne zadania kodowe ")}
                {summary.qualifyingCodingTasks}/{summary.requiredCodingTasks}
                {summary.hasLegacyEvidence &&
                  t(" · Starsze wyniki pozostają w historii.")}
              </p>
            );
          })}
          {step.evidenceGate && (
            <p className="gate-label">{t("◇ Zadanie samodzielności")}</p>
          )}
          {step.evaluator && !usesRun && !isManifest && (
            <div className="answer-area">
              {step.choices ? (
                <fieldset>
                  <legend>{t("Twoja decyzja")}</legend>
                  {choicesForStep(step, lesson.id).map((choice) => (
                    <label
                      className={`choice ${progress.answer === choice.id ? "selected" : ""}`}
                      key={choice.id}
                    >
                      <input
                        type="radio"
                        name={key}
                        value={choice.id}
                        checked={progress.answer === choice.id}
                        onChange={() => patch({ answer: choice.id })}
                      />
                      <span>
                        <LearningText>{choice.label}</LearningText>
                      </span>
                    </label>
                  ))}
                </fieldset>
              ) : step.evaluator.kind === "rubric" ? (
                <>
                  <label>
                    {t("Wyjaśnij własnymi słowami")}
                    <textarea
                      aria-label={t("Twoje wyjaśnienie")}
                      value={progress.answer}
                      onChange={(e) => patch({ answer: e.target.value })}
                      placeholder={t(
                        "Najpierw zapisz swój model. Potem porównaj go z kryteriami.",
                      )}
                    />
                  </label>
                  <details className="rubric">
                    <summary>{t("Porównaj z kryteriami")}</summary>
                    <p>
                      {t(
                        "To samoocena wyjaśnienia, nie automatyczna ocena jego poprawności.",
                      )}
                    </p>
                    {step.evaluator.criteria.map((criterion) => (
                      <label
                        key={courseText(criterion)}
                        className="check-label"
                      >
                        <input
                          type="checkbox"
                          checked={progress.rubricChecks.includes(criterion)}
                          onChange={(e) =>
                            patch({
                              rubricChecks: e.target.checked
                                ? [...progress.rubricChecks, criterion]
                                : progress.rubricChecks.filter(
                                    (x) => x !== criterion,
                                  ),
                            })
                          }
                        />
                        {courseText(criterion)}
                      </label>
                    ))}
                  </details>
                </>
              ) : (
                <label>
                  {step.evaluator.kind === "ordering"
                    ? t("Kolejność (elementy oddziel przecinkami)")
                    : t("Twoje przewidywanie")}
                  <textarea
                    aria-label={t("Twoja odpowiedź")}
                    rows={3}
                    value={progress.answer}
                    onChange={(e) => patch({ answer: e.target.value })}
                    placeholder={t("Zapisz odpowiedź, zanim uruchomisz kod…")}
                  />
                </label>
              )}
              <button
                className="primary"
                disabled={
                  !progress.answer.trim() && step.evaluator.kind !== "rubric"
                }
                onClick={checkAnswer}
              >
                {t("Sprawdź odpowiedź")}
                <ArrowRight size={16} />
              </button>
            </div>
          )}
          {lastAttempt && (
            <div
              className={`feedback ${lastAttempt.passed ? "passed" : ""}`}
              role="status"
            >
              {lastAttempt.passed ? <Check size={18} /> : null}
              <p>{t(courseText(lastAttempt.feedback))}</p>
            </div>
          )}
          {executionMessage && <p role="status">{t(executionMessage)}</p>}
          {step.explanation &&
            (progress.completed ||
              progress.attempts.length > 0 ||
              !step.evaluator) && (
              <div className="lesson-explanation">
                <h2>{t("Co z tego wynika?")}</h2>
                <p>
                  <LearningText>{step.explanation}</LearningText>
                </p>
              </div>
            )}
          {step.traceId && traces[step.traceId] && (
            <div className="inline-visualizer">
              <OwnershipVisualizer
                trace={traces[step.traceId]}
                index={progress.traceIndex}
                onChange={(traceIndex) => patch({ traceIndex })}
              />
            </div>
          )}
          {!step.evaluator && (
            <button className="secondary" onClick={observed}>
              {progress.completed
                ? t("Obserwacja zapisana")
                : t("Zapisz obserwację")}
              <Check size={16} />
            </button>
          )}
          <details className="lesson-context lesson-notes">
            <summary>{t("Cel lekcji i zadanie końcowe")}</summary>
            <ul>
              {lesson.outcomes.map((outcome) => (
                <li key={outcome}>
                  <LearningText>{outcome}</LearningText>
                </li>
              ))}
            </ul>
            <p>
              <strong>{t("Zastosowanie:")}</strong>{" "}
              <LearningText>{lesson.transferTask}</LearningText>
            </p>
            <p>
              <strong>{t("Dowód samodzielności:")}</strong>{" "}
              <LearningText>{lesson.evidenceGate}</LearningText>
            </p>
          </details>
          {progress.completed && lesson.misconceptions.length > 0 && (
            <details className="lesson-context lesson-notes">
              <summary>{t("Sprawdź swój model — częste pułapki")}</summary>
              <p>
                {t(
                  "Sprawdź w kodzie, dlaczego te założenia prowadzą do błędów:",
                )}
              </p>
              <ul>
                {lesson.misconceptions.map((misconception) => (
                  <li key={misconception}>
                    <LearningText>{misconception}</LearningText>
                  </li>
                ))}
              </ul>
            </details>
          )}
          <CompilerCoach
            step={step}
            progress={progress}
            recoveryStatus={recoveryStatus}
            onHints={(hints) => patch({ hints })}
            onReveal={() => patch({ revealed: true })}
          />
          <details className="lesson-notes">
            <summary>
              <NotebookPen size={16} />
              {t("Twój notatnik")}
            </summary>
            <label>
              {t("Notatki do lekcji")}
              <textarea
                value={state.notes[noteKey] ?? state.notes[lesson.id] ?? ""}
                onChange={(e) =>
                  update((s) => ({
                    ...s,
                    notes: { ...s.notes, [noteKey]: e.target.value },
                  }))
                }
                placeholder={t(
                  "Co mnie zaskoczyło? Jak opisać tę regułę własnymi słowami?",
                )}
              />
            </label>
          </details>
          <details className="sources">
            <summary>{t("Źródła i kontekst")}</summary>
            {lesson.sourceIds.map((id) => {
              const source = sources.find((s) => s.id === id);
              return source ? (
                <p key={id}>
                  <a href={source.url} target="_blank" rel="noreferrer">
                    {courseText(source.title)}
                    <ExternalLink size={12} />
                  </a>
                  <small>
                    {t("Sprawdzono ")}
                    {source.reviewedAt} · {t(sourceClassificationLabels[source.classification])}
                  </small>
                </p>
              ) : null;
            })}
          </details>
        </section>
        {hasCode && (
          <section
            className="code-pane"
            id="workspace-code"
            aria-label={t("Edytor kodu")}
          >
            <div
              className="workspace-panel-code"
              id="workspace-panel-code"
              role="tabpanel"
              aria-labelledby="workspace-tab-code"
            >
              <div className="editor-toolbar">
                <span>
                  <span className="file-dot" />{" "}
                  {step.editorFile ??
                    (isToml
                      ? "Cargo.toml"
                      : step.evaluator?.kind === "tests"
                        ? "lib.rs"
                        : "main.rs")}
                </span>
                <div>
                  <button
                    className="icon-button"
                    aria-label={t("Przywróć kod początkowy")}
                    onClick={() => {
                      if (
                        window.confirm(
                          t(
                            "Przywrócić kod początkowy tego kroku? Obecny szkic zostanie zastąpiony.",
                          ),
                        )
                      )
                        patch({ code: step.code ?? "" });
                    }}
                  >
                    <RotateCcw size={15} />
                  </button>
                  {(!isToml || isManifest) && (
                    <button
                      className="run-button"
                      disabled={pending || !code.trim() || needsPrediction}
                      onClick={isManifest ? checkAnswer : () => void run()}
                    >
                      {isManifest ? (
                        <Check size={15} />
                      ) : step.evaluator?.kind === "tests" ? (
                        <TestTube2 size={15} />
                      ) : (
                        <Play size={15} />
                      )}{" "}
                      {isManifest
                        ? t("Sprawdź manifest")
                        : pending
                          ? t("Kompilowanie…")
                          : step.evaluator?.kind === "tests"
                            ? t("Uruchom testy")
                            : t("Uruchom")}
                    </button>
                  )}
                </div>
              </div>
              <div className="editor-wrap" ref={suppliedCodeRef}>
                <CodeEditor
                  language={step.editorMode}
                  code={code}
                  onChange={(code) => patch({ code })}
                  readOnly={!editable || pending}
                  fontSize={state.settings.editorFontSize}
                  theme={state.settings.theme}
                  accessible={state.settings.accessibleEditor}
                />
              </div>
              <div className="editor-status">
                <span>
                  {isToml
                    ? t("TOML 1.0 · sprawdzenie deklaracji")
                    : "Rust · stable · edition 2024"}
                </span>
                <button
                  onClick={() =>
                    update((s) => ({
                      ...s,
                      settings: {
                        ...s.settings,
                        accessibleEditor: !s.settings.accessibleEditor,
                      },
                    }))
                  }
                >
                  {state.settings.accessibleEditor
                    ? "Monaco Editor"
                    : t("Prosty edytor")}
                </button>
              </div>
              {!isToml &&
                lastRun?.code !== undefined &&
                lastRun.code !== code && (
                  <p className="output-stale" role="status">
                    {t(
                      "Wynik pochodzi z poprzedniej wersji kodu. Uruchom ponownie po zmianach.",
                    )}
                  </p>
                )}
            </div>
            {!isToml && (
              <div
                className="workspace-panel-output"
                id="workspace-panel-output"
                role="tabpanel"
                aria-labelledby="workspace-tab-output"
              >
                <CompilerOutput result={result} pending={pending} />
              </div>
            )}
          </section>
        )}
      </div>
      {learnerProject && (
        <details className="study-session-entry">
          <summary>{courseText(STUDY_SESSION_ENTRY_LABEL)}</summary>
          <LearnerInstruction project={learnerProject} />
        </details>
      )}
      <footer className="lesson-footer">
        <button
          className="text-button"
          disabled={pending || index === 0}
          onClick={() => navigateStep(index - 1)}
        >
          <ArrowLeft size={16} />
          {t("Poprzedni krok")}
        </button>
        <span className="footnote">
          {progress.completed
            ? t("Krok sprawdzony. Możesz przejść dalej.")
            : t("Zadanie zostaje otwarte, dopóki nie sprawdzisz rozwiązania.")}
        </span>
        <button
          className="primary"
          disabled={pending || !progress.completed}
          onClick={next}
        >
          {nextLabel}
          <ArrowRight size={17} />
        </button>
      </footer>
    </div>
  );
}
