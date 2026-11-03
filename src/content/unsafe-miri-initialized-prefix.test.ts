import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import * as ts from "typescript";
import { expect, it } from "vitest";
import * as currentCourse from "./course";
import {
  initializedPrefixConceptId,
  initializedPrefixEquivalent,
  initializedPrefixFamily,
  initializedPrefixLessonId,
  initializedPrefixModel,
  initializedPrefixModelStepId,
  initializedPrefixPrimaryStepId,
  initializedPrefixSolution,
  initializedPrefixStarter,
  initializedPrefixSteps,
  initializedPrefixTests,
  initializedPrefixSafeVariants,
} from "./unsafe-miri-initialized-prefix";
import { unsafeMiriLessons, unsafeMiriModule } from "./unsafe-miri";
import { historicalBeforeDisjointRanges } from "./unsafe-miri-disjoint-ranges-compatibility-fixture";
import { historicalBeforeA8ThenA7ThenExistingContractRepair as historicalBeforeExistingContractRepair } from "./capstone-maintenance-compatibility-fixture";
import baseline from "./fixtures/unsafe-miri-pre-prefix.json";
import { unsafeMiriAssessmentSourceFor } from "./unsafe-miri-assessment-fixtures";

// This ordered list is the accepted shared42 contract. Update it only when
// the sealed harness itself changes; a name change requires a new content and
// native-source audit because variants and native verification bind to names.
const acceptedShared42Names = [
  "case01_empty_destination_and_source",
  "case02_empty_source_fresh_destination",
  "case03_empty_source_initialized_sentinel_no_write",
  "case04_one_byte_zero",
  "case05_one_byte_high",
  "case06_partial_array_prefix",
  "case07_partial_vec_prefix",
  "case08_exact_capacity",
  "case09_oversized_source_returns_error",
  "case10_oversized_source_does_not_write",
  "case11_arbitrary_zero_high_bytes",
  "case12_invalid_utf8_bytes",
  "case13_nonempty_pointer_identity_array",
  "case14_nonempty_pointer_identity_vec",
  "case15_output_length_one",
  "case16_output_length_partial",
  "case17_empty_result_has_no_identity_requirement",
  "case18_source_lifetime_independence",
  "case19_destination_reusable_after_last_borrow",
  "case20_array_capacity_one",
  "case21_vec_capacity_one",
  "case22_destination_longer_than_source",
  "case23_nonempty_destination_empty_source",
  "case24_empty_destination_oversized_source",
  "case25_prefix_order",
  "case26_prefix_exact_values",
  "case27_initialized_suffix_preserved",
  "case28_too_long_preserves_first_sentinel",
  "case29_too_long_preserves_last_sentinel",
  "case30_repeated_calls",
  "case31_two_independent_backings",
  "case32_high_byte_255_survives",
  "case33_zero_byte_in_middle_survives",
  "case34_output_is_destination_slice",
  "case35_initialized_prefix_only_is_read",
  "intended_reverse_order",
  "intended_wrong_prefix_value",
  "intended_returned_length",
  "intended_exact_capacity",
  "intended_oversized_no_write",
  "intended_suffix_preservation",
  "intended_destination_identity",
] as const;

type SourceReader = (path: string) => string;

