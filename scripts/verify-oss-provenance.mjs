import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const SCOPE = ["src/content/", "public/"];
const MANIFEST = "docs/oss-provenance.json";
const id = (value) =>
  typeof value === "string" && /^[a-z][a-z0-9-]{0,47}$/.test(value);
const object = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const canonical = (value) =>
  typeof value === "string" &&
  value.length <= 240 &&
  value
    .split("/")
    .every(
      (part) => /^[A-Za-z0-9_.-]+$/.test(part) && part !== "." && part !== "..",
    );
const scoped = (value) =>
  canonical(value) && SCOPE.some((prefix) => value.startsWith(prefix));
class Invalid extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}
function requireValid(condition, code) {
  if (!condition) throw new Invalid(code);
}
function keys(value, required, optional = []) {
  requireValid(
    object(value) &&
      required.every((key) => Object.hasOwn(value, key)) &&
      Object.keys(value).every((key) =>
        [...required, ...optional].includes(key),
      ),
    "schema",
  );
}
function finiteArray(value, minimum, maximum) {
  requireValid(
    Array.isArray(value) && value.length >= minimum && value.length <= maximum,
    "schema",
  );
}

// Pure validation: no filesystem access and no raw input in diagnostics.
export function validateManifest(manifest) {
  try {
    keys(manifest, ["schemaVersion", "scope", "groups", "entries", "blockers"]);
    requireValid(
      manifest.schemaVersion === 1 &&
        JSON.stringify(manifest.scope) === JSON.stringify(SCOPE),
      "schema",
    );
    finiteArray(manifest.groups, 1, 64);
    finiteArray(manifest.entries, 1, 10000);
    finiteArray(manifest.blockers, 0, 64);
    const groups = new Map();
    for (const group of manifest.groups) {
      keys(group, ["id", "category", "origin", "review"]);
      requireValid(id(group.id) && !groups.has(group.id), "group");
      requireValid(
        ["course", "asset", "software"].includes(group.category) &&
          [
            "maintainer-reported-ai",
            "unresolved",
            "repository-software",
          ].includes(group.origin),
        "group",
      );
      keys(group.review, ["status", "evidence"]);
      requireValid(
        ["pending", "reviewed", "not-applicable"].includes(group.review.status),
        "review",
      );
      requireValid(
        group.review.status !== "not-applicable" ||
          (group.category === "software" &&
            group.origin === "repository-software"),
        "review",
      );
      finiteArray(group.review.evidence, 1, 16);
      requireValid(group.review.evidence.every(canonical), "review");
      groups.set(group.id, group);
    }
    const entries = new Map();
    const folded = new Set();
    const used = new Set();
    for (const entry of manifest.entries) {
      keys(entry, ["path", "sha256", "group"], ["derivedFrom", "generator"]);
      requireValid(scoped(entry.path), "path");
      requireValid(!folded.has(entry.path.toLowerCase()), "duplicate-path");
      requireValid(
        typeof entry.sha256 === "string" && /^[a-f0-9]{64}$/.test(entry.sha256),
        "digest",
      );
      requireValid(groups.has(entry.group), "group-reference");
      requireValid(
        Object.hasOwn(entry, "derivedFrom") ===
          Object.hasOwn(entry, "generator"),
        "derivation",
      );
      if (Object.hasOwn(entry, "derivedFrom"))
        requireValid(
          scoped(entry.derivedFrom) &&
            entry.generator === "scripts/setup-assets.mjs",
          "derivation",
        );
      entries.set(entry.path, entry);
      folded.add(entry.path.toLowerCase());
      used.add(entry.group);
    }
    requireValid(groups.size === used.size, "orphan-group");
    const done = new Set();
    function visit(path, active = new Set()) {
      requireValid(entries.has(path), "derivation-reference");
      requireValid(!active.has(path), "derivation-cycle");
      if (done.has(path)) return;
      const entry = entries.get(path);
      if (entry.derivedFrom) {
        active.add(path);
        visit(entry.derivedFrom, active);
        active.delete(path);
      }
      done.add(path);
    }
    for (const path of entries.keys()) visit(path);
    const blockers = new Set();
    const openGroups = new Set();
    for (const blocker of manifest.blockers) {
      keys(blocker, ["id", "group", "status", "reason"]);
      requireValid(
        id(blocker.id) &&
          !blockers.has(blocker.id) &&
          groups.has(blocker.group),
        "blocker",
      );
      requireValid(
        ["open", "resolved"].includes(blocker.status) &&
          typeof blocker.reason === "string" &&
          blocker.reason.length > 0 &&
          blocker.reason.length <= 500,
        "blocker",
      );
      requireValid(
        (blocker.status === "open") ===
          (groups.get(blocker.group).review.status === "pending"),
        "blocker-state",
      );
      if (blocker.status === "open") openGroups.add(blocker.group);
      blockers.add(blocker.id);
    }
    requireValid(
      [...groups.values()].every(
        (group) =>
          group.review.status !== "pending" || openGroups.has(group.id),
      ),
      "missing-blocker",
    );
    return { valid: true, errors: [] };
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Invalid ? error.code : "schema"],
    };
  }
}

