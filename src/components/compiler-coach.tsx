import { LearningText } from "./learning-text";
import { Lightbulb, Eye, ArrowRight } from "lucide-react";
import type { LessonStep, StepProgress } from "@/domain/types";
export function CompilerCoach({
  step,
  progress,
  onHints,
  onReveal,
}: {
  step: LessonStep;
  progress: StepProgress;
  onHints: (n: number) => void;
  onReveal: () => void;
}) {
  if (!step.hints && !step.solution) return null;
  return (
    <section className="compiler-coach">
      <h2>
        <Lightbulb size={18} />
        Compiler Coach
      </h2>
      <p>
        Zacznij od swojej próby. Wskazówki pomogą Ci zinterpretować wynik i
        znaleźć regułę.
      </p>
      {progress.hints === 0 ? (
        <button className="text-button" onClick={() => onHints(1)}>
          Pomóż mi to zrozumieć
          <ArrowRight size={15} />
        </button>
      ) : (
        <>
          <div className="hint">
            <span>WSKAZÓWKA 1 · OBSZAR</span>
            <p>
              <LearningText>
                {step.hints?.[0] ??
                  "Porównaj wymagania z komunikatem kompilatora."}
              </LearningText>
            </p>
          </div>
          {progress.hints >= 2 ? (
            <div className="hint">
              <span>WSKAZÓWKA 2 · REGUŁA</span>
              <p>
                <LearningText>
                  {step.hints?.[1] ??
                    "Przeanalizuj zakresy i przekazanie wartości."}
                </LearningText>
              </p>
            </div>
          ) : (
            <button className="text-button" onClick={() => onHints(2)}>
              Pokaż drugą wskazówkę
              <ArrowRight size={15} />
            </button>
          )}
          {progress.hints >= 2 && step.solution && !progress.revealed && (
            <details className="solution-warning">
              <summary>Potrzebuję pełnego rozwiązania</summary>
              <p>
                Po obejrzeniu poprawki wrócisz do niezależnego zadania. Ten krok
                będzie słabszym dowodem samodzielności.
              </p>
              <button className="secondary" onClick={onReveal}>
                <Eye size={15} />
                Pokaż rozwiązanie
              </button>
            </details>
          )}
        </>
      )}
      {progress.revealed && step.solution && (
        <div className="revealed-solution">
          <span className="micro">ROZWIĄZANIE DO PORÓWNANIA</span>
          <pre>{step.solution}</pre>
          <p>
            Porównaj je ze swoją próbą. Nie jest automatycznie wstawiane do
            edytora.
          </p>
        </div>
      )}
    </section>
  );
}
