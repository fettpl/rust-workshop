"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { ArrowRight, Eye, Clock, Check, RotateCcw } from "lucide-react";
import { useClock } from "./use-clock";
import { useLearning } from "./learning-provider";
import { CompilerOutput } from "./compiler-output";
import { LearningText } from "./learning-text";
import { concepts, lessons } from "@/content/course";
import { dueReviews, rateReview } from "@/engine/learning";
import {
  recordCourseEvidence,
  evidenceForReview,
  courseMastery,
  courseEvidenceSummary,
  recordCourseLessonExposure,
  resolveReviewExercise,
  reviewExerciseIdForOrigin,
} from "@/content/learning-context";
import {
  reviewSessionFinished,
  reviewSessionKey,
  startReviewSession,
} from "@/engine/review-session";
import { evaluate } from "@/engine/evaluate";
import { choicesForStep } from "@/engine/choices";
import { createStepProgress } from "@/persistence/state";
import type { RunResult, StepProgress } from "@/domain/types";
import type { ReviewSession } from "@/domain/types";
import {
  Eyebrow,
  MasteryBadge,
  OwnershipPolicyNote,
  OwnershipEvidenceCount,
} from "./ui";

const CodeEditor = dynamic(() => import("./code-editor"), { ssr: false });

function reviewEventStepId(session: ReviewSession): string {
  return (session.exerciseId ?? session.conceptId) + ":" + session.sessionId;
}

const ownershipConceptIds = new Set(
  lessons
    .filter((lesson) => lesson.moduleId === "ownership")
    .flatMap((lesson) => lesson.conceptIds),
);

