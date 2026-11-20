import type {
  Evaluator,
  EvaluationInput,
  EvaluationResult,
  RunResult,
} from "@/domain/types";
import { checkManifestContract } from "./manifest-contract";

const output = (value: string): string =>
  value
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .trim();

function missing(kind: Evaluator["kind"]): EvaluationResult {
  return {
    passed: false,
    evaluator: kind,
    feedback: "Podaj odpowiedź albo uruchom ćwiczenie, aby je zweryfikować.",
  };
}

function result(input: EvaluationInput): RunResult | undefined {
  return input.result;
}

/** Mask comments and literals before applying the authored syntax guards.
 * These guards recognize token sequences, not Rust semantics; runner results
 * remain the evidence for compilation and behavior.
 */
function guardCode(source: string): string {
  let out = "";
  let i = 0;
  while (i < source.length) {
    if (source.startsWith("//", i)) {
      const end = source.indexOf("\n", i + 2);
      i = end === -1 ? source.length : end;
      out += " ";
    } else if (source.startsWith("/*", i)) {
      let depth = 1;
      i += 2;
      while (i < source.length && depth > 0) {
        if (source.startsWith("/*", i)) {
          depth += 1;
          i += 2;
        } else if (source.startsWith("*/", i)) {
          depth -= 1;
          i += 2;
        } else i += 1;
      }
      out += " ";
    } else {
      const raw = /^(?:br|cr|r)(#*)"/.exec(source.slice(i));
      const character =
        source[i] === "'"
          ? /^'(?:\\(?:u\{[0-9a-fA-F_]+\}|x[0-9a-fA-F]{2}|[^\r\n])|[^'\\\r\n])'/u.exec(
              source.slice(i),
            )
          : null;
      if (raw) {
        const end = source.indexOf(`"${raw[1]}`, i + raw[0].length);
        i = end === -1 ? source.length : end + raw[1].length + 1;
        out += " ";
      } else if (source[i] === '"') {
        i += 1;
        while (i < source.length) {
          if (source[i] === "\\") i += 2;
          else if (source[i++] === '"') break;
        }
        out += " ";
      } else if (character) {
        i += character[0].length;
        out += " ";
      } else out += source[i++];
    }
  }
  return out;
}

const rustKeywords = new Set(
  "as async await break const continue crate dyn else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while abstract become box do final gen macro override priv typeof unsized virtual yield try".split(
    " ",
  ),
);

function tokenSequence(source: string): string {
  const tokens =
    source.match(
      /(?:r#)?[\p{ID_Start}_][\p{ID_Continue}]*|[0-9][0-9a-zA-Z_]*|[^\s]/gu,
    ) ?? [];
  const normalized = tokens.map((token) =>
    token.startsWith("r#") && !rustKeywords.has(token.slice(2))
      ? token.slice(2)
      : token,
  );
  return normalized.length ? `\0${normalized.join("\0")}\0` : "";
}

function parsedOrdering(answer: string | undefined): string[] | undefined {
  if (!answer) return undefined;
  const trimmed = answer.trim();
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (
      Array.isArray(parsed) &&
      parsed.every((item) => typeof item === "string")
    )
      return parsed;
  } catch {
    // The compact text form below is useful for keyboard input.
  }
  const items = trimmed.split(/\s*(?:,|->|\n)\s*/).filter(Boolean);
  return items.length ? items : undefined;
}

function normalizedGuardSource(source: string): string {
  return tokenSequence(guardCode(source));
}

function missingRequiredPattern(
  source: string,
  patterns: string[] | undefined,
): string | undefined {
  return patterns?.find((pattern) => {
    const normalized = tokenSequence(pattern);
    return normalized.length === 0 || !source.includes(normalized);
  });
}

function forbiddenPattern(
  source: string,
  patterns: string[] | undefined,
): string | undefined {
  return patterns?.find((pattern) => {
    const normalized = tokenSequence(pattern);
    return normalized.length > 0 && source.includes(normalized);
  });
}

