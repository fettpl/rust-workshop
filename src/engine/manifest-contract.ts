import { getStaticTOMLValue, parseTOML, VisitorKeys } from "toml-eslint-parser";
import type {
  ManifestAssertion,
  ManifestContract,
  ManifestDependencyExpectation,
  ManifestDependencySource,
  ManifestPath,
  ManifestSetExpectation,
  ManifestValue,
} from "@/domain/manifest";

export interface ManifestContractCheck {
  passed: boolean;
  feedback: string;
}

const MAX_SOURCE_BYTES = 65_536;
const MAX_AST_DEPTH = 64;
const MAX_AST_NODES = 20_000;
const MAX_ASSERTIONS = 64;
const MAX_PATH_SEGMENTS = 12;
const MAX_AUTHORED_LENGTH = 4_096;
const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const own = (value: object, key: PropertyKey): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

type StaticDocument = Record<string, unknown>;
type AstNode = { type?: string; [key: string]: unknown };

function bounded(text: unknown, max = 180): string {
  return String(text ?? "nieznany błąd")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function feedbackError(
  message: unknown,
  line?: number,
  column?: number,
): string {
  const location = line
    ? ` (wiersz ${line}${column ? `, kolumna ${column}` : ""})`
    : "";
  return `Składnia TOML${location}: ${bounded(message)}.`;
}

function keySegment(node: AstNode): string | undefined {
  if (node.type === "TOMLBare")
    return typeof node.name === "string" ? node.name : undefined;
  if (node.type === "TOMLQuoted")
    return typeof node.value === "string" ? node.value : undefined;
  return undefined;
}

function astSafetyIssues(ast: AstNode): string[] {
  const stack: Array<{ node: unknown; depth: number }> = [
    { node: ast, depth: 1 },
  ];
  const seen = new Set<object>();
  let nodes = 0;
  while (stack.length) {
    const current = stack.pop()!;
    if (!current.node || typeof current.node !== "object") continue;
    const node = current.node as AstNode;
    if (seen.has(node)) continue;
    seen.add(node);
    nodes += 1;
    if (nodes > MAX_AST_NODES) return ["Manifest TOML jest zbyt złożony."];
    if (current.depth > MAX_AST_DEPTH)
      return ["Manifest TOML jest zbyt głęboki."];
    if (node.type === "TOMLKey") {
      const keys = node.keys;
      if (
        !Array.isArray(keys) ||
        keys.length === 0 ||
        keys.length > MAX_PATH_SEGMENTS
      )
        return ["Klucz TOML ma niedozwoloną długość."];
      for (const key of keys) {
        const segment = keySegment(key as AstNode);
        if (segment === undefined || segment.length > MAX_AUTHORED_LENGTH)
          return ["Klucz TOML ma niedozwoloną długość."];
        if (DANGEROUS_KEYS.has(segment))
          return [`Klucz TOML „${segment}” jest niedozwolony.`];
      }
    }
    for (const childKey of VisitorKeys[node.type ?? ""] ?? []) {
      const child = node[childKey];
      if (Array.isArray(child)) {
        for (let index = child.length - 1; index >= 0; index -= 1)
          stack.push({ node: child[index], depth: current.depth + 1 });
      } else stack.push({ node: child, depth: current.depth + 1 });
    }
  }
  return [];
}

function authoredStringIssues(ast: AstNode): string[] {
  const stack: unknown[] = [ast];
  const seen = new Set<object>();
  while (stack.length) {
    const value = stack.pop();
    if (!value || typeof value !== "object") continue;
    const object = value as AstNode;
    if (seen.has(object)) continue;
    seen.add(object);
    if (
      (object.type === "TOMLValue" || object.type === "TOMLQuoted") &&
      typeof object.value === "string" &&
      object.value.length > MAX_AUTHORED_LENGTH
    )
      return ["Wartość tekstowa TOML jest zbyt długa."];
    for (const key of VisitorKeys[object.type ?? ""] ?? []) {
      const child = object[key];
      if (Array.isArray(child)) stack.push(...child);
      else stack.push(child);
    }
  }
  return [];
}

function parseDocument(source: string): {
  value?: StaticDocument;
  issues: string[];
} {
  if (typeof source !== "string")
    return { issues: ["Manifest TOML musi być tekstem."] };
  if (new TextEncoder().encode(source).byteLength > MAX_SOURCE_BYTES)
    return { issues: ["Manifest TOML jest zbyt długi."] };
  try {
    const ast = parseTOML(source, {
      tomlVersion: "1.0.0",
    }) as unknown as AstNode;
    const safety = astSafetyIssues(ast);
    if (safety.length) return { issues: safety };
    const strings = authoredStringIssues(ast);
    if (strings.length) return { issues: strings };
    const value = getStaticTOMLValue(
      ast as unknown as Parameters<typeof getStaticTOMLValue>[0],
    ) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value))
      return { issues: ["Manifest TOML musi zawierać tabelę główną."] };
    return { value: value as StaticDocument, issues: [] };
  } catch (error) {
    const candidate = error as {
      message?: unknown;
      lineNumber?: unknown;
      columnNumber?: unknown;
    };
    return {
      issues: [
        feedbackError(
          typeof candidate.message === "string" ? candidate.message : undefined,
          typeof candidate.lineNumber === "number"
            ? candidate.lineNumber
            : undefined,
          typeof candidate.columnNumber === "number"
            ? candidate.columnNumber
            : undefined,
        ),
      ],
    };
  }
}