export function ReviewView() {
  const clock = useClock();
  const { state, update, generation } = useLearning();
  const [pending, setPending] = useState(false);
  const [executionMessage, setExecutionMessage] = useState("");
  const [selected, setSelected] = useState<string | null>(
    () => state.reviewSession?.conceptId ?? null,
  );
  const [mode, setMode] = useState<"card" | "challenge">(
    () => state.reviewSession?.mode ?? "card",
  );
  const due = dueReviews(state, clock);
  const concept = concepts.find((c) => c.id === selected);
  const ownershipScope = concept ? ownershipConceptIds.has(concept.id) : false;
  const upcoming = state.review
    .filter((item) => item.dueAt > clock)
    .sort((a, b) => a.dueAt - b.dueAt);
  const session =
    state.reviewSession?.conceptId === selected
      ? state.reviewSession
      : undefined;
  const key = session ? reviewSessionKey(session.sessionId) : "";
  const progress: StepProgress = session
    ? (state.steps[key] ?? createStepProgress())
    : createStepProgress();
  const resolution = session
    ? resolveReviewExercise(session.conceptId, session.exerciseId)
    : undefined;
  const step = resolution?.status === "ready" ? resolution.step : undefined;
  const unavailable = resolution?.status === "unavailable";
  const evaluator = step?.evaluator;
  const isManifest = evaluator?.kind === "manifest-contract";
  const executable =
    step?.code !== undefined &&
    evaluator !== undefined &&
    ["exact-output", "compilation", "expected-error", "tests"].includes(
      evaluator.kind,
    );
  const code = progress.code ?? step?.code ?? "";
  const lastAttempt = progress.attempts.at(-1);
  const lastRun = [...progress.attempts]
    .reverse()
    .find((attempt) => attempt.result);
  const result = lastRun?.result;
  const codePassed = Boolean(
    executable &&
    lastAttempt?.passed &&
    lastAttempt.result &&
    lastAttempt.code === code,
  );
  const completed = Boolean(progress.completed);

  function start(id: string, origin: "due" | "practice") {
    if (
      state.reviewSession &&
      !reviewSessionFinished(state, state.reviewSession)
    ) {
      setSelected(state.reviewSession.conceptId);
      setMode(state.reviewSession.mode);
      return;
    }
    // eslint-disable-next-line react-hooks/purity -- Event handler: record actual action time, not the render clock.
    const now = Date.now();
    const wasDue =
      origin === "due" &&
      state.review.some((item) => item.conceptId === id && item.dueAt <= now);
    const exerciseId = reviewExerciseIdForOrigin(state, id, origin, now);
    const candidate = startReviewSession(
      state,
      id,
      now,
      wasDue,
      crypto.randomUUID(),
      exerciseId,
    );
    setSelected(id);
    setMode(candidate.mode);
    update((current) => ({
      ...current,
      reviewSession: startReviewSession(
        current,
        id,
        now,
        wasDue,
        candidate.sessionId,
        exerciseId,
      ),
    }));
  }
  function returnToQueue() {
    setSelected(null);
    setExecutionMessage("");
  }
  function discardUnavailableSession() {
    setSelected(null);
    setExecutionMessage("");
    update((current) => {
      const next = { ...current };
      delete next.reviewSession;
      return next;
    });
  }
  function patch(values: Partial<StepProgress>) {
    if (!session || pending || completed) return;
    update((s) => {
      const next = {
        ...s,
        steps: {
          ...s.steps,
          [key]: {
            ...(s.steps[key] ?? createStepProgress(step?.code)),
            ...values,
          },
        },
      };
      return values.revealed
        ? recordCourseLessonExposure(next, {
            lessonId: "review",
            stepId: session.exerciseId ? reviewEventStepId(session) : key,
            conceptIds: [session.conceptId],
            at: Date.now(),
            revealed: true,
          })
        : next;
    });
  }
  function chooseMode(nextMode: "card" | "challenge") {
    if (pending || completed) return;
    setMode(nextMode);
    if (!session) return;
    update((s) =>
      s.reviewSession?.sessionId === session.sessionId
        ? { ...s, reviewSession: { ...s.reviewSession, mode: nextMode } }
        : s,
    );
  }
  function revealReminder() {
    if (!session || pending || completed) return;
    setMode("card");
    patch({ revealed: true });
    update((s) => ({
      ...s,
      reviewSession:
        s.reviewSession?.sessionId === session.sessionId
          ? { ...s.reviewSession, mode: "card" }
          : s.reviewSession,
      steps: {
        ...s.steps,
        [key]: { ...(s.steps[key] ?? createStepProgress()), revealed: true },
      },
    }));
  }
  function check() {
    if (
      !concept ||
      !step?.evaluator ||
      !session ||
      unavailable ||
      pending ||
      completed
    )
      return;
    const evaluator = step.evaluator;
    const outcome = evaluate(evaluator, { answer: progress.answer, code });
    // eslint-disable-next-line react-hooks/purity -- Event handler: record actual action time, not the render clock.
    const now = Date.now();
    update((s) => {
      const current = s.steps[key] ?? createStepProgress();
      let next = {
        ...s,
        steps: {
          ...s.steps,
          [key]: {
            ...current,
            completed: outcome.passed,
            attempts: [
              ...current.attempts,
              {
                at: now,
                answer: current.answer,
                code: isManifest ? code : undefined,
                passed: outcome.passed,
                feedback: outcome.feedback,
              },
            ],
          },
        },
      };
      next = recordCourseEvidence(next, {
        id: crypto.randomUUID(),
        ...evidenceForReview(concept.id, step),
        lessonId: "review",
        stepId: reviewEventStepId(session),
        kind: "recall",
        passed: outcome.passed,
        hints: 0,
        revealed: current.revealed,
        at: now,
        delayed: session.wasDue,
        gate: false,
        evaluator: evaluator.kind,
      });
      if (outcome.passed) delete next.reviewSession;
      return next;
    });
    if (outcome.passed) setSelected(null);
  }

  async function run() {
    if (
      !concept ||
      !step ||
      !evaluator ||
      !session ||
      unavailable ||
      !executable ||
      pending ||
      completed
    )
      return;
    const requestGeneration = generation();
    setPending(true);
    setExecutionMessage("");
    const tests = evaluator.kind === "tests" ? evaluator.tests : undefined;
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
      setExecutionMessage(
        "Problem z wykonaniem — ta próba nie wpływa na mastery ani termin powtórki.",
      );
      update((s) => {
        const current = s.steps[key] ?? createStepProgress(step.code);
        return {
          ...s,
          steps: {
            ...s.steps,
            [key]: {
              ...current,
              attempts: [
                ...current.attempts,
                {
                  at: Date.now(),
                  code,
                  result: output,
                  passed: false,
                  feedback: "Problem z wykonaniem — bez oceny.",
                },
              ],
            },
          },
        };
      });
      return;
    }

    const outcome = evaluate(evaluator, { result: output, code });
    update((s) => {
      const current = s.steps[key] ?? createStepProgress(step.code);
      const next = {
        ...s,
        steps: {
          ...s.steps,
          [key]: {
            ...current,
            completed: outcome.passed,
            attempts: [
              ...current.attempts,
              {
                at: Date.now(),
                code,
                result: output,
                passed: outcome.passed,
                feedback: outcome.feedback,
              },
            ],
          },
        },
      };
      return recordCourseEvidence(next, {
        id: crypto.randomUUID(),
        ...evidenceForReview(concept.id, step),
        lessonId: "review",
        stepId: reviewEventStepId(session),
        kind: "recall",
        passed: outcome.passed,
        hints: 0,
        revealed: current.revealed,
        at: Date.now(),
        delayed: session.wasDue,
        gate: false,
        evaluator: evaluator.kind,
      });
    });
    setExecutionMessage(
      outcome.passed
        ? "Kod działa. Zostaw wynik widoczny i zakończ powtórkę, gdy jesteś gotowy."
        : "Kompilator odpowiedział, ale rozwiązanie nie spełnia jeszcze zadania.",
    );
  }

  function finishChallenge() {
    if (!session || !codePassed) return;
    update((s) => {
      const next = { ...s };
      delete next.reviewSession;
      return next;
    });
    setSelected(null);
    setExecutionMessage("");
  }
  function rate(rating: "again" | "hard" | "good" | "easy") {
    if (!concept || !step || unavailable || pending || completed) return;
    update((s) => {
      const next = rateReview(s, concept.id, rating, Date.now());
      delete next.reviewSession;
      return next;
    });
    setSelected(null);
  }

  return (
    <div className="review-page">
      <div className="section-heading spread">
        <div>
          <Eyebrow>POWTÓRKI / AKTYWNE ODTWARZANIE</Eyebrow>
          <h1>Co zostało w pamięci?</h1>
        </div>
        <span className="session-chip">
          <Clock size={15} />
          1–3 min
        </span>
      </div>
      <p className="lede">
        Najpierw przywołaj zasadę. Potem sprawdź ją na małym, nowym przykładzie.
      </p>
      {concept && session ? (
        <section className="review-session">
          {!unavailable && (
            <button
              className="text-button"
              disabled={pending || completed}
              onClick={returnToQueue}
            >
              ← Do kolejki
            </button>
          )}
          {unavailable ? (
            <div className="empty-review" role="status">
              <h2>Ta powtórka nie jest dostępna w tej wersji.</h2>
              <p>
                Zachowaliśmy Twój zapis, ale ta przypięta wersja zadania nie
                jest już dostępna. Możesz wrócić do kolejki i wybrać bieżące
                ćwiczenie.
              </p>
              <button className="primary" onClick={discardUnavailableSession}>
                Do kolejki
              </button>
            </div>
          ) : (
            <>
              <div className="section-heading spread">
                <h2>{concept.title}</h2>
                <MasteryBadge
                  level={courseMastery(state, concept.id).level}
                  scope={
                    concept.evidenceCalibration
                      ? ownershipScope
                        ? "ownership"
                        : "calibrated"
                      : undefined
                  }
                />
              </div>
              {concept.evidenceCalibration && (
                <>
                  <OwnershipPolicyNote
                    scope={ownershipScope ? "ownership" : "calibrated"}
                  />
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
                  <p className="footnote">
                    {ownershipScope
                      ? "Odtworzenie po czasie wymaga dwóch wcześniejszych samodzielnych zadań kodowych i ponad 24 godzin bez kontaktu z pojęciem. Ta powtórka nie dodaje kolejnego zadania do tego licznika."
                      : "Dla tego kontraktu liczą się tylko opisane rodziny primary. Gate i blank mogą dzielić rodzinę; pomoc lub wyczerpanie rodziny nie tworzy nowego wariantu. Ta powtórka pozostaje osobnym recall i nie dodaje rodziny primary."}
                  </p>
                </>
              )}
              <div className="segmented">
                <button
                  className={mode === "challenge" ? "selected" : ""}
                  disabled={pending || completed}
                  onClick={() => chooseMode("challenge")}
                >
                  Mały eksperyment
                </button>
                <button
                  className={mode === "card" ? "selected" : ""}
                  disabled={pending || completed}
                  onClick={() => chooseMode("card")}
                >
                  Karta przypomnienia
                </button>
              </div>
              {mode === "challenge" && step ? (
                <>
                  <h3>{step.title}</h3>
                  <LearningText>{step.prompt}</LearningText>
                  {step.code && !executable && !isManifest && (
                    <pre className="code-sample">{step.code}</pre>
                  )}
                  {executable || isManifest ? (
                    <>
                      <div className="review-code-editor">
                        <CodeEditor
                          language={step.editorMode}
                          code={code}
                          onChange={(nextCode) => patch({ code: nextCode })}
                          readOnly={pending || completed}
                          fontSize={state.settings.editorFontSize}
                          theme={state.settings.theme}
                          accessible={state.settings.accessibleEditor}
                        />
                      </div>
                      <div className="button-row">
                        <button
                          className="primary"
                          disabled={pending || completed || !code.trim()}
                          onClick={isManifest ? check : () => void run()}
                        >
                          {isManifest
                            ? "Sprawdź manifest"
                            : pending
                              ? "Kompilowanie…"
                              : evaluator.kind === "tests"
                                ? "Uruchom testy"
                                : "Uruchom kod"}
                          <ArrowRight size={16} />
                        </button>
                        {codePassed && (
                          <button
                            className="secondary"
                            onClick={finishChallenge}
                          >
                            Zakończ powtórkę
                            <Check size={16} />
                          </button>
                        )}
                      </div>
                      {executionMessage && (
                        <p className="feedback" role="status">
                          {executionMessage}
                        </p>
                      )}
                      {lastAttempt && (
                        <p
                          className={`feedback ${lastAttempt.passed ? "passed" : ""}`}
                          role="status"
                        >
                          {lastAttempt.feedback}
                        </p>
                      )}
                      {isManifest ? (
                        <p className="footnote">
                          {step.editorFile ?? "Cargo.toml"} · TOML 1.0 ·
                          sprawdzenie deklaracji
                        </p>
                      ) : (
                        <CompilerOutput result={result} pending={pending} />
                      )}
                      {lastRun?.code !== undefined && lastRun.code !== code && (
                        <p className="footnote" role="status">
                          Output pochodzi z poprzedniej wersji kodu. Uruchom
                          ponownie po zmianach.
                        </p>
                      )}
                    </>
                  ) : step.choices ? (
                    <fieldset>
                      <legend>Twoja decyzja</legend>
                      {choicesForStep(step, `review/${concept.id}`).map(
                        (choice) => (
                          <label className="choice" key={choice.id}>
                            <input
                              type="radio"
                              name="review-answer"
                              disabled={pending || completed}
                              checked={progress.answer === choice.id}
                              onChange={() => patch({ answer: choice.id })}
                            />
                            {choice.label}
                          </label>
                        ),
                      )}
                    </fieldset>
                  ) : (
                    <label>
                      Odpowiedz z pamięci
                      <textarea
                        value={progress.answer}
                        disabled={pending || completed}
                        onChange={(e) => patch({ answer: e.target.value })}
                      />
                    </label>
                  )}
                  {!executable && !isManifest && (
                    <>
                      <button
                        className="primary"
                        disabled={
                          pending || completed || !progress.answer.trim()
                        }
                        onClick={check}
                      >
                        Sprawdź
                        <Check size={17} />
                      </button>
                      {progress.attempts.at(-1) && (
                        <p className="feedback" role="status">
                          {progress.attempts.at(-1)?.feedback}
                        </p>
                      )}
                      <button
                        className="text-button"
                        disabled={pending || completed}
                        onClick={revealReminder}
                      >
                        Potrzebuję przypomnienia
                        <Eye size={16} />
                      </button>
                    </>
                  )}
                </>
              ) : (
                <>
                  <h3>
                    <LearningText>{concept.reviewPrompt}</LearningText>
                  </h3>
                  <label>
                    Przypomnij własnymi słowami
                    <textarea
                      value={progress.answer}
                      disabled={pending || completed}
                      onChange={(e) => patch({ answer: e.target.value })}
                      placeholder="Zanim odsłonisz odpowiedź…"
                    />
                  </label>
                  {!progress.revealed ? (
                    <button
                      className="primary"
                      disabled={pending || completed || !progress.answer.trim()}
                      onClick={() => patch({ revealed: true })}
                    >
                      <Eye size={16} />
                      Odsłoń odpowiedź
                    </button>
                  ) : (
                    <div className="retrieval-reveal">
                      <p>
                        <LearningText>{concept.reviewAnswer}</LearningText>
                      </p>
                      <h4>Odróżnij od…</h4>
                      <p>
                        <LearningText>{concept.distinguish}</LearningText>
                      </p>
                      <div className="rating-buttons">
                        {(["again", "hard", "good", "easy"] as const).map(
                          (rating, index) => (
                            <button
                              key={rating}
                              className="secondary"
                              disabled={pending || completed}
                              onClick={() => rate(rating)}
                            >
                              {
                                [
                                  "Again · Jeszcze raz",
                                  "Hard · Trudne",
                                  "Good · Dobrze",
                                  "Easy · Łatwe",
                                ][index]
                              }
                            </button>
                          ),
                        )}
                      </div>
                      <p className="footnote">
                        Samoocena ustala termin powtórki. Nie jest dowodem
                        opanowania umiejętności.
                      </p>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </section>
      ) : (
        <>
          <section className="review-queue">
            <div className="section-heading spread">
              <h2>Na teraz</h2>
              <span className="count">{due.length}</span>
            </div>
            {due.length ? (
              due.map((item) => {
                const c = concepts.find((c) => c.id === item.conceptId);
                return c ? (
                  <button
                    key={item.conceptId}
                    className="review-row"
                    onClick={() => start(c.id, "due")}
                  >
                    <RotateCcw size={19} />
                    <span>
                      <strong>{c.title}</strong>
                      <small>{item.reason}</small>
                    </span>
                    <ArrowRight size={18} />
                  </button>
                ) : null;
              })
            ) : (
              <div className="empty-review">
                <span className="round-icon">
                  <Check size={22} />
                </span>
                <h3>Na dziś nic nie czeka.</h3>
                <p>
                  Nowe pojęcia wrócą po przerwie. Nie musisz powtarzać
                  wszystkiego od razu.
                </p>
              </div>
            )}
          </section>
          {upcoming.length > 0 && (
            <section className="upcoming">
              <h2>Po przerwie</h2>
              {upcoming.map((item) => (
                <div key={item.conceptId}>
                  <span>
                    {concepts.find((c) => c.id === item.conceptId)?.title}
                  </span>
                  <time>
                    {new Date(item.dueAt).toLocaleString("pl-PL", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </time>
                </div>
              ))}
            </section>
          )}
          <section className="practice-now">
            <Eyebrow>MOŻESZ TEŻ POĆWICZYĆ TERAZ</Eyebrow>
            <div className="concept-grid">
              {concepts.map((c) => (
                <button
                  className="review-concept"
                  key={c.id}
                  onClick={() => start(c.id, "practice")}
                >
                  {c.title}
                  <ArrowUpRightIcon />
                </button>
              ))}
            </div>
            <p className="footnote">
              Natychmiastowa powtórka pomaga ćwiczyć. Dopiero poprawna odpowiedź
              po czasie może potwierdzić odtworzenie. Dla ownership potrzebne są
              dwa wcześniejsze zadania kodowe i ponad 24 godziny bez kontaktu z
              pojęciem. Liczba rodzin primary zależy od opisu danego kontraktu;
              sama powtórka nie tworzy nowej rodziny.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
function ArrowUpRightIcon() {
  return <ArrowRight size={15} style={{ transform: "rotate(-45deg)" }} />;
}
