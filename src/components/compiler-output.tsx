import type { RunResult } from "@/domain/types";
import { Terminal, CheckCircle2, TriangleAlert } from "lucide-react";
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
  return (
    <section
      id="workspace-output"
      className="compiler-output"
      aria-label="Wynik kompilatora"
    >
      <header>
        <span>
          <Terminal size={15} />
          OUTPUT
        </span>
        {result && <span>{result.durationMs} ms</span>}
      </header>
      <div className="output-content" aria-live="polite">
        {pending ? (
          <p className="output-empty">Kompilowanie w izolowanym środowisku…</p>
        ) : result ? (
          <>
            <p className={`run-status ${result.status}`}>
              {result.status === "success" ? (
                <CheckCircle2 size={17} />
              ) : (
                <TriangleAlert size={17} />
              )}{" "}
              {statusLabels[result.status]}
            </p>
            {result.stdout && (
              <>
                <span className="output-label">stdout</span>
                <pre>{result.stdout}</pre>
              </>
            )}
            {result.stderr && (
              <>
                <span className="output-label">
                  Oryginalny komunikat rustc / stderr
                </span>
                <pre>{result.stderr}</pre>
              </>
            )}
            {!result.stdout && !result.stderr && (
              <p className="muted">
                Program zakończył się bez tekstu na wyjściu.
              </p>
            )}
            {result.tests && (
              <p className="test-count">
                Testy: {result.tests.passed} poprawnych · {result.tests.failed}{" "}
                nieudanych
              </p>
            )}
          </>
        ) : (
          <div className="output-empty">
            <Terminal size={25} />
            <p>Najpierw pomyśl. Potem uruchom.</p>
            <small>Tutaj zobaczysz pełny wynik kompilatora.</small>
          </div>
        )}
      </div>
    </section>
  );
}
