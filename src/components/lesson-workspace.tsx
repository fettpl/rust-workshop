"use client";
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
import { lessons, traces, sources, modules } from "@/content/course";
import { createStepProgress, stepKey } from "@/persistence/state";
import { evaluate } from "@/engine/evaluate";
import { choicesForStep } from "@/engine/choices";
import {
  recordCourseEvidence,
  recordCourseLessonExposure,
} from "@/content/learning-context";
import type { RunResult, StepProgress, EvaluationResult } from "@/domain/types";
import { LearningText } from "./learning-text";
import { CompilerCoach } from "./compiler-coach";
import { CompilerOutput } from "./compiler-output";
import { OwnershipVisualizer } from "./ownership-visualizer";
import { Eyebrow, ProgressLine } from "./ui";
import { nextLessonForNavigation } from "@/engine/course-route";
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
export function LessonWorkspace() {
  const { state, update, generation } = useLearning();
  const [pending, setPending] = useState(false);
  const [executionMessage, setExecutionMessage] = useState("");
  const lesson =
    lessons.find((l) => l.id === state.resume.lessonId) ?? lessons[0];
  const index = Math.min(state.resume.stepIndex, lesson.steps.length - 1);
  const step = lesson.steps[index];
  const nextLesson = nextLessonForNavigation(lesson.id, lessons, modules);
  const nextLabel =
    index < lesson.steps.length - 1
      ? "Dalej"
      : !nextLesson
        ? "Wróć do mapy"
        : nextLesson.moduleId !== lesson.moduleId
          ? "Kolejny moduł"
          : "Następna lekcja";
  const key = stepKey(lesson.id, step.id);
  const progress = state.steps[key] ?? createStepProgress(step.code);
  const code = progress.code ?? step.code ?? "";
  const lastAttempt = progress.attempts.at(-1);
  const lastRun = [...progress.attempts].reverse().find((a) => a.result);
  const result = lastRun?.result;
  const hasCode = step.code !== undefined || step.kind === "blank";
  const isManifest = step.evaluator?.kind === "manifest-contract";
  const isToml = step.editorMode === "toml";
  const panels = isToml
    ? (["lesson", "code"] as const)
    : (["lesson", "code", "output"] as const);
  const usesRun =
    step.evaluator &&
    ["exact-output", "compilation", "expected-error", "tests"].includes(
      step.evaluator.kind,
    );
  const editable =
    !["predict", "observe", "explain", "trace", "recall"].includes(step.kind) ||
    (step.kind === "recall" &&
      step.code !== undefined &&
      step.evaluator?.kind === "tests");
  const panel = !hasCode
    ? "lesson"
    : isToml && state.resume.panel === "output"
      ? "code"
      : state.resume.panel;
  const openedStep = useRef("");
  useEffect(() => {
    if (openedStep.current === key) return;
    openedStep.current = key;
    update((s) =>
      recordCourseLessonExposure(s, {
        lessonId: lesson.id,
        stepId: step.id,
        conceptIds: lesson.conceptIds,
        at: Date.now(),
      }),
    );
  }, [key, lesson, step.id, update]);
  function patch(values: Partial<StepProgress>) {
    update((s) => {
      const next = {
        ...s,
        steps: {
          ...s.steps,
          [key]: {
            ...(s.steps[key] ?? createStepProgress(step.code)),
            ...values,
          },
        },
      };
      return values.hints !== undefined ||
        values.revealed ||
        values.traceIndex !== undefined
        ? recordCourseLessonExposure(next, {
            lessonId: lesson.id,
            stepId: step.id,
            conceptIds: lesson.conceptIds,
            at: Date.now(),
            revealed: Boolean(values.revealed || values.hints),
          })
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
        conceptIds: lesson.conceptIds,
        lessonId: lesson.id,
        stepId: step.id,
        kind:
          step.evaluator?.kind === "rubric" ? "self-rating" : step.evidenceKind,
        passed: outcome.passed,
        hints: prior.hints,
        revealed: prior.revealed,
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
    if (isToml) return;
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
      output = {
        status: "infrastructure-error",
        stdout: "",
        stderr:
          "Nie udało się połączyć z kompilatorem. Kod pozostaje zapisany. Spróbuj ponownie po odzyskaniu połączenia.",
        diagnostics: [],
        durationMs: 0,
      };
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
          {step.title} · {panel === "code" ? "Kod" : "Wynik"}
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
          {modules.find((module) => module.id === lesson.moduleId)?.title ??
            "Mapa nauki"}
        </button>
        <span>{lesson.title}</span>
        <button
          className={`icon-button ${state.bookmarks.includes(lesson.id) ? "bookmarked" : ""}`}
          aria-label={
            state.bookmarks.includes(lesson.id)
              ? "Usuń zakładkę"
              : "Dodaj zakładkę"
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
      <div className="step-navigation" aria-label="Kroki lekcji">
        {lesson.steps.map((item, i) => (
          <button
            key={item.id}
            className={i === index ? "active" : ""}
            aria-current={i === index ? "step" : undefined}
            disabled={pending}
            onClick={() => navigateStep(i)}
          >
            <span>
              {state.steps[stepKey(lesson.id, item.id)]?.completed ? (
                <Check size={13} />
              ) : (
                String(i + 1).padStart(2, "0")
              )}
            </span>
            {kindLabels[item.kind]}
          </button>
        ))}
      </div>
      <ProgressLine
        value={(100 * (index + 1)) / lesson.steps.length}
        label="Pozycja w lekcji"
      />
      {hasCode && (
        <div
          className="mobile-workspace-tabs"
          role="tablist"
          aria-label="Panele zadania"
        >
          {panels.map((p) => (
            <button
              role="tab"
              key={p}
              aria-selected={panel === p}
              aria-controls={`workspace-${p}`}
              tabIndex={panel === p ? 0 : -1}
              onKeyDown={(event) => {
                const position = panels.findIndex((item) => item === p);
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
                const target = panels[nextIndex];
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
                update((s) => ({ ...s, resume: { ...s.resume, panel: p } }))
              }
            >
              {p === "lesson"
                ? "Zadanie"
                : p === "code"
                  ? "Kod"
                  : `Output${result ? " • " + (result.status === "success" ? "OK" : "!") : ""}`}
            </button>
          ))}
        </div>
      )}
      <div className={`workspace-grid ${!hasCode ? "concept-workspace" : ""}`}>
        <section
          className="task-pane"
          id="workspace-lesson"
          aria-label="Zadanie"
        >
          <Eyebrow>
            KROK {index + 1} Z {lesson.steps.length} · {kindLabels[step.kind]}
          </Eyebrow>
          <h1>{step.title}</h1>
          <p className="task-prompt">
            <LearningText>{step.prompt}</LearningText>
          </p>
          {step.evidenceGate && (
            <p className="gate-label">◇ Dowód samodzielności · nowy problem</p>
          )}
          {step.evaluator && !usesRun && !isManifest && (
            <div className="answer-area">
              {step.choices ? (
                <fieldset>
                  <legend>Twoja decyzja</legend>
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
                    Wyjaśnij własnymi słowami
                    <textarea
                      aria-label="Twoje wyjaśnienie"
                      value={progress.answer}
                      onChange={(e) => patch({ answer: e.target.value })}
                      placeholder="Najpierw zapisz swój model. Potem porównaj go z kryteriami."
                    />
                  </label>
                  <details className="rubric">
                    <summary>Porównaj z kryteriami</summary>
                    <p>
                      To samoocena wyjaśnienia, nie automatyczna ocena jego
                      poprawności.
                    </p>
                    {step.evaluator.criteria.map((criterion) => (
                      <label key={criterion} className="check-label">
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
                        {criterion}
                      </label>
                    ))}
                  </details>
                </>
              ) : (
                <label>
                  {step.evaluator.kind === "ordering"
                    ? "Kolejność (elementy oddziel przecinkami)"
                    : "Twoje przewidywanie"}
                  <textarea
                    aria-label="Twoja odpowiedź"
                    rows={3}
                    value={progress.answer}
                    onChange={(e) => patch({ answer: e.target.value })}
                    placeholder="Zapisz odpowiedź, zanim uruchomisz kod…"
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
                Sprawdź odpowiedź
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
              <p>{lastAttempt.feedback}</p>
            </div>
          )}
          {executionMessage && <p role="status">{executionMessage}</p>}
          {step.explanation &&
            (progress.completed ||
              progress.attempts.length > 0 ||
              !step.evaluator) && (
              <div className="lesson-explanation">
                <h2>Co z tego wynika?</h2>
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
                ? "Obserwacja zapisana"
                : "Zapisz obserwację i przejdź dalej"}
              <Check size={16} />
            </button>
          )}
          <details className="lesson-context lesson-notes">
            <summary>Cel lekcji i zadanie końcowe</summary>
            <ul>
              {lesson.outcomes.map((outcome) => (
                <li key={outcome}>
                  <LearningText>{outcome}</LearningText>
                </li>
              ))}
            </ul>
            <p>
              <strong>Zastosowanie:</strong>{" "}
              <LearningText>{lesson.transferTask}</LearningText>
            </p>
            <p>
              <strong>Dowód samodzielności:</strong>{" "}
              <LearningText>{lesson.evidenceGate}</LearningText>
            </p>
          </details>
          {progress.completed && lesson.misconceptions.length > 0 && (
            <details className="lesson-context lesson-notes">
              <summary>Sprawdź swój model — częste pułapki</summary>
              <p>Sprawdź w kodzie, dlaczego te założenia prowadzą do błędów:</p>
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
            onHints={(hints) => patch({ hints })}
            onReveal={() => patch({ revealed: true })}
          />
          <details className="lesson-notes">
            <summary>
              <NotebookPen size={16} />
              Twój notatnik
            </summary>
            <label>
              Notatki do lekcji
              <textarea
                value={state.notes[lesson.id] ?? ""}
                onChange={(e) =>
                  update((s) => ({
                    ...s,
                    notes: { ...s.notes, [lesson.id]: e.target.value },
                  }))
                }
                placeholder="Co mnie zaskoczyło? Jak opisać tę regułę własnymi słowami?"
              />
            </label>
          </details>
          <details className="sources">
            <summary>Źródła i kontekst</summary>
            {lesson.sourceIds.map((id) => {
              const source = sources.find((s) => s.id === id);
              return source ? (
                <p key={id}>
                  <a href={source.url} target="_blank" rel="noreferrer">
                    {source.title}
                    <ExternalLink size={12} />
                  </a>
                  <small>
                    Sprawdzono {source.reviewedAt} · {source.classification}
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
            aria-label="Edytor kodu"
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
                  aria-label="Przywróć kod początkowy"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Przywrócić kod początkowy tego kroku? Obecny szkic zostanie zastąpiony.",
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
                    disabled={
                      pending ||
                      !code.trim() ||
                      (step.kind === "predict" && !progress.attempts.length)
                    }
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
                      ? "Sprawdź manifest"
                      : pending
                        ? "Kompilowanie…"
                        : step.evaluator?.kind === "tests"
                          ? "Uruchom testy"
                          : "Uruchom"}
                  </button>
                )}
              </div>
            </div>
            <div className="editor-wrap">
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
                  ? "TOML 1.0 · sprawdzenie deklaracji"
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
                  : "Prosty edytor"}
              </button>
            </div>
            {!isToml &&
              lastRun?.code !== undefined &&
              lastRun.code !== code && (
                <p className="output-stale" role="status">
                  Output pochodzi z poprzedniej wersji kodu. Uruchom ponownie po
                  zmianach.
                </p>
              )}
            {!isToml && <CompilerOutput result={result} pending={pending} />}
          </section>
        )}
      </div>
      <footer className="lesson-footer">
        <button
          className="text-button"
          disabled={pending || index === 0}
          onClick={() => navigateStep(index - 1)}
        >
          <ArrowLeft size={16} />
          Poprzedni krok
        </button>
        <span className="footnote">
          {progress.completed
            ? "Krok sprawdzony. Możesz przejść dalej."
            : "Zadanie zostaje otwarte, dopóki nie sprawdzisz rozwiązania."}
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
