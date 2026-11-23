import type { RunResult } from "@/domain/types";
import { Terminal, CheckCircle2, TriangleAlert } from "lucide-react";
import { useLocale } from "./locale-provider";
export const compilerConnectionFailure = {
  status: "infrastructure-error",
  stdout: "",
  stderr:
    "Nie udało się połączyć z kompilatorem. Kod pozostaje zapisany. Spróbuj ponownie po odzyskaniu połączenia.",
  diagnostics: [],
  durationMs: 0,
} satisfies RunResult;

const statusLabels = {
  success: "Wykonano poprawnie",
  "compile-error": "Błąd kompilacji",
  "runtime-error": "Błąd podczas wykonania",
  "test-failure": "Testy ujawniły problem",
  timeout: "Przekroczono limit czasu",
  "infrastructure-error": "Kompilator niedostępny",
};
export function CompilerOutput({
  result,
  pending,
}: {
  result?: RunResult;
  pending: boolean;
}) {
  const { t } = useLocale();
  // Older saves use this same synthetic result for failed browser requests.
  const connectionFailed =
    result?.status === compilerConnectionFailure.status &&
    result.durationMs === compilerConnectionFailure.durationMs &&
    result.stderr === compilerConnectionFailure.stderr &&
    !result.stdout &&
    result.diagnostics.length === 0;
  return (
    <section
      id="workspace-output"
      className="compiler-output"
      aria-label={t("Wynik kompilatora")}
    >
      <header>
        <span>
          <Terminal size={15} />
          {t("WYJŚCIE")}
        </span>
        {result && <span>{result.durationMs} ms</span>}
      </header>
      <div className="output-content" aria-live="polite">
        {pending ? (
          <p className="output-empty">
            {t("Kompilowanie w izolowanym środowisku…")}
          </p>
        ) : result ? (
          <>
            <p className={`run-status ${result.status}`}>
              {result.status === "success" ? (
                <CheckCircle2 size={17} />
              ) : (
                <TriangleAlert size={17} />
              )}{" "}
              {t(statusLabels[result.status])}
            </p>
            {result.stdout && (
              <>
                <span className="output-label">stdout</span>
                <pre>{result.stdout}</pre>
              </>
            )}
            {connectionFailed ? (
              <p>{t(compilerConnectionFailure.stderr)}</p>
            ) : result.stderr ? (
              <>
                <span className="output-label">
                  {t("Oryginalny komunikat rustc / stderr")}
                </span>
                <pre>{result.stderr}</pre>
              </>
            ) : null}
            {!result.stdout && !result.stderr && (
              <p className="muted">
                {t("Program zakończył się bez tekstu na wyjściu.")}
              </p>
            )}
            {result.tests && (
              <p className="test-count">
                {t("Testy: ")}
                {result.tests.passed} {t("poprawnych · ")}
                {result.tests.failed} {t("nieudanych")}
              </p>
            )}
          </>
        ) : (
          <div className="output-empty">
            <Terminal size={25} />
            <p>{t("Najpierw pomyśl. Potem uruchom.")}</p>
            <small>{t("Tutaj zobaczysz pełny wynik kompilatora.")}</small>
          </div>
        )}
      </div>
    </section>
  );
}
