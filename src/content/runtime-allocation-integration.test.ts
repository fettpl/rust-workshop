import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { concepts, lessons, modules, reviewExercises } from "./course";
import { runtimeAllocationEvidenceLessons } from "./runtime-allocation-evidence";
import { nestedPatternConcepts, nestedPatternLessons } from "./nested-patterns";

it("registers the two runtime allocation lessons with four gates and six authored assessments", () => {
  expect(runtimeAllocationEvidenceLessons.map((lesson) => lesson.id)).toEqual(["runtime-allocation-scope", "runtime-allocation-comparison"]);
  // Frozen post-PR40/PR41 pre-nested catalog cut plus the accepted nested exports.
  expect(lessons).toHaveLength(186 + nestedPatternLessons.length);
  expect(concepts).toHaveLength(190 + nestedPatternConcepts.length);
  const stage = modules.find((module) => module.id === "profile-evidence")!;
  expect(stage.lessonIds).toEqual(expect.arrayContaining(["runtime-allocation-scope", "runtime-allocation-comparison"]));
  expect(stage.gateCriteria?.filter((criterion) => criterion.id.startsWith("runtime-allocation-")).map((criterion) => criterion.taskRefs[0].stepId)).toEqual([
    "allocation-scope-gate", "allocation-scope-error-gate", "allocation-comparison-gate", "allocation-comparison-complete-gate",
  ]);
  expect(Object.keys(reviewExercises)).toEqual(expect.arrayContaining(["runtime-allocation-window", "runtime-allocation-comparison"]));
  expect(runtimeAllocationEvidenceLessons.flatMap((lesson) => lesson.steps.filter((step) => step.evaluator?.kind === "tests" && !step.evidenceGate))).toHaveLength(2);
});

it("keeps the allocation verifier and matrix bounded to authored evidence", () => {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
    scripts: Record<string, string>;
  };
  expect(packageJson.scripts["content:allocations"]).toContain(
    "verify-allocations.ts",
  );
  const workflow = readFileSync(".github/workflows/ci.yml", "utf8");
  expect(workflow).toContain("allocation-evidence:");
  expect(workflow).toContain("content:allocations -- --fetch");
  expect(workflow).toContain("content:allocations -- --fetch --msrv");
  expect(workflow).toContain("os: macos-latest");
});

it("keeps async lending follow-up assertions specific and honest", () => {
  const e2e = readFileSync("tests/e2e/module-resume.spec.ts", "utf8");
  const offline = readFileSync("scripts/verify-offline.mjs", "utf8");
  expect(e2e).toContain('"async-lending-contracts"');
  expect(e2e).toContain('message.type() === "error"');
  expect(e2e).toContain('page.keyboard.press("Tab")');
  expect(e2e).toContain('page.keyboard.press("Shift+Tab")');
  expect(e2e).toContain('page.getByRole("button", { name: "Monaco Editor", exact: true })');
  expect(e2e).toContain("Niezależny transfer async zapisany po reveal");
  expect(offline).toContain("Async lending: pożyczone futures i granice dispatchu");
  expect(offline).toContain('message.type() !== "error"');
  expect(offline).toContain("const expectedOfflineConsoleErrors = [];");
  expect(offline).toContain("net::ERR_INTERNET_DISCONNECTED");
  expect(offline).toContain('expect(consoleErrors).toEqual([])');
  expect(offline).toContain("Niezależny async transfer: Pending nie zapisuje efektu przed Ready.");
  expect(offline).toContain('page.getByRole("button", { name: "Monaco Editor", exact: true })');
});
