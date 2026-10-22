import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { performance } from "node:perf_hooks";

const output = {
  schema: "initialized-prefix-canonical-path-probe-v1",
  status: "missing-input",
  nativeAvailable: typeof realpathSync.native === "function",
  qualifiedInputCount: 0,
  comparedCount: 0,
  fixtureCount: 0,
  mismatchCount: 0,
  jsErrors: 0,
  nativeErrors: 0,
  jsElapsedMs: 0,
  nativeElapsedMs: 0,
};

const outcome = (resolver, input) => {
  try {
    return { ok: true, value: resolver(resolve(input)) };
  } catch (error) {
    return {
      ok: false,
      code:
        error && typeof error === "object" && "code" in error
          ? String(error.code)
          : "error",
    };
  }
};

const sameOutcome = (left, right) =>
  left.ok === right.ok &&
  (left.ok ? left.value === right.value : left.code === right.code);

const makeFixtures = () => {
  const root = mkdtempSync(join(tmpdir(), "initialized-prefix-path-probe-"));
  try {
    const inside = join(root, "inside");
    const nested = join(inside, "nested");
    const outside = join(root, "outside");
    mkdirSync(nested, { recursive: true });
    mkdirSync(outside, { recursive: true });
    writeFileSync(join(inside, "file.txt"), "inside\n");
    writeFileSync(join(nested, "file.txt"), "nested\n");
    writeFileSync(join(outside, "file.txt"), "outside\n");
    const unicode = join(inside, "unicode-✓.txt");
    writeFileSync(unicode, "unicode\n");
    const symlinkFile = join(root, "symlink-file");
    const symlinkDirectory = join(root, "symlink-directory");
    const broken = join(root, "broken");
    const loopA = join(root, "loop-a");
    const loopB = join(root, "loop-b");
    const nestedLink = join(root, "nested-link");
    const missingLeaf = join(root, "missing-leaf");
    symlinkSync(join(inside, "file.txt"), symlinkFile);
    symlinkSync(nested, symlinkDirectory, "dir");
    symlinkSync(nested, nestedLink, "dir");
    symlinkSync(join(root, "missing"), broken);
    symlinkSync(loopB, loopA);
    symlinkSync(loopA, loopB);
    let longChain = join(inside, "file.txt");
    for (let index = 0; index < 64; index += 1) {
      const link = join(root, `long-chain-${index}`);
      symlinkSync(longChain, link);
      longChain = link;
    }
    return {
      root,
      inputs: [
        inside,
        join(inside, "file.txt"),
        join(root, "inside", "..", "inside", "file.txt"),
        join(outside, "file.txt"),
        missingLeaf,
        symlinkFile,
        symlinkDirectory,
        join(nestedLink, "file.txt"),
        broken,
        loopA,
        longChain,
        unicode,
      ],
    };
  } catch (error) {
    rmSync(root, { recursive: true, force: true });
    throw error;
  }
};

const run = () => {
  const manifestPath = process.argv[2];
  if (typeof manifestPath !== "string" || manifestPath.length === 0) return;
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(resolve(manifestPath), "utf8"));
  } catch {
    output.status = existsSync(resolve(manifestPath))
      ? "invalid-manifest"
      : "missing-input";
    return;
  }
  if (
    !manifest ||
    typeof manifest !== "object" ||
    Array.isArray(manifest) ||
    !Array.isArray(manifest.files)
  ) {
    output.status = "invalid-manifest";
    return;
  }
  const qualified = Array.isArray(manifest.files)
    ? manifest.files
        .map((entry) =>
          entry && typeof entry.path === "string" ? entry.path : undefined,
        )
        .filter((path) => path !== undefined && existsSync(path))
        .sort()
        .slice(0, 256)
    : [];
  output.qualifiedInputCount = qualified.length;
  const fixtures = makeFixtures();
  try {
    output.fixtureCount = fixtures.inputs.length;
    const inputs = [...qualified, ...fixtures.inputs];
    if (output.nativeAvailable) {
      for (const input of inputs) {
        const javascript = outcome(realpathSync, input);
        const native = outcome(realpathSync.native, input);
        output.comparedCount += 1;
        if (!javascript.ok) output.jsErrors += 1;
        if (!native.ok) output.nativeErrors += 1;
        if (!sameOutcome(javascript, native)) output.mismatchCount += 1;
      }
      const timedInputs = inputs.slice(0, 256);
      const loops = 20;
      let started = performance.now();
      for (let loop = 0; loop < loops; loop += 1)
        for (const input of timedInputs) outcome(realpathSync, input);
      output.jsElapsedMs = performance.now() - started;
      started = performance.now();
      for (let loop = 0; loop < loops; loop += 1)
        for (const input of timedInputs) outcome(realpathSync.native, input);
      output.nativeElapsedMs = performance.now() - started;
    }
    output.status = output.nativeAvailable ? "completed" : "native-unavailable";
  } finally {
    rmSync(fixtures.root, { recursive: true, force: true });
  }
};

try {
  run();
} catch {
  // This probe is observational. A malformed optional input must not change
  // native proof selection or acceptance; the finite result is enough.
  output.status = "probe-error";
}
process.stdout.write(`${JSON.stringify(output)}\n`);