export function evaluate(
  evaluator: Evaluator,
  input: EvaluationInput,
): EvaluationResult {
  const runResult = result(input);
  switch (evaluator.kind) {
    case "manifest-contract":
      return {
        ...checkManifestContract(input.code ?? "", evaluator.contract),
        evaluator: evaluator.kind,
      };
    case "exact-output":
      if (!runResult) return missing(evaluator.kind);
      {
        const source = input.code ? normalizedGuardSource(input.code) : "";
        const missing = missingRequiredPattern(
          source,
          evaluator.requiredPatterns,
        );
        const forbidden = forbiddenPattern(source, evaluator.forbiddenPatterns);
        const passed =
          runResult.status === "success" &&
          output(runResult.stdout) === output(evaluator.expected) &&
          missing === undefined &&
          forbidden === undefined;
        let feedback = passed
          ? {
              passed: true,
              evaluator: evaluator.kind,
              feedback: "Dane wyjściowe są zgodne.",
            }
          : {
              passed: false,
              evaluator: evaluator.kind,
              feedback: "Dane wyjściowe nie są jeszcze zgodne z oczekiwaniem.",
            };
        if (missing !== undefined)
          feedback = {
            passed: false,
            evaluator: evaluator.kind,
            feedback: `To zadanie wymaga użycia: ${missing}.`,
          };
        else if (forbidden !== undefined)
          feedback = {
            passed: false,
            evaluator: evaluator.kind,
            feedback: `W tym zadaniu pomiń: ${forbidden}.`,
          };
        return feedback;
      }
    case "compilation":
      return runResult?.status === "success"
        ? {
            passed: true,
            evaluator: evaluator.kind,
            feedback: "Kod skompilował się poprawnie.",
          }
        : {
            passed: false,
            evaluator: evaluator.kind,
            feedback: "Kod nie skompilował się poprawnie.",
          };
    case "expected-error": {
      const expectation =
        evaluator.code?.trim() || evaluator.diagnostic?.trim();
      const passed =
        !!expectation &&
        runResult?.status === "compile-error" &&
        runResult.diagnostics.some(
          (diagnostic) =>
            diagnostic.level === "error" &&
            (!evaluator.code || diagnostic.code === evaluator.code) &&
            (!evaluator.diagnostic ||
              diagnostic.message.includes(evaluator.diagnostic)),
        );
      return {
        passed,
        evaluator: evaluator.kind,
        feedback: passed
          ? `Kompilator zgłosił oczekiwany błąd: ${expectation}.`
          : `Oczekiwano błędu kompilatora: ${expectation ?? "brak kryterium"}.`,
      };
    }
    case "tests": {
      const source = input.code ? normalizedGuardSource(input.code) : "";
      const forbidden = forbiddenPattern(source, evaluator.forbiddenPatterns);
      const passed =
        evaluator.tests.trim().length > 0 &&
        runResult?.status === "success" &&
        runResult.tests !== undefined &&
        runResult.tests.passed > 0 &&
        runResult.tests.failed === 0 &&
        !forbidden;
      let feedback =
        evaluator.tests.trim().length === 0
          ? "Brakuje niepustego zestawu testów."
          : passed
            ? "Wszystkie testy zakończyły się powodzeniem."
            : "Testy nie zakończyły się powodzeniem.";
      if (forbidden) feedback = `W tym zadaniu pomiń: ${forbidden}.`;
      return { passed, evaluator: evaluator.kind, feedback };
    }
    case "answer": {
      if (input.answer === undefined) return missing(evaluator.kind);
      const normalize = (answer: string) =>
        evaluator.caseSensitive
          ? answer.trim()
          : answer.trim().toLocaleLowerCase();
      const passed = evaluator.accepted.some(
        (accepted) => normalize(accepted) === normalize(input.answer!),
      );
      return {
        passed,
        evaluator: evaluator.kind,
        feedback: passed
          ? "Ta odpowiedź jest zaakceptowana."
          : evaluator.feedback,
      };
    }
    case "choice": {
      if (input.answer === undefined) return missing(evaluator.kind);
      const passed = input.answer.trim() === evaluator.correct;
      return {
        passed,
        evaluator: evaluator.kind,
        feedback: passed
          ? (evaluator.explanations[evaluator.correct] ?? "Poprawnie.")
          : (evaluator.explanations[input.answer] ??
            "Ta odpowiedź nie jest jeszcze poprawna."),
      };
    }
    case "ordering": {
      const actual = parsedOrdering(input.answer);
      const passed =
        actual !== undefined &&
        actual.length === evaluator.correct.length &&
        actual.every((item, index) => item === evaluator.correct[index]);
      return {
        passed,
        evaluator: evaluator.kind,
        feedback: passed
          ? "Kolejność jest poprawna."
          : "Spróbuj ponownie, sprawdzając zależności między krokami.",
      };
    }
    case "rubric": {
      const checks = new Set(input.rubricChecks ?? []);
      const passed =
        Boolean(input.answer?.trim()) &&
        evaluator.criteria.length > 0 &&
        evaluator.criteria.every((criterion) => checks.has(criterion));
      return {
        passed,
        evaluator: evaluator.kind,
        feedback: passed
          ? "Sprawdziłeś każde kryterium. Potwierdź wyjaśnienie dowodem w kodzie."
          : "Dodaj własne, niepuste wyjaśnienie i zaznacz każde kryterium.",
      };
    }
  }
}
