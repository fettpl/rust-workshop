import assert from "node:assert/strict";
import { after, test } from "node:test";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
const helper = new URL("./verify-oss-provenance.mjs", import.meta.url);
const temporaryRoot = mkdtempSync(join(tmpdir(), "oss-provenance-"));
after(() => rmSync(temporaryRoot, { recursive: true, force: true }));
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
let serial = 0;
function fixture() {
  const root = join(temporaryRoot, String(serial++));
  const files = {
    "src/content/lesson.ts": "lesson bytes",
    "public/icon.svg": "svg bytes",
    "public/icon.png": "png bytes",
  };
  for (const [path, bytes] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), bytes);
  }
  const manifest = {
    schemaVersion: 1,
    scope: ["src/content/", "public/"],
    groups: [
      {
        id: "course",
        category: "course",
        origin: "maintainer-reported-ai",
        review: { status: "pending", evidence: ["docs/licensing.md"] },
      },
      {
        id: "icons",
        category: "asset",
        origin: "unresolved",
        review: { status: "pending", evidence: ["docs/licensing.md"] },
      },
    ],
    entries: Object.entries(files).map(([path, bytes]) => ({
      path,
      sha256: digest(bytes),
      group: path.startsWith("src/") ? "course" : "icons",
      ...(path.endsWith(".png")
        ? {
            derivedFrom: "public/icon.svg",
            generator: "scripts/setup-assets.mjs",
          }
        : {}),
    })),
    blockers: [
      {
        id: "course-source-review",
        group: "course",
        status: "open",
        reason: "Source and copying review pending.",
      },
      {
        id: "icon-rights",
        group: "icons",
        status: "open",
        reason: "Icon provenance unresolved.",
      },
    ],
  };
  return { root, manifest, trackedProvider: () => Object.keys(files) };
}
async function api() {
  return import(helper);
}
async function check(f, extra = {}) {
  return (await api()).verifyProvenance({ ...f, ...extra });
}
function save(f) {
  mkdirSync(join(f.root, "docs"), { recursive: true });
  writeFileSync(
    join(f.root, "docs/oss-provenance.json"),
    JSON.stringify(f.manifest),
  );
}
function cli(f, args = [], env = {}) {
  save(f);
  return spawnSync(process.execPath, [helper.pathname, ...args], {
    cwd: f.root,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
}
function sanitized(result, root) {
  const output = JSON.stringify(result);
  assert.ok(!output.includes(root));
  assert.ok(!output.includes("OUTSIDE_SECRET"));
}
test("structural pass retains rights blockers and release exit 2", async () => {
  const f = fixture();
  const result = await check(f);
  assert.equal(result.exitCode, 0);
  assert.equal(result.files, 3);
  assert.deepEqual(result.gates, ["course-source-review", "icon-rights"]);
  assert.equal((await check(f, { release: true })).exitCode, 2);
});
test("synthetic reviewed fixture satisfies scoped release only", async () => {
  const f = fixture();
  for (const g of f.manifest.groups) {
    g.review.status = "reviewed";
    g.review.evidence = ["docs/fixture-review.md"];
  }
  for (const b of f.manifest.blockers) b.status = "resolved";
  const result = await check(f, { release: true });
  assert.equal(result.exitCode, 0);
  assert.deepEqual(result.gates, []);
});
test("hash drift fails for course and SVG bytes", async () => {
  for (const path of ["src/content/lesson.ts", "public/icon.svg"]) {
    const f = fixture();
    writeFileSync(join(f.root, path), "changed");
    assert.equal((await check(f)).exitCode, 1);
  }
});
test("missing, added, removed, extra, duplicate and case-colliding coverage fails", async () => {
  for (const change of [
    (f) => f.manifest.entries.pop(),
    (f) =>
      (f.trackedProvider = () => [
        "src/content/lesson.ts",
        "public/icon.svg",
        "public/icon.png",
        "public/new.svg",
      ]),
    (f) => (f.trackedProvider = () => ["src/content/lesson.ts"]),
    (f) =>
      f.manifest.entries.push({
        ...f.manifest.entries[0],
        path: "public/extra.svg",
      }),
    (f) => f.manifest.entries.push(f.manifest.entries[0]),
    (f) =>
      f.manifest.entries.push({
        ...f.manifest.entries[0],
        path: "src/content/Lesson.ts",
      }),
  ]) {
    const f = fixture();
    change(f);
    assert.equal((await check(f)).exitCode, 1);
  }
});
test("untracked generated output does not expand tracked coverage", async () => {
  const f = fixture();
  writeFileSync(join(f.root, "public/generated.js"), "ignored");
  assert.equal((await check(f)).exitCode, 0);
});
test("schema, digest, status, dangling, orphan and cyclic references fail closed", async () => {
  for (const change of [
    (f) => (f.manifest.schemaVersion = 2),
    (f) => (f.manifest.scope = []),
    (f) => (f.manifest.entries[0].sha256 = "BAD"),
    (f) => (f.manifest.groups[0].review.status = "approved-by-model"),
    (f) => (f.manifest.entries[0].group = "missing"),
    (f) => (f.manifest.entries[2].derivedFrom = "public/missing.svg"),
    (f) => (f.manifest.entries[0].derivedFrom = f.manifest.entries[0].path),
    (f) => {
      f.manifest.entries[1].derivedFrom = "public/icon.png";
      f.manifest.entries[1].generator = "scripts/setup-assets.mjs";
    },
    (f) => f.manifest.groups.push({ ...f.manifest.groups[0], id: "orphan" }),
    (f) => (f.manifest.blockers = []),
    (f) => (f.manifest.blockers[0].status = "resolved"),
    (f) => (f.manifest.unrecognized = true),
  ]) {
    const f = fixture();
    change(f);
    assert.equal((await check(f)).exitCode, 1);
  }
});
test("unsafe selected and provider paths fail before content reads", async () => {
  for (const path of [
    "/OUTSIDE_SECRET",
    "../OUTSIDE_SECRET",
    "public/../OUTSIDE_SECRET",
    "public//icon.svg",
    "public/./icon.svg",
    "public\\icon.svg",
    "public/%2e%2e/OUTSIDE_SECRET",
    "public/a%2Fb",
    "public/a\u0000b",
    "src/content/",
  ])
    for (const provider of [false, true]) {
      const f = fixture();
      let reads = 0;
      if (provider) f.trackedProvider = () => [path];
      else f.manifest.entries[0].path = path;
      const result = await check(f, {
        readFile: () => {
          reads++;
          throw Error("OUTSIDE_SECRET");
        },
      });
      assert.equal(result.exitCode, 1);
      assert.equal(reads, 0);
      sanitized(result, f.root);
    }
});
test("symlink files and parents never reach content reader", async () => {
  const sentinel = join(temporaryRoot, "sentinel");
  writeFileSync(sentinel, "OUTSIDE_SECRET");
  for (const parent of [false, true]) {
    const f = fixture();
    const target = parent
      ? join(f.root, "src/content")
      : join(f.root, "src/content/lesson.ts");
    rmSync(target, { recursive: true, force: true });
    symlinkSync(parent ? temporaryRoot : sentinel, target);
    let reads = 0;
    const result = await check(f, {
      readFile: (...args) => {
        reads++;
        return readFileSync(...args);
      },
    });
    assert.equal(result.exitCode, 1);
    assert.equal(reads, 0);
    sanitized(result, f.root);
  }
});
test("provider failure, empty scope, unreadable and missing content fail safely", async () => {
  for (const extra of [
    {
      trackedProvider: () => {
        throw Error("OUTSIDE_SECRET");
      },
    },
    { trackedProvider: () => [] },
    {
      readFile: () => {
        throw Error("OUTSIDE_SECRET");
      },
    },
  ]) {
    const f = fixture();
    const result = await check(f, extra);
    assert.equal(result.exitCode, 1);
    sanitized(result, f.root);
  }
  const f = fixture();
  rmSync(join(f.root, "public/icon.png"));
  assert.equal((await check(f)).exitCode, 1);
});
test("CLI real Git provider, flags, missing Git and malformed input have exact exits", () => {
  const f = fixture();
  assert.equal(spawnSync("git", ["init", "-q"], { cwd: f.root }).status, 0);
  assert.equal(
    spawnSync("git", ["add", "--", "src/content", "public"], { cwd: f.root })
      .status,
    0,
  );
  for (const args of [[], ["--check"], ["--release"]]) {
    const r = cli(f, args);
    assert.equal(r.status, args[0] === "--release" ? 2 : 0);
    assert.match(r.stdout, /scoped rights: blocked/);
    sanitized(r.stdout + r.stderr, f.root);
  }
  for (const args of [
    ["--approve"],
    ["--check", "--release"],
    ["--release", "--release"],
  ])
    assert.equal(cli(f, args).status, 1);
  const noGit = cli(f, [], { PATH: "" });
  assert.equal(noGit.status, 1);
  sanitized(noGit.stdout + noGit.stderr, f.root);
  save(f);
  writeFileSync(join(f.root, "docs/oss-provenance.json"), "{OUTSIDE_SECRET");
  const malformed = spawnSync(process.execPath, [helper.pathname], {
    cwd: f.root,
    encoding: "utf8",
  });
  assert.equal(malformed.status, 1);
  sanitized(malformed.stdout + malformed.stderr, f.root);
});
test("manifest symlink is rejected before manifest reader", async () => {
  const f = fixture();
  save(f);
  const target = join(temporaryRoot, "private-manifest");
  writeFileSync(target, "OUTSIDE_SECRET");
  rmSync(join(f.root, "docs/oss-provenance.json"));
  symlinkSync(target, join(f.root, "docs/oss-provenance.json"));
  let reads = 0;
  const result = await (
    await api()
  ).runCli({
    root: f.root,
    args: [],
    readFile: () => {
      reads++;
      throw Error("OUTSIDE_SECRET");
    },
  });
  assert.equal(result.exitCode, 1);
  assert.equal(reads, 0);
  sanitized(result, f.root);
});
