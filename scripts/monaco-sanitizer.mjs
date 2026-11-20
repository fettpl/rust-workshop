import { createHash } from "node:crypto";
import { readFile, writeFile, cp, readdir } from "node:fs/promises";
import { join } from "node:path";
import ts from "typescript";

export const contract = Object.freeze({
  monaco: "0.57.0",
  dompurify: "3.4.17",
  chunk: "editor-BdtEMBbM.js",
  module: "vs/editor-BdtEMBbM",
  source: "e1e745003eb416b7ca6a1956a333e6f8434ff48381824858cb63c99e9c8f8acf",
  factory: "ddeda54ce7838c34163b04d7a74e1c91c7358b65271133951db535290fe2574e",
  fixed: "cd37898f9782adf54820c413191b5691803f0f137c799d6edcfd38523b4c2c31",
  map: "3b8343cc326034b684098bc5f00628142d0544f4624c92c9b9c79adb78fd5d8e",
  license: "cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30",
  dependency: "./dompurify-fixed",
  parameter: "__workshopFixedDOMPurify",
});
export const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");
const requireThat = (condition, reason) => {
  if (!condition) throw new Error(`Monaco sanitizer contract: ${reason}`);
};
function parse(source) {
  const file = ts.createSourceFile(
    contract.chunk,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  requireThat(
    file.parseDiagnostics.length === 0,
    "JavaScript parse diagnostics",
  );
  return file;
}
function allNodes(file) {
  const nodes = [];
  function visit(node) {
    nodes.push(node);
    ts.forEachChild(node, visit);
  }
  visit(file);
  return nodes;
}
function moduleShape(file, repaired) {
  const calls = allNodes(file).filter(
    (n) =>
      ts.isCallExpression(n) &&
      ts.isIdentifier(n.expression) &&
      n.expression.text === "define",
  );
  requireThat(calls.length === 1, "unique AMD definition");
  const call = calls[0];
  requireThat(
    call.parent.parent === file && call.arguments.length === 3,
    "top-level AMD definition",
  );
  const [id, deps, wrapped] = call.arguments;
  const callback = ts.isParenthesizedExpression(wrapped)
    ? wrapped.expression
    : undefined;
  requireThat(
    ts.isStringLiteral(id) && id.text === contract.module,
    "AMD module ID",
  );
  requireThat(
    ts.isArrayLiteralExpression(deps) &&
      callback &&
      ts.isFunctionExpression(callback),
    "AMD dependency/callback layout",
  );
  const expected = [
    "require",
    "exports",
    "./editorWorkerHost-B_VpI68A",
    ...(repaired ? [contract.dependency] : []),
  ];
  requireThat(
    deps.elements.length === expected.length &&
      deps.elements.every(
        (n, i) => ts.isStringLiteral(n) && n.text === expected[i],
      ),
    "AMD dependencies",
  );
  const params = [
    "require",
    "C",
    "l",
    ...(repaired ? [contract.parameter] : []),
  ];
  requireThat(
    callback.parameters.length === params.length &&
      callback.parameters.every(
        (n, i) =>
          ts.isIdentifier(n.name) &&
          n.name.text === params[i] &&
          !n.initializer &&
          !n.dotDotDotToken,
      ),
    "AMD parameters",
  );
  return { deps, callback };
}
// Structural inspector is separately testable; the production transform always also gates full byte hashes.
export function inspectOriginal(source) {
  const file = parse(source),
    nodes = allNodes(file);
  const { deps, callback } = moduleShape(file, false);
  const ids = (name) =>
    nodes.filter((n) => ts.isIdentifier(n) && n.text === name);
  requireThat(
    ids(contract.parameter).length === 0,
    "injected identifier collision",
  );
  const factories = nodes.filter(
    (n) => ts.isFunctionDeclaration(n) && n.name?.text === "GR",
  );
  requireThat(factories.length === 1, "unique factory declaration");
  const factory = factories[0];
  requireThat(factory.parent === callback.body, "factory callback scope");
  const declarations = nodes.filter(
    (n) =>
      ts.isVariableDeclaration(n) &&
      ts.isIdentifier(n.name) &&
      n.name.text === "Ku",
  );
  requireThat(declarations.length === 1, "unique singleton declaration");
  const singleton = declarations[0],
    init = singleton.initializer;
  requireThat(
    singleton.parent.parent.parent === callback.body,
    "singleton callback scope",
  );
  requireThat(
    init &&
      ts.isCallExpression(init) &&
      ts.isIdentifier(init.expression) &&
      init.expression.text === "GR" &&
      init.arguments.length === 0,
    "singleton zero-argument initializer",
  );
  const refs = ids("GR");
  requireThat(
    refs.length === 3 &&
      refs.every(
        (n) =>
          n === factory.name ||
          n === init.expression ||
          (n.pos >= factory.pos &&
            n.end <= factory.end &&
            ts.isCallExpression(n.parent) &&
            n.parent.expression === n),
      ),
    "factory aliases or external references",
  );
  const uses = ids("Ku").filter((n) => n !== singleton.name);
  const methods = uses
    .map((n) =>
      ts.isPropertyAccessExpression(n.parent) &&
      n.parent.expression === n &&
      ts.isCallExpression(n.parent.parent) &&
      n.parent.parent.expression === n.parent
        ? n.parent.name.text
        : "INVALID",
    )
    .sort();
  requireThat(
    JSON.stringify(methods) ===
      JSON.stringify(
        ["addHook", "addHook", "addHook", "removeAllHooks", "sanitize"].sort(),
      ),
    "singleton aliases/writes or changed methods",
  );
  requireThat(
    !source.includes("sourceMappingURL"),
    "unsupported source map trailer",
  );
  return { file, deps, callback, factory, singleton, init };
}
export function transformMonaco(source, fixed) {
  requireThat(sha256(source) === contract.source, "upstream chunk hash drift");
  requireThat(
    sha256(fixed) === contract.fixed,
    "official fixed artifact hash drift",
  );
  const { file, deps, callback, factory, init } = inspectOriginal(source);
  requireThat(
    sha256(source.slice(factory.getStart(file), factory.end)) ===
      contract.factory,
    "factory hash drift",
  );
  const edits = [
    [factory.getStart(file), factory.end, ""],
    [init.getStart(file), init.end, contract.parameter],
    [deps.end - 1, deps.end - 1, `,"${contract.dependency}"`],
    [
      callback.parameters.end,
      callback.parameters.end,
      `,${contract.parameter}`,
    ],
  ].sort((a, b) => a[0] - b[0]);
  let cursor = 0,
    output = "";
  for (const [start, end, replacement] of edits) {
    requireThat(start >= cursor, "overlapping edits");
    output += source.slice(cursor, start) + replacement;
    cursor = end;
  }
  output += source.slice(cursor);
  // Independently replay disjoint spans from output, proving every unedited byte survived.
  let sourceAt = 0,
    outputAt = 0;
  for (const [start, end, replacement] of edits) {
    const length = start - sourceAt;
    requireThat(
      output.slice(outputAt, outputAt + length) ===
        source.slice(sourceAt, start),
      "unedited byte drift",
    );
    outputAt += length;
    requireThat(
      output.slice(outputAt, outputAt + replacement.length) === replacement,
      "edit replay mismatch",
    );
    outputAt += replacement.length;
    sourceAt = end;
  }
  requireThat(
    output.slice(outputAt) === source.slice(sourceAt),
    "unedited suffix drift",
  );
  verifyGenerated(output);
  return output;
}
export function verifyGenerated(source) {
  const file = parse(source),
    nodes = allNodes(file);
  moduleShape(file, true);
  requireThat(
    !nodes.some((n) => ts.isIdentifier(n) && n.text === "GR"),
    "old factory remains",
  );
  const declarations = nodes.filter(
    (n) =>
      ts.isVariableDeclaration(n) &&
      ts.isIdentifier(n.name) &&
      n.name.text === "Ku",
  );
  requireThat(
    declarations.length === 1 &&
      ts.isIdentifier(declarations[0].initializer) &&
      declarations[0].initializer.text === contract.parameter,
    "fixed singleton initializer",
  );
  const injected = nodes.filter(
    (n) => ts.isIdentifier(n) && n.text === contract.parameter,
  );
  requireThat(injected.length === 2, "fixed singleton reference count");
}
function unparenthesized(node) {
  while (node && ts.isParenthesizedExpression(node)) node = node.expression;
  return node;
}
export function checkMonacoImports(source, filename = "source.ts") {
  const file = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  for (const n of allNodes(file)) {
    const callee = ts.isCallExpression(n)
      ? unparenthesized(n.expression)
      : undefined;
    let specifier,
      typeOnly = false;
    if (ts.isImportDeclaration(n)) {
      specifier = n.moduleSpecifier;
      const c = n.importClause;
      typeOnly =
        !!c &&
        (c.isTypeOnly ||
          (!c.name &&
            !!c.namedBindings &&
            ts.isNamedImports(c.namedBindings) &&
            c.namedBindings.elements.length > 0 &&
            c.namedBindings.elements.every((e) => e.isTypeOnly)));
    } else if (
      ts.isImportEqualsDeclaration(n) &&
      ts.isExternalModuleReference(n.moduleReference)
    ) {
      specifier = n.moduleReference.expression;
      typeOnly = n.isTypeOnly;
    } else if (ts.isExportDeclaration(n)) {
      specifier = n.moduleSpecifier;
      typeOnly =
        n.isTypeOnly ||
        (!!n.exportClause &&
          ts.isNamedExports(n.exportClause) &&
          n.exportClause.elements.length > 0 &&
          n.exportClause.elements.every((e) => e.isTypeOnly));
    } else if (
      ts.isCallExpression(n) &&
      (callee.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(callee) && callee.text === "require"))
    )
      specifier = n.arguments[0];
    specifier = unparenthesized(specifier);
    if (
      specifier &&
      ts.isStringLiteralLike(specifier) &&
      /^monaco-editor(?:\/|$)/.test(specifier.text)
    )
      requireThat(typeOnly, `runtime Monaco value import in ${filename}`);
  }
}
export async function guardAppImports(root) {
  for (const item of await readdir(root, { withFileTypes: true })) {
    const path = join(root, item.name);
    if (item.isDirectory()) await guardAppImports(path);
    else if (/\.[cm]?[jt]sx?$/.test(item.name))
      checkMonacoImports(await readFile(path, "utf8"), path);
  }
}
export async function adaptMonaco(stagingRoot, sourceRoot, sanitizerRoot) {
  const monaco = JSON.parse(
    await readFile(join(sourceRoot, "package.json"), "utf8"),
  );
  const sanitizer = JSON.parse(
    await readFile(join(sanitizerRoot, "package.json"), "utf8"),
  );
  requireThat(
    monaco.version === contract.monaco &&
      sanitizer.version === contract.dompurify,
    "package versions",
  );
  const source = await readFile(
    join(stagingRoot, "vs", contract.chunk),
    "utf8",
  );
  const fixed = await readFile(join(sanitizerRoot, "dist/purify.min.js"));
  const output = transformMonaco(source, fixed);
  for (const [input, destination, expected] of [
    ["dist/purify.min.js", "vs/dompurify-fixed.js", contract.fixed],
    ["dist/purify.min.js.map", "vs/purify.min.js.map", contract.map],
    ["LICENSE", "DOMPurify-LICENSE", contract.license],
  ]) {
    requireThat(
      sha256(await readFile(join(sanitizerRoot, input))) === expected,
      `${input} hash drift`,
    );
    await cp(join(sanitizerRoot, input), join(stagingRoot, destination));
  }
  await writeFile(join(stagingRoot, "vs", contract.chunk), output);
  await writeFile(
    join(stagingRoot, "sanitizer-provenance.json"),
    JSON.stringify(
      {
        monaco: contract.monaco,
        dompurify: contract.dompurify,
        source: {
          path: `min/vs/${contract.chunk}`,
          sha256: contract.source,
          factorySha256: contract.factory,
        },
        fixed: { path: "vs/dompurify-fixed.js", sha256: contract.fixed },
        output: { path: `vs/${contract.chunk}`, sha256: sha256(output) },
        adaptation:
          "Complete embedded factory removed; Ku consumes the official AMD singleton. Dormant installed ESM is unchanged.",
      },
      null,
      2,
    ) + "\n",
  );
}