function validString(value: unknown): value is string {
  return typeof value === "string" && value.length <= MAX_AUTHORED_LENGTH;
}

function isTable(value: unknown): value is Record<string, unknown> {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.prototype.toString.call(value) === "[object Object]"
  );
}

function validName(value: unknown): value is string {
  return validString(value) && value.length > 0;
}

function validPath(path: unknown): path is ManifestPath {
  return (
    Array.isArray(path) &&
    path.length > 0 &&
    path.length <= MAX_PATH_SEGMENTS &&
    path.every((segment) => validName(segment) && !DANGEROUS_KEYS.has(segment))
  );
}

function validSet(expectation: unknown): expectation is ManifestSetExpectation {
  if (
    !expectation ||
    typeof expectation !== "object" ||
    !own(expectation, "values")
  )
    return false;
  const values = (expectation as { values?: unknown }).values;
  return (
    Array.isArray(values) &&
    values.length <= MAX_AUTHORED_LENGTH &&
    values.every(validName) &&
    new Set(values).size === values.length &&
    (!own(expectation, "mode") ||
      (expectation as { mode?: unknown }).mode === "equals" ||
      (expectation as { mode?: unknown }).mode === "contains")
  );
}

function validSource(source: unknown): source is ManifestDependencySource {
  if (
    !source ||
    typeof source !== "object" ||
    !validString((source as { kind?: unknown }).kind)
  )
    return false;
  const kind = (source as { kind: string }).kind;
  if (kind === "registry") {
    const keysAllowed = Object.keys(source).every(
      (key) => key === "kind" || key === "registry",
    );
    return (
      keysAllowed &&
      (!own(source, "registry") ||
        validName((source as { registry?: unknown }).registry))
    );
  }
  if (kind === "path")
    return (
      Object.keys(source).every((key) => key === "kind" || key === "path") &&
      validName((source as { path?: unknown }).path)
    );
  return (
    kind === "workspace" && Object.keys(source).every((key) => key === "kind")
  );
}

function validDependency(
  expectation: unknown,
): expectation is ManifestDependencyExpectation {
  if (!expectation || typeof expectation !== "object") return false;
  const item = expectation as Record<string, unknown>;
  if (
    !validName(item.name) ||
    (own(item, "package") && !validName(item.package)) ||
    (own(item, "version") && !validString(item.version)) ||
    (own(item, "source") && !validSource(item.source))
  )
    return false;
  if (own(item, "optional") && typeof item.optional !== "boolean") return false;
  if (own(item, "defaultFeatures") && typeof item.defaultFeatures !== "boolean")
    return false;
  if (own(item, "features") && !validSet(item.features)) return false;
  if (
    typeof item.version === "string" &&
    !/^\^?\d+\.\d+\.\d+$/.test(item.version)
  )
    return false;
  return true;
}

function assertionIssues(assertion: unknown): string[] {
  if (!assertion || typeof assertion !== "object")
    return ["Kontrakt zawiera niepoprawne twierdzenie."];
  const item = assertion as Record<string, unknown>;
  if (!validString(item.kind))
    return ["Kontrakt zawiera niepoprawne twierdzenie."];
  if (item.kind === "dependency-package-absent") {
    if (
      ![
        "dependencies",
        "dev-dependencies",
        "build-dependencies",
        "workspace.dependencies",
      ].includes(item.table as string) ||
      !validName(item.package)
    )
      return ["Kontrakt zawiera niepoprawne wykluczenie zależności."];
    return [];
  }
  if (
    [
      "path-present",
      "path-absent",
      "path-nonempty-string",
      "path-equals",
    ].includes(item.kind as string) &&
    !validPath(item.path)
  )
    return ["Kontrakt zawiera niepoprawną ścieżkę."];
  if (item.kind === "path-equals") {
    const value = item.value;
    if (typeof value === "string" && !validString(value))
      return ["Kontrakt zawiera zbyt długą wartość tekstową."];
    if (!(
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      (Array.isArray(value) && value.every(validString))
    ))
      return ["Kontrakt zawiera niepoprawną wartość."];
    if (
      own(item, "arrayMode") &&
      item.arrayMode !== "ordered" &&
      item.arrayMode !== "set"
    )
      return ["Kontrakt zawiera niepoprawny tryb tablicy."];
  }
  if (item.kind === "dependency") {
    if (
      ![
        "dependencies",
        "dev-dependencies",
        "build-dependencies",
        "workspace.dependencies",
      ].includes(item.table as string) ||
      !validDependency(item.dependency)
    )
      return ["Kontrakt zawiera niepoprawną zależność."];
    if (
      item.table === "workspace.dependencies" &&
      own(item.dependency as object, "optional")
    )
      return ["Zależność workspace nie może wymagać pola optional."];
  }
  if (
    item.kind === "feature-forwarding" &&
    (!validName(item.package) ||
      !validName(item.feature) ||
      !validSet(item.enables))
  )
    return ["Kontrakt zawiera niepoprawne przekazywanie feature."];
  if (
    ![
      "path-present",
      "path-absent",
      "path-nonempty-string",
      "path-equals",
      "dependency",
      "dependency-package-absent",
      "feature-forwarding",
    ].includes(item.kind as string)
  )
    return ["Kontrakt zawiera nieznany typ twierdzenia."];
  return [];
}

