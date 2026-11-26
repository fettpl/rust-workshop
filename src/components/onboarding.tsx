"use client";
import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Terminal,
  FlaskConical,
  Shuffle,
} from "lucide-react";
import { useLearning } from "./learning-provider";
import { LearningText } from "./learning-text";
import { Eyebrow } from "./ui";
import { getLocalizedCourse } from "@/i18n/course";
import type { RunResult } from "@/domain/types";
import { LanguagePicker, useLocale } from "./locale-provider";
const CodeEditor = dynamic(() => import("./code-editor"), { ssr: false });
export function Onboarding({ onStart }: { onStart: () => void }) {
  const { t } = useLocale();
  const { state, update } = useLearning();
  return (
    <main id="main-content" className="onboarding">
      <header className="onboarding-header">
        <Link className="brand" href="/">
          <span className="brand-mark">r.</span>rust
          <span className="brand-light">workshop</span>
        </Link>
        <span className="micro">{t("TWÓJ LOKALNY WARSZTAT")}</span>
        <LanguagePicker />
      </header>
      <div className="welcome-grid">
        <section>
          <Eyebrow>{t("RUST · OD INTUICJI DO SAMODZIELNOŚCI")}</Eyebrow>
          <h1>
            {t("Zrozum kod.")}
            <br />
            {t("Zanim go")}
            <br />
            <em>{t("uruchomisz.")}</em>
          </h1>
          <p className="lede">
            {t(
              "Znasz podstawy programowania: zmienne, warunki, pętle i funkcje. Rust poznasz tutaj od zera, krok po kroku, przez małe eksperymenty.",
            )}
          </p>
          <div className="welcome-principles">
            <span>
              <FlaskConical size={19} />
              {t("Małe eksperymenty")}
            </span>
            <span>
              <Terminal size={19} />
              {t("Prawdziwy kompilator")}
            </span>
            <span>
              <Shuffle size={19} />
              {t("Nowe problemy")}
            </span>
          </div>
        </section>
        <section className="welcome-panel">
          <h2>{t("Urządź swój warsztat")}</h2>
          <p>
            {t(
              "Bez konta. Kod i postęp zostają na tym urządzeniu. Wykonanie kodu wysyła go do Rust Playground.",
            )}
          </p>
          <label>
            {t("Jak się do Ciebie zwracać?")}{" "}
            <span className="muted">{t("(opcjonalnie)")}</span>
            <input
              maxLength={40}
              placeholder={t("Twoje imię")}
              value={state.onboarding.name}
              onChange={(e) =>
                update((s) => ({
                  ...s,
                  onboarding: { ...s.onboarding, name: e.target.value },
                }))
              }
            />
          </label>
          <button
            className="primary wide"
            onClick={() => {
              onStart();
              update((s) => ({
                ...s,
                onboarding: { ...s.onboarding, completed: true },
              }));
            }}
          >
            {t("Sprawdź punkt startowy ")}
            <ArrowRight size={18} />
          </button>
          <p className="micro">
            {t(
              "Sprawdzisz podstawy przed pierwszą lekcją. Wszystkie lekcje są dostępne.",
            )}
          </p>
        </section>
      </div>
      <footer className="welcome-footer">
        <span>{t("01 PRZEWIDŹ")}</span>
        <span>{t("02 URUCHOM")}</span>
        <span>{t("03 ZAOBSERWUJ")}</span>
        <span>{t("04 WYJAŚNIJ")}</span>
        <span>
          {t("05 ZASTOSUJ")} <ArrowUpRight size={16} />
        </span>
      </footer>
    </main>
  );
}
export function Diagnostic({
  takeStartFocus,
  requestCompletionFocus,
}: {
  takeStartFocus: () => boolean;
  requestCompletionFocus: () => void;
}) {
  const { t, locale } = useLocale();
  const { state, update } = useLearning();
  const [index, setIndex] = useState(() =>
    Math.min(
      3,
      Object.keys(state.diagnostic.answers).filter((k) => k.endsWith(":done"))
        .length,
    ),
  );
  const [feedback, setFeedback] = useState<{
    message?: string;
    stderr?: string;
    explanation?: boolean;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusAfterNextRef = useRef(false);
  const task = getLocalizedCourse(locale).diagnosticTasks[index];
  const answer =
    state.diagnostic.answers[task.id] ?? (task.tests ? task.code : "");
  useLayoutEffect(() => {
    const startFocus = takeStartFocus();
    if (!startFocus && !focusAfterNextRef.current) return;
    headingRef.current?.focus({ preventScroll: true });
    focusAfterNextRef.current = false;
  }, [index, takeStartFocus]);
  function setAnswer(value: string) {
    update((s) => ({
      ...s,
      diagnostic: {
        ...s.diagnostic,
        answers: { ...s.diagnostic.answers, [task.id]: value },
      },
    }));
  }
  function finish() {
    requestCompletionFocus();
    const score = Object.entries(state.diagnostic.answers).filter(
      ([k, v]) => k.endsWith(":done") && v === "true",
    ).length;
    update((s) => ({
      ...s,
      diagnostic: {
        ...s.diagnostic,
        completed: true,
        score,
        recommendation:
          score >= 3
            ? "Podstawy programowania są dobrym punktem wyjścia. Poznaj składnię Rust w module startowym; znane konstrukcje możesz przejść szybciej."
            : "Zacznij od pierwszego programu. Pracuj z krótkimi przykładami i sprawdzaj każdą zmianę. Wszystkie lekcje są dostępne.",
      },
    }));
  }
  async function check() {
    let passed = false;
    setBusy(true);
    try {
      if (task.tests) {
        const response = await fetch("/api/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: answer,
            mode: "test",
            tests: task.tests,
          }),
        });
        const result: RunResult = await response.json();
        if (["infrastructure-error", "timeout"].includes(result.status)) {
          setFeedback({
            message:
              "Kompilator jest teraz niedostępny. Możesz spróbować ponownie albo przejść do nauki.",
          });
          return;
        }
        passed = result.status === "success";
        setFeedback(
          passed
            ? { message: "Testy przeszły. ", explanation: true }
            : { stderr: result.stderr + "\n", explanation: true },
        );
      } else {
        passed =
          answer.trim().replace(/\s/g, "").toLowerCase() ===
          task.answer?.replace(/\s/g, "");
        setFeedback({
          message: passed ? "Zgadza się. " : "Sprawdźmy to razem. ",
          explanation: true,
        });
      }
      update((s) => ({
        ...s,
        diagnostic: {
          ...s.diagnostic,
          answers: {
            ...s.diagnostic.answers,
            [task.id + ":done"]: String(passed),
          },
        },
      }));
    } catch {
      setFeedback({
        message:
          "Nie udało się połączyć z kompilatorem. Nie wpływa to na Twój wynik.",
      });
    } finally {
      setBusy(false);
    }
  }
  const checked = state.diagnostic.answers[task.id + ":done"] !== undefined;
  return (
    <main id="main-content" className="diagnostic-page">
      <header className="onboarding-header">
        <Link className="brand" href="/">
          <span className="brand-mark">r.</span>rust workshop
        </Link>
        <LanguagePicker />
      </header>
      <section className="diagnostic-layout">
        <div>
          <Eyebrow>
            {t("PUNKT STARTOWY · ")}
            {index + 1} / 4
          </Eyebrow>
          <h1 ref={headingRef} tabIndex={-1}>
            {task.title}
          </h1>
          <p className="lede">
            <LearningText>{task.prompt}</LearningText>
          </p>
          <p className="muted">
            {t(
              "To wskazówka dla Twojego tempa. Każda lekcja pozostaje dostępna.",
            )}
          </p>
          <button className="text-button" onClick={finish}>
            {t("Przejdź do nauki ")}
            <ArrowRight size={16} />
          </button>
        </div>
        <div className="diagnostic-task">
          {task.tests ? (
            <div className="diagnostic-editor">
              <CodeEditor
                code={answer}
                onChange={setAnswer}
                theme={state.settings.theme}
                accessible={state.settings.accessibleEditor}
                readOnly={busy}
              />
            </div>
          ) : (
            <pre className="code-sample">{task.code}</pre>
          )}
          {!task.tests && (
            <label>
              {t("Twoja odpowiedź")}
              <input
                autoComplete="off"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void check();
                }}
              />
            </label>
          )}
          <div role="status" className={feedback ? "feedback" : ""}>
            {feedback?.message && t(feedback.message)}
            {feedback?.stderr}
            {feedback?.explanation && task.feedback}
          </div>
          <div className="button-row">
            <button
              className="primary"
              disabled={busy || !answer.trim()}
              onClick={() => void check()}
            >
              {busy
                ? t("Sprawdzanie…")
                : task.tests
                  ? t("Uruchom testy")
                  : t("Sprawdź")}
              <Check size={16} />
            </button>
            {checked && (
              <button
                className="secondary"
                onClick={() => {
                  if (index === 3) finish();
                  else {
                    focusAfterNextRef.current = true;
                    setIndex(index + 1);
                    setFeedback(null);
                  }
                }}
              >
                {index === 3 ? t("Otwórz warsztat") : t("Dalej")}
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