// Fixed source provider; failures must propagate rather than become empty success.
export function trackedFiles(root) {
  const output = execFileSync(
    "git",
    ["ls-files", "-z", "--", "src/content", "public"],
    {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 4 * 1024 * 1024,
    },
  );
  requireValid(output.endsWith("\0"), "tracked-provider");
  return output.slice(0, -1).split("\0");
}
function safeFile(root, relative) {
  requireValid(canonical(relative), "path");
  const parts = relative.split("/");
  let current = root;
  for (let index = 0; index < parts.length; index++) {
    current = join(current, parts[index]);
    let info;
    try {
      info = lstatSync(current);
    } catch {
      throw new Invalid("file-access");
    }
    requireValid(!info.isSymbolicLink(), "symlink");
    requireValid(
      index === parts.length - 1 ? info.isFile() : info.isDirectory(),
      "file-type",
    );
    if (index === parts.length - 1)
      requireValid(info.size <= 20 * 1024 * 1024, "file-size");
  }
  return current;
}
const invalid = (code) => ({
  exitCode: 1,
  files: 0,
  gates: [],
  errors: [code],
});
export async function verifyProvenance({
  root,
  manifest,
  trackedProvider = trackedFiles,
  readFile = readFileSync,
  release = false,
}) {
  const validation = validateManifest(manifest);
  if (!validation.valid) return invalid(validation.errors[0]);
  try {
    const canonicalRoot = realpathSync(root);
    let tracked;
    try {
      tracked = await trackedProvider(canonicalRoot);
    } catch {
      throw new Invalid("tracked-provider");
    }
    finiteArray(tracked, 1, 10000);
    requireValid(tracked.every(scoped), "tracked-path");
    requireValid(
      new Set(tracked.map((path) => path.toLowerCase())).size ===
        tracked.length,
      "tracked-duplicate",
    );
    requireValid(
      SCOPE.every((prefix) => tracked.some((path) => path.startsWith(prefix))),
      "tracked-scope",
    );
    const inventory = manifest.entries.map((entry) => entry.path).sort();
    requireValid(
      JSON.stringify([...tracked].sort()) === JSON.stringify(inventory),
      "coverage",
    );
    // Preflight the whole inventory before reading any selected content.
    const paths = new Map(
      inventory.map((path) => [path, safeFile(canonicalRoot, path)]),
    );
    for (const entry of [...manifest.entries].sort((a, b) =>
      a.path < b.path ? -1 : a.path > b.path ? 1 : 0,
    )) {
      let bytes;
      try {
        bytes = readFile(paths.get(entry.path));
      } catch {
        throw new Invalid("file-read");
      }
      requireValid(
        createHash("sha256").update(bytes).digest("hex") === entry.sha256,
        "hash-drift",
      );
    }
    const gates = manifest.blockers
      .filter((blocker) => blocker.status === "open")
      .map((blocker) => blocker.id)
      .sort();
    return {
      exitCode: release && gates.length ? 2 : 0,
      files: inventory.length,
      gates,
      errors: [],
    };
  } catch (error) {
    return invalid(error instanceof Invalid ? error.code : "infrastructure");
  }
}
export async function runCli({
  root = process.cwd(),
  args = process.argv.slice(2),
  trackedProvider,
  readFile = readFileSync,
} = {}) {
  if (
    args.length > 1 ||
    (args.length === 1 && !["--check", "--release"].includes(args[0]))
  )
    return invalid("flags");
  let manifest;
  try {
    manifest = JSON.parse(
      readFile(safeFile(realpathSync(root), MANIFEST), "utf8"),
    );
  } catch (error) {
    return invalid(error instanceof Invalid ? error.code : "manifest-read");
  }
  return verifyProvenance({
    root,
    manifest,
    trackedProvider,
    readFile,
    release: args[0] === "--release",
  });
}
export function formatResult(result) {
  if (result.exitCode === 1)
    return `provenance invalid: ${result.errors.join(",")}\n`;
  return `scoped inventory: valid; files: ${result.files}\nscoped rights: ${result.gates.length ? `blocked; gates: ${result.gates.join(",")}` : "review dispositions recorded"}\nScoped provenance checks only; no global OSS approval or publication authorization.\n`;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const result = await runCli();
  process.stdout.write(formatResult(result));
  process.exitCode = result.exitCode;
}