export function manifestContractIssues(contract: ManifestContract): string[] {
  if (
    !contract ||
    typeof contract !== "object" ||
    (contract.document !== "package" && contract.document !== "workspace-root")
  )
    return ["Kontrakt manifestu ma niepoprawny dokument."];
  if (!Array.isArray(contract.assertions) || contract.assertions.length === 0)
    return ["Kontrakt manifestu nie może być pusty."];
  if (contract.assertions.length > MAX_ASSERTIONS)
    return ["Kontrakt manifestu zawiera zbyt wiele twierdzeń."];
  for (const assertion of contract.assertions) {
    const issues = assertionIssues(assertion);
    if (issues.length) return issues;
  }
  return [];
}

function atPath(
  value: unknown,
  path: readonly string[],
): { exists: boolean; value?: unknown } {
  let current: unknown = value;
  for (const segment of path) {
    if (!current || typeof current !== "object" || !own(current, segment))
      return { exists: false };
    current = (current as Record<string, unknown>)[segment];
  }
  return { exists: true, value: current };
}

function setMatches(
  actual: unknown,
  expected: ManifestSetExpectation,
): boolean {
  if (
    !Array.isArray(actual) ||
    !actual.every((item) => typeof item === "string")
  )
    return false;
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected.values);
  if (expected.mode === "contains")
    return [...expectedSet].every((item) => actualSet.has(item));
  return (
    actualSet.size === expectedSet.size &&
    [...expectedSet].every((item) => actualSet.has(item))
  );
}

function versionMatches(actual: unknown, expected: string): boolean {
  return (
    typeof actual === "string" &&
    /^\^?\d+\.\d+\.\d+$/.test(actual) &&
    actual.replace(/^\^/, "") === expected.replace(/^\^/, "")
  );
}

function sourceMatches(
  actual: Record<string, unknown>,
  expected: ManifestDependencySource,
): boolean {
  const selectors = [
    own(actual, "workspace"),
    own(actual, "path"),
    own(actual, "git"),
    own(actual, "registry"),
  ].filter(Boolean).length;
  if (selectors > 1) return false;
  if (expected.kind === "workspace")
    return actual.workspace === true && selectors === 1;
  if (expected.kind === "path")
    return actual.path === expected.path && selectors === 1;
  if (own(actual, "workspace") || own(actual, "path") || own(actual, "git"))
    return false;
  return (
    expected.registry === undefined || actual.registry === expected.registry
  );
}

function dependencyMatches(
  table: unknown,
  expected: ManifestDependencyExpectation,
  tableName:
    | "dependencies"
    | "dev-dependencies"
    | "build-dependencies"
    | "workspace.dependencies",
): boolean {
  if (!isTable(table) || !own(table, expected.name)) return false;
  const raw = (table as Record<string, unknown>)[expected.name];
  if (!validActualDependency(raw)) return false;
  if (
    tableName === "workspace.dependencies" &&
    isTable(raw) &&
    own(raw, "optional")
  )
    return false;
  const item: Record<string, unknown> =
    typeof raw === "string"
      ? { version: raw }
      : raw && typeof raw === "object" && !Array.isArray(raw)
        ? (raw as Record<string, unknown>)
        : {};
  const selectors = [
    own(item, "workspace"),
    own(item, "path"),
    own(item, "git"),
    own(item, "registry"),
  ].filter(Boolean).length;
  if (selectors > 1) return false;
  const inherited = item.workspace === true;
  if (
    typeof raw === "string" &&
    expected.package !== undefined &&
    expected.package !== expected.name
  )
    return false;
  if (
    expected.package !== undefined &&
    (item.package ?? expected.name) !== expected.package
  )
    return false;
  if (
    expected.version !== undefined &&
    !versionMatches(item.version, expected.version)
  )
    return false;
  if (expected.source !== undefined && !sourceMatches(item, expected.source))
    return false;
  if (
    expected.optional !== undefined &&
    (inherited
      ? !own(item, "optional") || item.optional !== expected.optional
      : (item.optional ?? false) !== expected.optional)
  )
    return false;
  if (
    expected.defaultFeatures !== undefined &&
    (inherited
      ? !own(item, "default-features") ||
        item["default-features"] !== expected.defaultFeatures
      : (item["default-features"] ?? true) !== expected.defaultFeatures)
  )
    return false;
  if (
    expected.features !== undefined &&
    !setMatches(
      inherited && !own(item, "features") ? undefined : (item.features ?? []),
      expected.features,
    )
  )
    return false;
  return true;
}

