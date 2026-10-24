# Monaco sanitizer dependency maintenance

The application uses Monaco 0.57.0 through its local AMD loader at `/monaco/vs`.
The package vendors an affected DOMPurify factory in the published editor chunk;
an npm override alone does not replace those embedded bytes. Asset preparation
removes the complete reviewed factory and imports the unchanged official
DOMPurify 3.4.17 UMD AMD singleton. All surrounding Monaco sanitizer hooks and
cleanup remain byte-identical. The direct dependency and parent-scoped override
also repair the package graph. Existing TypeScript is a production dependency
because the postinstall asset parser needs it, including with development
packages omitted; its version requirement is unchanged. The existing unchanged
`sharp` requirement is also a production dependency because postinstall generates
icons; both normal and development-omitted locked installations are verified.

`scripts/monaco-sanitizer.mjs` gates exact package versions, source/factory and
fixed-artifact hashes, AMD structure, references and allowed edit spans. Drift
fails installation rather than guessing new private boundaries. It validates a
complete staging tree, promotes via directory renames and rolls back ordinary
promotion failures. This is transactional promotion with a visibility window,
not a crash-safe atomic multi-directory swap. A failed rollback retains the
complete previous tree at the backup path reported in the error.

The generated relative-path-only `sanitizer-provenance.json` records source,
fixed and generated hashes. Official Monaco notices and DOMPurify license,
artifact headers and map are copied unchanged. Regeneration needs no network.
The exact frozen official artifact hash must receive review when updated.

This adaptation repairs the served AMD distribution only. Installed
`monaco-editor/esm` remains upstream stock and must not be consumed at runtime.
A source AST policy rejects static literal package/ESM value imports, re-exports,
`import()` and `require()`, including mixed imports and import-equals. Genuine
type-only imports are allowed. The policy does not prove the absence of arbitrary
computed imports; browser request evidence independently verifies delivery.

Remove the adaptation and scoped override only after a released Monaco version
ships a verified fixed sanitizer in the actual served distribution. Review new
upstream bytes and run graph audits, locked reinstall, asset mutation/rollback
checks, actual-instance browser probes, editor E2E and offline migration.
The harmless shadow-root probe establishes replacement of affected runtime; it
does not establish that the advisory configuration is reachable in this app.
Test instrumentation exists only in browser test route responses and never in
public production assets.

Service-worker reads use only the active cache generation. Activation removes
older generations, and stale in-flight handlers may recreate them without
influencing current reads. Already evaluated JavaScript in open tabs requires
a subsequent controlled reload; the repair never forces a reload or discards
learner drafts. Browser tests exercise controlled reload and offline repair.


## Current dependency refresh and compatibility holds

The 24 October 2026 refresh uses Tokio 1.54.1 in current authored archives and
in the closed native fixture profile. It addresses
[RUSTSEC-2026-0386](https://rustsec.org/advisories/RUSTSEC-2026-0386.html)
(the `AsyncFd` constructor I/O-safety issue affecting 1.53.1). The authored
sources do not call those constructors. Tokio 1.54.0 is separately affected by
[RUSTSEC-2026-0384](https://rustsec.org/advisories/RUSTSEC-2026-0384.html);
1.54.1 fixes both. Exact Rust 1.85 remains the MSRV. The old fixture metadata
retains its original target and cannot enter the current native execution
inventory. Historical receipts, source snapshots and dated Playground
inspection records retain their original bytes and scope.

Compatible npm updates include React/React DOM 19.3.1, Lucide 1.61.0, Zod
4.6.7, Playwright 1.64.1, axe-core 4.14.0, Vitest 5.0.5 and Vite 8.3.5.
Number Guessing uses rand 0.10.3. Current versions and registry integrity are
recorded in the lockfiles; registry freshness and advisory checks must be
repeated before subsequent releases.

Some latest stable releases cannot be adopted without a separate migration:

- TypeScript 7.0.2 replaces the classic compiler API used by the reviewed
  sanitizer adaptation with unstable API exports. The latest
  `typescript-eslint` 8.72.0 also requires TypeScript below 6.1. Keep 6.0.3
  until both the parser adaptation and lint stack have a reviewed migration.
- ESLint 9.39.5 is unsupported upstream. ESLint 10.13.0 conflicts with the
  latest `eslint-plugin-react`, `eslint-plugin-jsx-a11y` and
  `eslint-plugin-import` peer ranges consumed by `eslint-config-next` 16.4.3.
  This tooling support gap remains explicit; do not force peer resolution,
  suppress checks or claim that a zero-advisory result restores support.
- Node type declarations stay on the Node 22 line because Node 22.23.4 is
  supported; Node 26 declarations could admit unsupported runtime APIs.
- Criterion 0.8.2 requires Rust 1.86, proptest 1.12.0 requires 1.88, and
  rusqlite 0.41.0 requires 1.89. The current 0.5.1, 1.11.0 and 0.40.2 pins
  preserve the Rust 1.85 qualification and historical benchmark contracts.
  Other non-current transitive versions follow their parent package ranges;
  an older major alone is not evidence of a vulnerability.

Audit the full and production npm graphs, the actual served Monaco bytes and
its dormant installed ESM, and every registry crate in authored Cargo
lockfiles. Match public RustSec patched and unaffected ranges, include
informational unsoundness advisories, and check official registry checksums
and yanks. A zero npm audit result covers that advisory database and graph;
it does not establish freshness, repaired vendored bytes or universal safety.
No Python or PHP dependency manifests, source imports or runtime programs are
part of this repository's current dependency surface. Do not infer a project
dependency from an upstream news item or upgrade host tools as remediation.

The declared Node engines require `^22.23.4 || ^24.22.1 || ^26.12.1`, the
patched releases identified by the official
[21 October 2026 security notice](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases).
This excludes earlier affected releases and unsupported odd release lines.
`engines` is a declaration; npm normally warns rather than enforcing a hard
refusal. CI resolves the latest Node 22 release with `check-latest: true`.
These dated minimums require future advisory review; they are not a perpetual
security guarantee.

## Bundled native components

Sharp 0.35.5's installed macOS arm64 distribution reports libvips 8.18.7 and
librsvg 2.63.2. The former is beyond the fixed ranges in the published
[libvips advisories](https://github.com/libvips/libvips/security/advisories);
[librsvg's release notes](https://github.com/GNOME/librsvg/blob/main/NEWS)
identify 2.63.2 as the fix for RUSTSEC-2026-0305 / CVE-2026-96889. Platform
packages can carry different native builds, so retain their upstream notices
and inspect the actual target platform before distributing a binary.

The authored SQLite workspace uses rusqlite 0.40.2 and libsqlite3-sys 0.38.2
with bundled SQLite 3.53.2. The official
[SQLite CVE table](https://sqlite.org/cves.html) lists 3.53.2 as the fix for
CVE-2026-11822 and CVE-2026-11824. Later SQLite maintenance releases exist;
this is an explicit freshness hold, not a claim that the C library is latest.
The latest rusqlite 0.41.0 / libsqlite3-sys 0.39.0 pair requires Rust 1.89 /
1.88, beyond the project's 1.85 MSRV. Do not replace a bundled C source file
or force an incompatible sys-crate to disguise that constraint. RustSec
matching on Rust crate names alone does not audit bundled C libraries.
