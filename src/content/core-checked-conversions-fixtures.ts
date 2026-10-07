import {
  coreCheckedConversionsLessons,
  coreCheckedConversionsReviewExercises,
} from "./core-checked-conversions";

// Maintainer-authored sources only; never pass learner/imported code to this verifier.
function solution(id: string): string {
  const step = [
    ...coreCheckedConversionsLessons[0].steps,
    ...Object.values(coreCheckedConversionsReviewExercises),
  ].find((entry) => entry.id === id);
  if (!step?.solution) throw new Error(`Missing maintained solution ${id}`);
  return step.solution;
}
function starter(id: string): string {
  const step = [
    ...coreCheckedConversionsLessons[0].steps,
    ...Object.values(coreCheckedConversionsReviewExercises),
  ].find((entry) => entry.id === id);
  if (!step?.code) throw new Error(`Missing maintained starter ${id}`);
  return step.code;
}
function replace(source: string, from: string, to: string): string {
  if (!source.includes(from))
    throw new Error(`Invalid maintained mutation: ${from}`);
  return source.replace(from, to);
}
const byte = solution("checked-read-api");
const level = solution("checked-level-repair");
const percent = solution("checked-percent-transfer");
const count = solution("review-checked-conversion-errors");
export const coreCheckedConversionFixtures: {
  stepId: string;
  alternate: string;
  semanticMutants: Record<string, string>;
  diagnosticMutants: Record<string, { source: string; code: string }>;
}[] = [
  {
    stepId: "checked-read-api",
    alternate: replace(byte, "u8::try_from(value)", "value.try_into()"),
    semanticMutants: {
      "starter-wrap-cast": starter("checked-read-api"),
      "exclude-upper": replace(
        byte,
        "u8::try_from(value)",
        "u8::try_from(if value == 255 { 256 } else { value })",
      ),
      "exclude-lower": replace(
        byte,
        "u8::try_from(value)",
        "u8::try_from(if value == 0 { -1 } else { value })",
      ),
      "clamp-input": replace(
        byte,
        "u8::try_from(value)",
        "u8::try_from(value.clamp(0, 255))",
      ),
    },
    diagnosticMutants: {
      "wrong-error": {
        source: replace(
          byte,
          "Result<u8, std::num::TryFromIntError>",
          "Result<u8, String>",
        ),
        code: "E0308",
      },
    },
  },
  {
    stepId: "checked-level-repair",
    alternate: replace(
      replace(
        level,
        "if value < 1 || value > 5",
        "if !(1..=5).contains(&value)",
      ),
      "let value = text.parse::<i32>()?;",
      `let value = match text.parse::<i32>() {
        Ok(value) => value,
        Err(error) => return Err(LevelError::from(error)),
    };`,
    ),
    semanticMutants: {
      "wrap-cast": replace(
        level,
        "Err(LevelError::OutOfRange(value))",
        "Ok(Level(value as u8))",
      ),
      "exclude-upper": replace(level, "value > 5", "value >= 5"),
      "exclude-lower": replace(level, "value < 1", "value <= 1"),
      "clamp-input": replace(
        level,
        "let value = text.parse::<i32>()?;",
        "let value = text.parse::<i32>()?.clamp(1, 5);",
      ),
      "syntax-as-range": replace(
        level,
        "LevelError::InvalidNumber\n    }",
        "LevelError::OutOfRange(0)\n    }",
      ),
      "syntax-as-zero": replace(
        level,
        "text.parse::<i32>()?",
        "text.parse::<i32>().unwrap_or(0)",
      ),
      "lost-negative-payload": replace(
        level,
        "Err(LevelError::OutOfRange(value))",
        "Err(LevelError::OutOfRange(value as u8 as i32))",
      ),
      "trim-whitespace": replace(
        level,
        "text.parse::<i32>()?",
        "text.trim().parse::<i32>()?",
      ),
      "panic-on-parse": replace(
        level,
        "text.parse::<i32>()?",
        "text.parse::<i32>().unwrap()",
      ),
    },
    diagnosticMutants: {
      "missing-from-starter": {
        source: starter("checked-level-repair"),
        code: "E0277",
      },
      "manual-match-without-from": {
        source: replace(
          starter("checked-level-repair"),
          "let value = text.parse::<i32>()?;",
          `let value = match text.parse::<i32>() {
        Ok(value) => value,
        Err(_) => return Err(LevelError::InvalidNumber),
    };`,
        ),
        code: "E0277",
      },
      "inherent-only": {
        source: replace(
          replace(
            replace(level, "impl TryFrom<i32> for Level", "impl Level"),
            "    type Error = LevelError;\n",
            "",
          ),
          "Result<Self, Self::Error>",
          "Result<Self, LevelError>",
        ),
        code: "E0277",
      },
      "wrong-associated-error": {
        source: replace(
          level,
          "type Error = LevelError;",
          "type Error = std::num::ParseIntError;",
        ),
        code: "E0308",
      },
    },
  },
  {
    stepId: "checked-percent-transfer",
    alternate: replace(
      replace(percent, "if value < 0", "if value.is_negative()"),
      "value > 100",
      "100 < value",
    ),
    semanticMutants: {
      "wrap-cast": replace(
        replace(
          percent,
          "Err(PercentError::BelowZero(value))",
          "Ok(Percent(value as u8))",
        ),
        "Err(PercentError::AboveHundred(value))",
        "Ok(Percent(value as u8))",
      ),
      "exclude-upper": replace(percent, "value > 100", "value >= 100"),
      "exclude-lower": replace(percent, "value < 0", "value <= 0"),
      "clamp-input": replace(
        percent,
        "        if value < 0",
        "        let value = value.clamp(0, 100);\n        if value < 0",
      ),
      "lost-negative-payload": replace(
        percent,
        "BelowZero(value)",
        "BelowZero(value as u8 as i16)",
      ),
      "collapse-errors": replace(
        percent,
        "AboveHundred(value)",
        "BelowZero(value)",
      ),
    },
    diagnosticMutants: {
      "inherent-only": {
        source: replace(
          replace(
            replace(percent, "impl TryFrom<i16> for Percent", "impl Percent"),
            "    type Error = PercentError;\n",
            "",
          ),
          "Result<Self, Self::Error>",
          "Result<Self, PercentError>",
        ),
        code: "E0277",
      },
      "wrong-associated-error": {
        source: replace(
          percent,
          "type Error = PercentError;",
          "type Error = ();",
        ),
        code: "E0308",
      },
    },
  },
  {
    stepId: "review-checked-conversion-errors",
    alternate: replace(
      replace(
        count,
        "if value < 0 || value > 10",
        "if !(0..=10).contains(&value)",
      ),
      "value % 2 != 0",
      "value % 2 == 1",
    ),
    semanticMutants: {
      "starter-accepts-odd": starter("review-checked-conversion-errors"),
      "parity-before-range": replace(
        count,
        "        if value < 0 || value > 10",
        "        if value % 2 != 0 { return Err(CountError::Odd(value)); }\n        if value < 0 || value > 10",
      ),
      "exclude-upper": replace(count, "value > 10", "value >= 10"),
      "exclude-lower": replace(count, "value < 0", "value <= 0"),
      "lost-negative-payload": replace(
        count,
        "OutOfRange(value)",
        "OutOfRange(value as u8 as i16)",
      ),
    },
    diagnosticMutants: {
      "inherent-only": {
        source: replace(
          replace(
            replace(count, "impl TryFrom<i16> for EvenCount", "impl EvenCount"),
            "    type Error = CountError;\n",
            "",
          ),
          "Result<Self, Self::Error>",
          "Result<Self, CountError>",
        ),
        code: "E0277",
      },
    },
  },
];