function resolveBrowserSourceImport(
  from: string,
  specifier: string,
  sourceRoot: string,
  readSource: SourceReader,
): string {
  if (specifier.startsWith("node:")) {
    throw new Error(`Node builtin is not browser-safe: ${specifier}`);
  }
  if (specifier.includes("unsafe-miri-initialized-prefix-native")) {
    throw new Error(`native seam is not browser-safe: ${specifier}`);
  }
  let base: string;
  if (specifier.startsWith(".")) {
    base = resolve(dirname(from), specifier);
  } else if (specifier.startsWith("@/")) {
    base = resolve(sourceRoot, specifier.slice(2));
  } else {
    throw new Error(`unsupported bare browser runtime import: ${specifier}`);
  }
  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.mts`,
    `${base}.cts`,
    resolve(base, "index.ts"),
  ]) {
    try {
      readSource(candidate);
      if (candidate.includes("unsafe-miri-initialized-prefix-native")) {
        throw new Error(`native seam is not browser-safe: ${specifier}`);
      }
      return candidate;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith("native seam is not browser-safe")
      ) {
        throw error;
      }
      // Continue through the bounded TypeScript source resolution set.
    }
  }
  throw new Error(
    `unresolvable browser source import: ${specifier} from ${from}`,
  );
}

function browserRuntimeSourceGraph(
  entry: string,
  readSource: SourceReader = (path) => readFileSync(path, "utf8"),
  sourceRoot = resolve(dirname(entry), ".."),
): string[] {
  const pending = [entry];
  const visited = new Set<string>();
  const files: string[] = [];
  while (pending.length > 0) {
    const file = pending.pop()!;
    if (visited.has(file)) continue;
    visited.add(file);
    const source = readSource(file);
    const transpiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.Latest,
      },
      fileName: file,
      reportDiagnostics: true,
    });
    if (
      transpiled.diagnostics?.some(
        (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
      )
    ) {
      throw new Error(`cannot parse browser TypeScript source: ${file}`);
    }
    const sourceFile = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    files.push(file);
    const visit = (node: ts.Node): void => {
      const visitRuntimeSpecifier = (specifier: string): void => {
        pending.push(
          resolveBrowserSourceImport(file, specifier, sourceRoot, readSource),
        );
      };
      if (ts.isImportDeclaration(node)) {
        const clause = node.importClause;
        const runtimeImport =
          clause === undefined ||
          (!clause.isTypeOnly &&
            (clause.name !== undefined ||
              clause.namedBindings === undefined ||
              ts.isNamespaceImport(clause.namedBindings) ||
              (ts.isNamedImports(clause.namedBindings) &&
                clause.namedBindings.elements.length === 0) ||
              clause.namedBindings.elements.some(
                (element) => !element.isTypeOnly,
              )));
        if (runtimeImport && ts.isStringLiteralLike(node.moduleSpecifier)) {
          visitRuntimeSpecifier(node.moduleSpecifier.text);
        }
      } else if (ts.isExportDeclaration(node)) {
        const clause = node.exportClause;
        const runtimeExport =
          !node.isTypeOnly &&
          (clause === undefined ||
            !ts.isNamedExports(clause) ||
            clause.elements.length === 0 ||
            clause.elements.some((element) => !element.isTypeOnly));
        if (
          runtimeExport &&
          node.moduleSpecifier &&
          ts.isStringLiteralLike(node.moduleSpecifier)
        ) {
          visitRuntimeSpecifier(node.moduleSpecifier.text);
        }
      } else if (ts.isImportEqualsDeclaration(node)) {
        if (node.isTypeOnly) return;
        if (
          !ts.isExternalModuleReference(node.moduleReference) ||
          !node.moduleReference.expression ||
          !ts.isStringLiteralLike(node.moduleReference.expression)
        ) {
          throw new Error(`unsupported runtime import-equals edge in ${file}`);
        }
        visitRuntimeSpecifier(node.moduleReference.expression.text);
      } else if (ts.isCallExpression(node)) {
        const isDynamicImport =
          node.expression.kind === ts.SyntaxKind.ImportKeyword;
        const isRequire =
          ts.isIdentifier(node.expression) &&
          node.expression.text === "require";
        if (isDynamicImport || isRequire) {
          if (
            node.arguments.length !== 1 ||
            !ts.isStringLiteralLike(node.arguments[0])
          ) {
            throw new Error(`unsupported non-literal runtime edge in ${file}`);
          }
          visitRuntimeSpecifier(node.arguments[0].text);
        }
      }
      ts.forEachChild(node, visit);
    };
    ts.forEachChild(sourceFile, visit);
  }
  return files;
}

function fixtureReader(
  sources: Readonly<Record<string, string>>,
): SourceReader {
  return (path) => {
    const source = sources[path];
    if (source === undefined)
      throw new Error(`missing source fixture: ${path}`);
    return source;
  };
}

it("pins the initialized-prefix exports and ordered lesson append", () => {
  expect(initializedPrefixSteps.map((step) => step.id)).toEqual([
    initializedPrefixModelStepId,
    initializedPrefixPrimaryStepId,
  ]);
  expect(initializedPrefixSteps[0].evidenceGate).not.toBe(true);
  expect(initializedPrefixSteps[0].evidence?.codingTaskId).toBeUndefined();
  expect(initializedPrefixSteps[1].evidence?.codingTaskId).toBe(
    initializedPrefixFamily,
  );
  expect(initializedPrefixSteps[1].evidenceGate).toBe(true);
  expect(initializedPrefixSteps[1].evidence?.version).toBe(2);
  expect(
    initializedPrefixSteps.every((step) =>
      step.evidence?.conceptIds.includes(initializedPrefixConceptId),
    ),
  ).toBe(true);

  const lesson = unsafeMiriLessons.find(
    (candidate) => candidate.id === initializedPrefixLessonId,
  );
  expect(lesson?.steps.slice(-2)).toEqual([...initializedPrefixSteps]);
  expect(unsafeMiriModule.gateCriteria?.[0].taskRefs).toContainEqual({
    lessonId: initializedPrefixLessonId,
    stepId: initializedPrefixPrimaryStepId,
  });
});

it("keeps the model, safe starter, and complete shared42 source distinct", () => {
  expect(initializedPrefixModel).toContain("storage[0].write(0)");
  expect(initializedPrefixModel).toContain("storage[1].write(255)");
  expect(initializedPrefixModel).toContain("[MaybeUninit::<u8>::uninit(); 3]");
  expect(initializedPrefixModel).toContain('println!("{:?}", initialized)');
  expect(initializedPrefixStarter).not.toMatch(/unsafe|from_raw_parts/);
  expect(initializedPrefixStarter).toContain("Err(TooLong)");
  expect(initializedPrefixSolution).toContain("slot.write(byte)");
  expect(initializedPrefixSolution).toContain("src.len() > dst.len()");
  expect(initializedPrefixTests).toMatch(
    /fn case01_empty_destination_and_source/,
  );
  expect(initializedPrefixTests).toMatch(
    /fn case35_initialized_prefix_only_is_read/,
  );
  expect(initializedPrefixTests).toMatch(/fn intended_reverse_order/);
  expect(initializedPrefixTests).toMatch(/fn intended_destination_identity/);
  const actualShared42Names = [
    ...initializedPrefixTests.matchAll(/#\[test\]\s*fn\s+([A-Za-z0-9_]+)/g),
  ].map(([, name]) => name);
  expect(actualShared42Names).toEqual(acceptedShared42Names);
});

it("guards all fourteen safe variant mappings and concrete restorations", () => {
  expect(initializedPrefixSafeVariants).toHaveLength(14);
  for (const variant of initializedPrefixSafeVariants) {
    expect(variant.source, variant.id).not.toBe(variant.restoredSource);
    expect(variant.source, variant.id).toContain(
      variant.mechanism === "element" ? "slot.write" : "copy_nonoverlapping",
    );
    expect(
      initializedPrefixTests.match(
        new RegExp(`fn ${variant.intendedAssertion}\\(`, "g"),
      ),
      variant.id,
    ).toHaveLength(1);
  }
  expect(initializedPrefixSafeVariants[0].source).toContain("Box::leak");
  expect(initializedPrefixSafeVariants[0].source).toContain("Ok(&*leaked)");
  expect(initializedPrefixSafeVariants[7].source).toContain("Box::leak");
  expect(initializedPrefixSafeVariants[7].source).toContain("Ok(&*leaked)");
});

it("rejects unknown fixture ids and preserves the accepted old seven objects", () => {
  expect(() => unsafeMiriAssessmentSourceFor("byte-view-unknown")).toThrow(
    /Unknown unsafe-miri assessment fixture id/,
  );
  expect(
    unsafeMiriAssessmentSourceFor(initializedPrefixPrimaryStepId).equivalent,
  ).toBe(initializedPrefixEquivalent);
  const beforeDisjointRanges = historicalBeforeDisjointRanges(
    historicalBeforeExistingContractRepair(currentCourse),
  );
  const lesson = beforeDisjointRanges.lessons.find(
    (candidate) => candidate.id === initializedPrefixLessonId,
  )!;
  expect({ ...lesson, steps: lesson.steps.slice(0, 7) }).toEqual(
    baseline.lesson,
  );
  const initializedModule = beforeDisjointRanges.modules.find(
    (candidate) => candidate.id === "unsafe-miri-contracts",
  )!;
  expect({
    ...initializedModule,
    gateCriteria: initializedModule.gateCriteria?.map((criterion) =>
      criterion.id === "unsafe-miri-byte-view-gate"
        ? {
            ...criterion,
            taskRefs: criterion.taskRefs.filter(
              (ref) => ref.stepId !== initializedPrefixPrimaryStepId,
            ),
          }
        : criterion,
    ),
  }).toEqual(baseline.module);
});

it("keeps the browser-safe module free of the native Node seam", () => {
  const corePath = resolve(
    dirname(new URL(import.meta.url).pathname),
    "unsafe-miri-initialized-prefix.ts",
  );
  expect(browserRuntimeSourceGraph(corePath)).toEqual([corePath]);
  expect(initializedPrefixStarter).not.toContain("from_raw_parts");
});

it("fails closed for aliased, transitive, dynamic, bare-package, and native edges", () => {
  const nodeTransitivelyAliased = {
    "/fixture/entry.ts": `import { value } from "@/bridge"; export { value };`,
    "/fixture/src/bridge.ts": `export { value } from "./middle";`,
    "/fixture/src/middle.ts": `import fs from "node:fs"; export const value = fs;`,
  };
  expect(() =>
    browserRuntimeSourceGraph(
      "/fixture/entry.ts",
      fixtureReader(nodeTransitivelyAliased),
      "/fixture/src",
    ),
  ).toThrow(/Node builtin/);

  const nativeTransitivelyAliased = {
    "/fixture/entry.ts": `export { value } from "@/bridge";`,
    "/fixture/src/bridge.ts": `export { value } from "./unsafe-miri-initialized-prefix-native";`,
  };
  expect(() =>
    browserRuntimeSourceGraph(
      "/fixture/entry.ts",
      fixtureReader(nativeTransitivelyAliased),
      "/fixture/src",
    ),
  ).toThrow(/native seam/);

  const emptyNodeReExport = {
    "/fixture/entry.ts": `export {} from "node:fs";`,
  };
  expect(() =>
    browserRuntimeSourceGraph(
      "/fixture/entry.ts",
      fixtureReader(emptyNodeReExport),
      "/fixture/src",
    ),
  ).toThrow(/Node builtin/);

  const emptyNativeReExport = {
    "/fixture/entry.ts": `export {} from "./unsafe-miri-initialized-prefix-native";`,
    "/fixture/unsafe-miri-initialized-prefix-native": `export const native = 1;`,
  };
  expect(() =>
    browserRuntimeSourceGraph(
      "/fixture/entry.ts",
      fixtureReader(emptyNativeReExport),
      "/fixture/src",
    ),
  ).toThrow(/native seam/);

  const literalDynamic = {
    "/fixture/entry.ts": `export const value = import("./dynamic-edge");`,
    "/fixture/dynamic-edge.ts": `import fs from "node:fs"; export const value = fs;`,
  };
  expect(() =>
    browserRuntimeSourceGraph(
      "/fixture/entry.ts",
      fixtureReader(literalDynamic),
      "/fixture/src",
    ),
  ).toThrow(/Node builtin/);

  const variableDynamic = {
    "/fixture/entry.ts": `export const load = (name: string) => import(name);`,
  };
  expect(() =>
    browserRuntimeSourceGraph(
      "/fixture/entry.ts",
      fixtureReader(variableDynamic),
      "/fixture/src",
    ),
  ).toThrow(/non-literal runtime edge/);

  const variableRequire = {
    "/fixture/entry.ts": `export const load = (name: string) => require(name);`,
  };
  expect(() =>
    browserRuntimeSourceGraph(
      "/fixture/entry.ts",
      fixtureReader(variableRequire),
      "/fixture/src",
    ),
  ).toThrow(/non-literal runtime edge/);

  const unknownBarePackage = {
    "/fixture/entry.ts": `import value from "not-in-browser-allowlist"; export { value };`,
  };
  expect(() =>
    browserRuntimeSourceGraph(
      "/fixture/entry.ts",
      fixtureReader(unknownBarePackage),
      "/fixture/src",
    ),
  ).toThrow(/unsupported bare browser runtime import/);

  const malformedSource = {
    "/fixture/entry.ts": `export const value = ;`,
  };
  expect(() =>
    browserRuntimeSourceGraph(
      "/fixture/entry.ts",
      fixtureReader(malformedSource),
      "/fixture/src",
    ),
  ).toThrow(/cannot parse browser TypeScript source/);

  const typeOnlyNodeImport = {
    "/fixture/entry.ts": `import type { Stats } from "node:fs"; export type { Stats } from "node:fs"; import type FsTypes = require("node:fs"); export const value = 1;`,
  };
  expect(
    browserRuntimeSourceGraph(
      "/fixture/entry.ts",
      fixtureReader(typeOnlyNodeImport),
      "/fixture/src",
    ),
  ).toEqual(["/fixture/entry.ts"]);
});
