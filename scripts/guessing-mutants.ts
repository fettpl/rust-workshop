/** Negative controls for the fixed, repository-authored Number Guessing+ archive. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { behavioralRejection, testCounts } from "./cargo-observation";

type Control = {
  name: string;
  before: string;
  after: string;
  test: string;
  rejectedBy: RegExp;
};

/** No paths or source come from CLI/user input; the caller extracts our fixed ZIP. */
export function verifyGuessingMutants(
  root: string,
  cargo: string,
  env: NodeJS.ProcessEnv,
): void {
  const path = join(root, "src/lib.rs");
  const original = readFileSync(path, "utf8");
  const lockPath = join(root, "Cargo.lock");
  const lock = readFileSync(lockPath, "utf8");
  const controls: Control[] = [
    {
      name: "invalid guesses consume an attempt",
      before:
        "if !(MIN..=MAX).contains(&guess) {\n            return Err(GameError::OutOfRange);",
      after:
        "if !(MIN..=MAX).contains(&guess) {\n            self.remaining -= 1;\n            return Err(GameError::OutOfRange);",
      test: "state_keeps_invalid_guesses_and_prioritizes_a_final_win",
      rejectedBy: /assertion `left == right` failed/,
    },
    {
      name: "a correct final guess loses",
      before: "if guess == self.secret {",
      after: "if guess == self.secret && self.remaining > 0 {",
      test: "state_keeps_invalid_guesses_and_prioritizes_a_final_win",
      rejectedBy: /assertion `left == right` failed/,
    },
    {
      name: "a session redraws its secret before each guess",
      before:
        "Ok(Input::Guess(guess)) => match game\n                .submit(guess)",
      after:
        "Ok(Input::Guess(guess)) => match {\n                game = new_game_with(game.remaining(), || 1).unwrap();\n                game.submit(guess)\n            }",
      test: "session_keeps_initial_secret_through_invalid_low_and_high_guesses",
      rejectedBy: /assertion `left == right` failed/,
    },
    {
      name: "a prompt is read before it is flushed",
      before: 'writer.write_all(b"guess> ")?;\n        writer.flush()?;',
      after: 'writer.write_all(b"guess> ")?;',
      test: "prompt_flush_is_observed_before_the_first_read",
      rejectedBy: /read happened before prompt flush/,
    },
  ];

  function run(test: string) {
    const result = spawnSync(
      cargo,
      [
        "test",
        "--test",
        "contracts",
        "--offline",
        "--locked",
        test,
        "--",
        "--exact",
      ],
      {
        cwd: root,
        env,
        encoding: "utf8",
        timeout: 60_000,
        maxBuffer: 3 * 1024 * 1024,
      },
    );
    assert.ifError(result.error);
    assert.equal(
      result.signal,
      null,
      "A signal or watchdog is not mutant rejection",
    );
    assert.notEqual(result.status, null);
    assert.equal(
      readFileSync(lockPath, "utf8"),
      lock,
      "Mutant checks changed Cargo.lock",
    );
    return result;
  }

  try {
    for (const control of controls) {
      const baseline = run(control.test);
      assert.equal(baseline.status, 0, baseline.stdout + baseline.stderr);
      assert.deepEqual(testCounts(baseline.stdout), { passed: 1, failed: 0 });
      assert.equal(
        original.split(control.before).length,
        2,
        `Mutation anchor must occur once: ${control.name}`,
      );
      writeFileSync(path, original.replace(control.before, control.after));
      const result = run(control.test);
      const output = result.stdout + result.stderr;
      assert(
        behavioralRejection(result),
        `No behavioral rejection: ${control.name}\n${output}`,
      );
      assert.deepEqual(
        testCounts(result.stdout),
        { passed: 0, failed: 1 },
        output,
      );
      assert.match(
        result.stdout,
        new RegExp(`test ${control.test} \\.\\.\\. FAILED`),
      );
      assert.match(output, control.rejectedBy);
      writeFileSync(path, original);
      const restored = run(control.test);
      assert.equal(restored.status, 0, restored.stdout + restored.stderr);
      assert.deepEqual(testCounts(restored.stdout), { passed: 1, failed: 0 });
      console.log(`ok rejected mutant and restored reference: ${control.name}`);
    }
  } finally {
    writeFileSync(path, original);
  }
}