function validActualDependency(value: unknown): boolean {
  if (validName(value)) return true;
  if (!isTable(value)) return false;
  const item = value;
  const stringFields = ["package", "version", "path", "git", "registry"];
  if (stringFields.some((field) => own(item, field) && !validName(item[field])))
    return false;
  const booleanFields = ["workspace", "optional", "default-features"];
  if (
    booleanFields.some(
      (field) => own(item, field) && typeof item[field] !== "boolean",
    )
  )
    return false;
  return (
    !own(item, "features") ||
    (Array.isArray(item.features) && item.features.every(validName))
  );
}

function dependencyPackageAbsent(table: unknown, packageName: string): boolean {
  if (table === undefined) return true;
  if (!isTable(table)) return false;
  for (const [entryName, value] of Object.entries(table)) {
    if (!validName(entryName) || !validActualDependency(value)) return false;
    const canonical =
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      own(value, "package")
        ? (value as Record<string, unknown>).package
        : entryName;
    if (canonical === packageName) return false;
  }
  return true;
}

function equality(
  actual: unknown,
  expected: ManifestValue,
  arrayMode: "ordered" | "set" | undefined,
): boolean {
  if (Array.isArray(expected))
    return (
      Array.isArray(actual) &&
      (arrayMode === "set"
        ? setMatches(actual, { values: expected, mode: "equals" })
        : actual.length === expected.length &&
          actual.every((item, index) => item === expected[index]))
    );
  return typeof expected === "string"
    ? validString(actual) && actual === expected
    : actual === expected;
}

function assertionMatches(
  document: StaticDocument,
  assertion: ManifestAssertion,
): boolean {
  if (assertion.kind === "dependency-package-absent")
    return dependencyPackageAbsent(
      atPath(document, assertion.table.split(".")).value,
      assertion.package,
    );
  if (assertion.kind === "dependency")
    return dependencyMatches(
      atPath(document, assertion.table.split(".")).value,
      assertion.dependency,
      assertion.table,
    );
  if (assertion.kind === "feature-forwarding") {
    const packageName = atPath(document, ["package", "name"]);
    if (!packageName.exists || packageName.value !== assertion.package)
      return false;
    return setMatches(
      atPath(document, ["features", assertion.feature]).value,
      assertion.enables,
    );
  }
  const found = atPath(document, assertion.path);
  if (assertion.kind === "path-present") return found.exists;
  if (assertion.kind === "path-absent") return !found.exists;
  if (assertion.kind === "path-nonempty-string")
    return typeof found.value === "string" && found.value.length > 0;
  return (
    found.exists && equality(found.value, assertion.value, assertion.arrayMode)
  );
}

export function manifestSyntaxIssues(source: string): string[] {
  return parseDocument(source).issues;
}

export function checkManifestContract(
  source: string,
  contract: ManifestContract,
): ManifestContractCheck {
  const contractIssues = manifestContractIssues(contract);
  if (contractIssues.length)
    return { passed: false, feedback: contractIssues[0] };
  const parsed = parseDocument(source);
  if (parsed.issues.length)
    return { passed: false, feedback: parsed.issues[0] };
  const document = parsed.value!;
  if (
    contract.document === "workspace-root" &&
    (!isTable(document.workspace) || own(document, "package"))
  )
    return {
      passed: false,
      feedback: "Oczekiwano poprawnego manifestu korzenia workspace.",
    };
  if (contract.document === "package" && !isTable(document.package))
    return {
      passed: false,
      feedback: "Oczekiwano tabeli package w manifeście.",
    };
  const failed = contract.assertions.find(
    (assertion) => !assertionMatches(document, assertion),
  );
  return failed
    ? {
        passed: false,
        feedback: "Manifest nie spełnia jeszcze wszystkich wymagań kontraktu.",
      }
    : { passed: true, feedback: "Manifest spełnia kontrakt deklaracji." };
}
