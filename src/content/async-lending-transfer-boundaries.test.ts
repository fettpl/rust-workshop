import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { expect, it } from "vitest";
import {
  nativeDirectory,
  nativeRun,
  exactResult,
  discardDirectory,
} from "./async-lending-native-test-support";

import {
  callbackTransferStep,
  callbackTransferEquivalent,
  callbackTransferBoundaries,
} from "./async-lending-callback-transfer";
import {
  dynTransferStep,
  dynTransferEquivalent,
  dynTransferBoundaries,
} from "./async-lending-dyn-transfer";

const contracts = [
  {
    step: callbackTransferStep,
    equivalent: callbackTransferEquivalent,
    boundaries: callbackTransferBoundaries,
  },
  {
    step: dynTransferStep,
    equivalent: dynTransferEquivalent,
    boundaries: dynTransferBoundaries,
  },
];
it("retains all required live-last-use boundaries and feasible extra pairs", () => {
  expect(callbackTransferBoundaries.map((item) => item.id)).toEqual([
    "local-operation-static",
    "local-rc-send",
  ]);
  expect(dynTransferBoundaries.map((item) => item.id)).toEqual([
    "future-overlap",
    "slice-overlap",
    "borrowed-output-escape",
    "future-escape",
    "provider-send",
    "provider-static",
  ]);
});
for (const { step, equivalent, boundaries } of contracts) {
  for (const boundary of boundaries) {
    it(`${step.id}/${boundary.id} rejects the intended boundary and executes both pass twins`, () => {
      const directory = nativeDirectory(
        `async-transfer-boundary-${boundary.id}-`,
      );
      try {
        for (const [implementation, source] of [
          ["canonical", step.solution!],
          ["equivalent", equivalent],
        ]) {
          const fail = join(directory, `${implementation}-fail.rs`);
          writeFileSync(fail, source + boundary.failSuffix);
          const compiled = nativeRun(
            "rustc",
            [
              "--edition=2024",
              "--test",
              "--error-format=json",
              fail,
              "-o",
              join(directory, `${implementation}-fail`),
            ],
            directory,
            60_000,
          );
          expect(compiled.error).toBeUndefined();
          expect(compiled.signal).toBeNull();
          expect(compiled.status, compiled.stderr).toBe(1);
          const diagnostics = compiled.stderr
            .split("\n")
            .filter(Boolean)
            .map(
              (line) =>
                JSON.parse(line) as {
                  level: string;
                  message: string;
                  code?: { code: string } | null;
                  spans?: {
                    file_name: string;
                    line_start: number;
                    is_primary: boolean;
                  }[];
                },
            );
          const witnessStart = source.split("\n").length;
          for (const code of boundary.diagnosticCodes) {
            expect(
              diagnostics.some(
                (diagnostic) =>
                  diagnostic.level === "error" &&
                  diagnostic.code?.code === code &&
                  diagnostic.spans?.some(
                    (span) =>
                      span.is_primary &&
                      resolve(directory, span.file_name) === fail &&
                      span.line_start >= witnessStart,
                  ),
              ),
              `${boundary.id}: ${compiled.stderr}`,
            ).toBe(true);
          }
          const pass = join(directory, `${implementation}-pass.rs`);
          const binary = join(directory, `${implementation}-pass`);
          writeFileSync(pass, source + boundary.passSuffix);
          const accepted = nativeRun(
            "rustc",
            [
              "--edition=2024",
              "--test",
              "--error-format=json",
              pass,
              "-o",
              binary,
            ],
            directory,
            60_000,
          );
          expect(accepted.error).toBeUndefined();
          expect(accepted.signal).toBeNull();
          expect(accepted.status, accepted.stderr).toBe(0);
          exactResult(
            nativeRun(
              binary,
              [
                "--exact",
                boundary.passTestName,
                "--test-threads=1",
                "--nocapture",
              ],
              directory,
              8_000,
            ),
            boundary.passTestName,
            true,
          );
        }
      } finally {
        discardDirectory(directory);
      }
    }, 240_000);
  }
}
