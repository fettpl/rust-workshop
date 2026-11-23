"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { ArrowRight, Eye, Clock, Check, RotateCcw } from "lucide-react";
import { useClock } from "./use-clock";
import { useLearning } from "./learning-provider";
import { useSuppliedSolutionExposure } from "./use-supplied-solution-exposure";
import { CompilerOutput, compilerConnectionFailure } from "./compiler-output";
import { LearningText } from "./learning-text";
import { concepts, lessons } from "@/content/course";
import { rateReview } from "@/engine/learning";
import {
  recordCourseEvidence,
  evidenceForReview,
  assistanceForReviewSession,
  courseMastery,
  courseReviewQueue,
  courseEvidenceSummary,
  recordCourseLessonExposure,
  resolveReviewExercise,
  reviewExerciseIdForSelection,
  reviewExerciseIdForOrigin,
  reviewPurposeForExercise,
} from "@/content/learning-context";
import {
  reviewSessionFinished,
  reviewSessionRated,
  reviewEventStepId,
  reviewSessionKey,
  startReviewSession,
} from "@/engine/review-session";
import { evaluate } from "@/engine/evaluate";
import { choicesForStep } from "@/engine/choices";
import { stepInteraction } from "@/engine/step-interaction";
import { createStepProgress } from "@/persistence/state";
import type { RunResult, StepProgress } from "@/domain/types";
import type { ReviewSession } from "@/domain/types";
import {
  Eyebrow,
  MasteryBadge,
  OwnershipPolicyNote,
  OwnershipEvidenceCount,
} from "./ui";
import { useLocale } from "./locale-provider";

const CodeEditor = dynamic(() => import("./code-editor"), { ssr: false });

type ReviewRating = Parameters<typeof rateReview>[2];

function RatingButtons({
  disabled,
  onRate,
}: {
  disabled: boolean;
  onRate: (rating: ReviewRating) => void;
}) {
  const { t } = useLocale();
  const ratings = [
    ["again", "Again · Jeszcze raz"],
    ["hard", "Hard · Trudne"],
    ["good", "Good · Dobrze"],
    ["easy", "Easy · Łatwe"],
  ] as const;
  return (
    <div className="rating-buttons">
      {ratings.map(([rating, label]) => (
        <button
          key={rating}
          className="secondary"
          disabled={disabled}
          onClick={() => onRate(rating)}
        >
          {t(label)}
        </button>
      ))}
    </div>
  );
}

function successfulProbeSession(
  state: Parameters<typeof reviewSessionFinished>[0],
  session: ReviewSession,
): boolean {
  const step = resolveReviewExercise(session.conceptId, session.exerciseId);
  if (step.status !== "ready" || step.step.reviewPurpose !== "practice-probe")
    return false;
  const progress = state.steps[reviewSessionKey(session.sessionId)];
  const attempt = progress?.attempts.at(-1);
  return Boolean(
    progress?.completed &&
    attempt?.passed &&
    attempt.code !== undefined &&
    attempt.code === (progress.code ?? step.step.code) &&
    attempt.result?.status === "success",
  );
}

const ownershipConceptIds = new Set(
  lessons
    .filter((lesson) => lesson.moduleId === "ownership")
    .flatMap((lesson) => lesson.conceptIds),
);

export function ReviewView() {
  const { t, locale, courseText } = useLocale();
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
  const { due, upcoming } = courseReviewQueue(state, clock);
  const concept = concepts.find((c) => c.id === selected);
  const ownershipScope = concept ? ownershipConceptIds.has(concept.id) : false;
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
  const reviewPurpose = session
    ? reviewPurposeForExercise(session.conceptId, session.exerciseId)
    : "neutral";
  const isPracticeProbe = reviewPurpose === "practice-probe";
  const rated = Boolean(session && reviewSessionRated(state, session));
  const awaitingProbeRating = Boolean(
    session && !rated && successfulProbeSession(state, session),
  );
  const unavailable = !concept || resolution?.status === "unavailable";
  const evaluator = step?.evaluator;
  const isManifest = evaluator?.kind === "manifest-contract";
  const { executable, editable } = stepInteraction(step);
  const code = progress.code ?? step?.code ?? "";
  const suppliedCodeRef = useSuppliedSolutionExposure<HTMLElement>(
    step,
    "code",
    executable || isManifest ? code : step?.code,
    mode === "challenge" && !unavailable,
  );
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
  const completed = Boolean(progress.completed || rated);

  function start(
    id: string,
    origin: "due" | "practice",
    selection: "short" | "extended" = "short",
  ) {
    if (
      state.reviewSession &&
      (!reviewSessionFinished(state, state.reviewSession) ||
        (successfulProbeSession(state, state.reviewSession) &&
          !reviewSessionRated(state, state.reviewSession)))
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
    const exerciseId = reviewExerciseIdForOrigin(
      state,
      id,
      origin,
      now,
      selection,
    );
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
    if (session && (completed || unavailable)) {
      update((current) => {
        if (current.reviewSession?.sessionId !== session.sessionId)
          return current;
        const next = { ...current };
        delete next.reviewSession;
        return next;
      });
    }
    setSelected(null);
    setExecutionMessage("");
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
            stepId: step ? `${step.id}:${session.sessionId}` : key,
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
  function check(rating?: ReviewRating) {
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
    const rubric = evaluator.kind === "rubric";
    if (rubric !== (rating !== undefined)) return;
    const outcome = evaluate(evaluator, { ...progress, code });
    if (rubric && !outcome.passed) return;
    const probe = step.reviewPurpose === "practice-probe";
    // eslint-disable-next-line react-hooks/purity -- Event handler: record actual action time, not the render clock.
    const now = Date.now();
    update((s) => {
      if (s.reviewSession?.sessionId !== session.sessionId) return s;
      const current = s.steps[key] ?? createStepProgress();
      if (current.completed || reviewSessionRated(s, session)) return s;
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
        kind: rubric ? "self-rating" : probe ? "exposure" : "recall",
        passed: outcome.passed,
        ...assistanceForReviewSession(s, session),
        at: now,
        delayed: !rubric && !probe && session.wasDue,
        gate: false,
        evaluator: evaluator.kind,
      });
      if (rating) next = rateReview(next, concept.id, rating, now);
      if (outcome.passed && !probe) delete next.reviewSession;
      return next;
    });
    if (outcome.passed && !probe) setSelected(null);
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
    const canRecord = (currentState: typeof state) => {
      const saved = currentState.steps[key];
      return (
        currentState.reviewSession?.sessionId === session.sessionId &&
        !saved?.completed &&
        !reviewSessionRated(currentState, session) &&
        (saved?.code ?? step.code ?? "") === code
      );
    };
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
      output = compilerConnectionFailure;
    }
    setPending(false);
    if (generation() !== requestGeneration) return;

    if (["infrastructure-error", "timeout"].includes(output.status)) {
      setExecutionMessage(
        "Problem z wykonaniem — ta próba nie wpływa na mastery ani termin powtórki.",
      );
      update((s) => {
        if (!canRecord(s)) return s;
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
    const probe = step.reviewPurpose === "practice-probe";
    update((s) => {
      if (!canRecord(s)) return s;
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
        kind: probe ? "exposure" : "recall",
        passed: outcome.passed,
        ...assistanceForReviewSession(s, session),
        at: Date.now(),
        delayed: probe ? false : session.wasDue,
        gate: false,
        evaluator: evaluator.kind,
      });
    });
    setExecutionMessage(
      outcome.passed
        ? isPracticeProbe
          ? "Kod działa. Oceń tę krótką powtórkę albo wróć do kolejki bez zmiany terminu."
          : "Kod działa. Zostaw wynik widoczny i zakończ powtórkę, gdy jesteś gotowy."
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
  function rate(rating: ReviewRating) {
    const canRateProbe = isPracticeProbe && awaitingProbeRating;
    const canRateCard = !isPracticeProbe && !completed;
    if (
      !concept ||
      !step ||
      unavailable ||
      pending ||
      (!canRateProbe && !canRateCard)
    )
      return;
    let applied = false;
    update((s) => {
      const currentSession = s.reviewSession;
      if (
        !currentSession ||
        currentSession.sessionId !== session?.sessionId ||
        reviewSessionRated(s, currentSession)
      )
        return s;
      if (isPracticeProbe) {
        if (
          !currentSession ||
          currentSession.sessionId !== session?.sessionId ||
          currentSession.conceptId !== concept.id ||
          currentSession.exerciseId !== session?.exerciseId ||
          !successfulProbeSession(s, currentSession)
        )
          return s;
      }
      applied = true;
      const next = rateReview(s, concept.id, rating, Date.now());
      delete next.reviewSession;
      return next;
    });
    if (applied) setSelected(null);
  }

  const durationLabel =
    reviewPurpose === "practice-probe"
      ? t("Krótka decyzja — cel 1–3 min")
      : reviewPurpose === "extended"
        ? t("Dłuższe odtworzenie kontraktu")
        : t("Czas zależy od zadania");

  return (
    <div className="review-page">
      <div className="section-heading spread">
        <div>
          <Eyebrow>{t("POWTÓRKI / AKTYWNE ODTWARZANIE")}</Eyebrow>
          <h1>{t("Co zostało w pamięci?")}</h1>
        </div>
        <span className="session-chip">
          <Clock size={15} />
          {durationLabel}
        </span>
      </div>
      <p className="lede">
        {t(
          "Najpierw przywołaj zasadę. Potem sprawdź ją na małym, nowym przykładzie.",
        )}
      </p>
      {session ? (
        <section className="review-session" ref={suppliedCodeRef}>
          {!unavailable && (
            <button
              className="text-button"
              disabled={pending}
              onClick={returnToQueue}
            >
              {t("← Do kolejki")}
            </button>
          )}
          {unavailable ? (
            <div className="empty-review" role="status">
              <h2>{t("Ta powtórka nie jest dostępna w tej wersji.")}</h2>
              <p>
                {t(
                  "Zachowaliśmy Twój zapis, ale ta przypięta wersja zadania nie jest już dostępna. Możesz wrócić do kolejki i wybrać bieżące ćwiczenie.",
                )}
              </p>
              <button className="primary" onClick={returnToQueue}>
                {t("Do kolejki")}
              </button>
            </div>
          ) : (
            <>
              <div className="section-heading spread">
                <h2>{courseText(concept.title)}</h2>
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
                      ? t(
                          "Odtworzenie po czasie wymaga dwóch wcześniejszych samodzielnych zadań kodowych i ponad 24 godzin bez kontaktu z pojęciem. Ta powtórka nie dodaje kolejnego zadania do tego licznika.",
                        )
                      : t(
                          "Dla tego kontraktu liczą się tylko opisane rodziny primary. Gate i blank mogą dzielić rodzinę; pomoc lub wyczerpanie rodziny nie tworzy nowego wariantu. Ta powtórka pozostaje osobnym recall i nie dodaje rodziny primary.",
                        )}
                  </p>
                </>
              )}
              {rated && (
                <p role="status">
                  {t(
                    "Ta powtórka ma już zapisaną ocenę. Wróć do kolejki, aby rozpocząć nowe ćwiczenie.",
                  )}
                </p>
              )}
              <div className="segmented">
                <button
                  className={mode === "challenge" ? "selected" : ""}
                  disabled={pending || completed}
                  onClick={() => chooseMode("challenge")}
                >
                  {t("Mały eksperyment")}
                </button>
                <button
                  className={mode === "card" ? "selected" : ""}
                  disabled={pending || completed}
                  onClick={() => chooseMode("card")}
                >
                  {t("Karta przypomnienia")}
                </button>
              </div>
              {mode === "challenge" && step ? (
                <>
                  <h3>{courseText(step.title)}</h3>
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
                          readOnly={!editable || pending || completed}
                          fontSize={state.settings.editorFontSize}
                          theme={state.settings.theme}
                          accessible={state.settings.accessibleEditor}
                        />
                      </div>
                      <div className="button-row">
                        <button
                          className="primary"
                          disabled={pending || completed || !code.trim()}
                          onClick={
                            isManifest ? () => check() : () => void run()
                          }
                        >
                          {isManifest
                            ? t("Sprawdź manifest")
                            : pending
                              ? t("Kompilowanie…")
                              : evaluator?.kind === "tests"
                                ? t("Uruchom testy")
                                : t("Uruchom kod")}
                          <ArrowRight size={16} />
                        </button>
                        {codePassed && !isPracticeProbe && (
                          <button
                            className="secondary"
                            onClick={finishChallenge}
                          >
                            {t("Zakończ powtórkę")}
                            <Check size={16} />
                          </button>
                        )}
                      </div>
                      {executionMessage && (
                        <p className="feedback" role="status">
                          {t(executionMessage)}
                        </p>
                      )}
                      {lastAttempt && (
                        <p
                          className={`feedback ${lastAttempt.passed ? "passed" : ""}`}
                          role="status"
                        >
                          {t(courseText(lastAttempt.feedback))}
                        </p>
                      )}
                      {isManifest ? (
                        <p className="footnote">
                          {step.editorFile ?? "Cargo.toml"}{" "}
                          {t("· TOML 1.0 · sprawdzenie deklaracji")}
                        </p>
                      ) : (
                        <CompilerOutput result={result} pending={pending} />
                      )}
                      {lastRun?.code !== undefined && lastRun.code !== code && (
                        <p className="footnote" role="status">
                          {t("Wynik pochodzi z poprzedniej wersji kodu.")}{" "}
                          {completed
                            ? t("Nową próbę możesz rozpocząć z kolejki.")
                            : t("Uruchom ponownie po zmianach.")}
                        </p>
                      )}
                      {lastAttempt && step.explanation && (
                        <p className="footnote" role="note">
                          <LearningText>{step.explanation}</LearningText>
                        </p>
                      )}
                      {awaitingProbeRating && (
                        <div className="retrieval-reveal">
                          <h4>{t("Oceń tę powtórkę")}</h4>
                          <RatingButtons disabled={pending} onRate={rate} />
                          <p className="footnote">
                            {t(
                              "Bez oceny termin poprzedniej powtórki pozostaje bez zmian.",
                            )}
                          </p>
                        </div>
                      )}
                    </>
                  ) : step.choices ? (
                    <fieldset>
                      <legend>{t("Twoja decyzja")}</legend>
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
                            {courseText(choice.label)}
                          </label>
                        ),
                      )}
                    </fieldset>
                  ) : (
                    <label>
                      {t("Odpowiedz z pamięci")}
                      <textarea
                        value={progress.answer}
                        disabled={pending || completed}
                        onChange={(e) => patch({ answer: e.target.value })}
                      />
                    </label>
                  )}
                  {!executable && !isManifest && (
                    <>
                      {evaluator?.kind === "rubric" ? (
                        <>
                          <details className="rubric">
                            <summary>{t("Porównaj z kryteriami")}</summary>
                            <p>
                              {t(
                                "Zaznacz punkty, które wyjaśniasz w swojej odpowiedzi. Możesz ją jeszcze uzupełnić.",
                              )}
                            </p>
                            {evaluator.criteria.map((criterion) => (
                              <label
                                className="check-label"
                                key={courseText(criterion)}
                              >
                                <input
                                  type="checkbox"
                                  checked={progress.rubricChecks.includes(
                                    criterion,
                                  )}
                                  disabled={pending || completed}
                                  onChange={(event) =>
                                    patch({
                                      rubricChecks: event.target.checked
                                        ? [...progress.rubricChecks, criterion]
                                        : progress.rubricChecks.filter(
                                            (item) => item !== criterion,
                                          ),
                                    })
                                  }
                                />
                                {courseText(criterion)}
                              </label>
                            ))}
                          </details>
                          <p>
                            {t(
                              "Oceń, jak łatwo udało Ci się to wyjaśnić. Ta samoocena ustala termin kolejnej powtórki.",
                            )}
                          </p>
                          <RatingButtons
                            disabled={
                              pending ||
                              completed ||
                              !evaluate(evaluator, progress).passed
                            }
                            onRate={check}
                          />
                        </>
                      ) : (
                        <button
                          className="primary"
                          disabled={
                            pending || completed || !progress.answer.trim()
                          }
                          onClick={() => check()}
                        >
                          {t("Sprawdź")}
                          <Check size={17} />
                        </button>
                      )}
                      {progress.attempts.at(-1) && (
                        <p className="feedback" role="status">
                          {t(courseText(progress.attempts.at(-1)?.feedback))}
                        </p>
                      )}
                      {lastAttempt && step.explanation && (
                        <p className="footnote" role="note">
                          <LearningText>{step.explanation}</LearningText>
                        </p>
                      )}
                      <button
                        className="text-button"
                        disabled={pending || completed}
                        onClick={revealReminder}
                      >
                        {t("Potrzebuję przypomnienia")}
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
                    {t("Przypomnij własnymi słowami")}
                    <textarea
                      value={progress.answer}
                      disabled={pending || completed}
                      onChange={(e) => patch({ answer: e.target.value })}
                      placeholder={t("Zanim odsłonisz odpowiedź…")}
                    />
                  </label>
                  {!progress.revealed ? (
                    <button
                      className="primary"
                      disabled={pending || completed || !progress.answer.trim()}
                      onClick={() => patch({ revealed: true })}
                    >
                      <Eye size={16} />
                      {t("Odsłoń odpowiedź")}
                    </button>
                  ) : (
                    <div className="retrieval-reveal">
                      <p>
                        <LearningText>{concept.reviewAnswer}</LearningText>
                      </p>
                      <h4>{t("Odróżnij od…")}</h4>
                      <p>
                        <LearningText>{concept.distinguish}</LearningText>
                      </p>
                      {isPracticeProbe ? (
                        <p className="footnote" role="status">
                          {t(
                            "Wróć do Małego eksperymentu, aby uruchomić kod i ocenić tę powtórkę.",
                          )}
                        </p>
                      ) : (
                        <>
                          <RatingButtons
                            disabled={pending || completed}
                            onRate={rate}
                          />
                          <p className="footnote">
                            {t(
                              "Samoocena ustala termin powtórki. Nie jest dowodem opanowania umiejętności.",
                            )}
                          </p>
                        </>
                      )}
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
              <h2>{t("Na teraz")}</h2>
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
                      <strong>{courseText(c.title)}</strong>
                      <small>{t(courseText(item.reason))}</small>
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
                <h3>{t("Na dziś nic nie czeka.")}</h3>
                <p>
                  {t(
                    "Nowe pojęcia wrócą po przerwie. Nie musisz powtarzać wszystkiego od razu.",
                  )}
                </p>
              </div>
            )}
          </section>
          {upcoming.length > 0 && (
            <section className="upcoming">
              <h2>{t("Po przerwie")}</h2>
              {upcoming.map((item) => (
                <div key={item.conceptId}>
                  <span>
                    {courseText(
                      concepts.find((c) => c.id === item.conceptId)?.title,
                    )}
                  </span>
                  <time>
                    {new Date(item.dueAt).toLocaleString(locale, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </time>
                </div>
              ))}
            </section>
          )}
          <section className="practice-now">
            <Eyebrow>{t("MOŻESZ TEŻ POĆWICZYĆ TERAZ")}</Eyebrow>
            <div className="concept-grid">
              {concepts.map((c) => {
                const hasShort =
                  reviewExerciseIdForSelection(c.id, "short") !== undefined;
                return hasShort ? (
                  <div className="review-choice" key={c.id}>
                    <button
                      className="review-concept"
                      onClick={() => start(c.id, "practice", "short")}
                    >
                      {courseText(c.title)} {t("· krótka decyzja")}
                      <ArrowUpRightIcon />
                    </button>
                    <button
                      className="text-button"
                      onClick={() => start(c.id, "practice", "extended")}
                    >
                      {t("Dłuższe odtworzenie kontraktu")}
                    </button>
                  </div>
                ) : (
                  <button
                    className="review-concept"
                    key={c.id}
                    onClick={() => start(c.id, "practice")}
                  >
                    {courseText(c.title)}
                    <ArrowUpRightIcon />
                  </button>
                );
              })}
            </div>
            <p className="footnote">
              {t(
                "Natychmiastowa powtórka pomaga ćwiczyć. Dopiero poprawna odpowiedź po czasie może potwierdzić odtworzenie. Dla ownership potrzebne są dwa wcześniejsze zadania kodowe i ponad 24 godziny bez kontaktu z pojęciem. Liczba rodzin primary zależy od opisu danego kontraktu; sama powtórka nie tworzy nowej rodziny.",
              )}
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
