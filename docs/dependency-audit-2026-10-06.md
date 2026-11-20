# Dependency audit remediation — 2026-10-06

This bounded maintenance milestone starts from `origin/main` commit
`7fd4238fee8fe2639b202d05ef70438a91beb2b9` in branch
`maintenance/dependency-audit-oct6`. It owns only the package manifest, npm
lockfile, CI workflow, the narrow audit helpers, their tracked policy/native
tests, and this report.
Course routes, authored content and evidence, Rust validators, editor/UI code,
and the README are outside its scope.

## Baseline

The clean main audit used Node `v22.23.3` and npm `10.9.9`:

```text
/opt/homebrew/opt/node@22/bin/npm audit --json
exit 1; 10 vulnerable package nodes: 8 high, 2 moderate, 0 critical
/opt/homebrew/opt/node@22/bin/npm audit --omit=dev --json
exit 1; 4 vulnerable package nodes: 2 high, 2 moderate, 0 critical
```

The raw baseline reports are retained outside the repository at
`<private-temp>/receipt-014` and
`<private-temp>/receipt-015`. The full report's
10 package nodes represent 10 lock records across 11 paths, not 10
independent exploits.

## Candidate remediation

The manifest now requires `sharp@^0.35.5`. The lockfile resolves:

- `sharp@0.35.5`, including its Linux native packages and `@img/sharp-libvips-*@1.3.4` entries;
- transitive production `source-map-js@1.2.2` through Next/PostCSS;
- both affected `brace-expansion` branches, `1.1.21` and `5.0.12`.

`braces@3.0.3` remains present in the Next/ESLint development chain because
the advisory currently has no patched release. Next remains on the 16.x line
and `eslint-config-next` remains 16.3.5 with the existing ESLint 9 parent. No
ESLint 10 upgrade, incompatible `eslint-config-next` downgrade, or broad
dependency update was introduced.

Monaco/editor remains unresolved in this milestone. `monaco-editor@0.56.0`
copies prebuilt browser assets containing DOMPurify 3.4.8 through
`scripts/setup-assets.mjs`; npm's 0.57.0 suggestion still carries prebuilt
DOMPurify 3.4.15, below the 3.4.16 patch for
[GHSA-6688-9rhm-gjv2](https://github.com/advisories/GHSA-6688-9rhm-gjv2).
An npm-level DOMPurify override would not prove the copied browser assets were
patched, so Monaco and its browser assets are deliberately unchanged.

Primary advisories:

- [GHSA-wq5f-xc86-pv6w](https://github.com/advisories/GHSA-wq5f-xc86-pv6w) — sharp;
- [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q) — source-map-js;
- [GHSA-q2hr-2g5m-vwhr](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr) — brace-expansion;
- [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) — unpatched braces;
- [GHSA-6688-9rhm-gjv2](https://github.com/advisories/GHSA-6688-9rhm-gjv2) — unresolved Monaco-bundled DOMPurify.
- [`npm audit` threshold behavior](https://docs.npmjs.com/cli/v10/commands/npm-audit/) — CI gate semantics.

## Blocking CI audit

The `audit:production` helper runs both `npm audit --json` and
`npm audit --omit=dev --audit-level=high --json`. It always writes
`full.json`, `production.json`, and `summary.json` under
`test-results/dependency-audit/`. The summary records each command's status,
the UTC timestamp, commit identity, package-lock SHA-256, threshold, parsed
counts, stderr, and validation errors. Malformed output, a registry/network
failure, an unavailable command, or a production non-zero status fails the
step. The full audit's vulnerability status remains informational, while its
report must still parse successfully. The existing pinned upload-artifact
action runs with `if: always()` so reports are retained after a blocking
failure; this does not change the failed status of the audit step.
The tracked `test:audit-production` policy test runs immediately after
`npm ci` and before the real audit. It exercises moderate-only success,
independent high/critical blocking, malformed count shapes, process failures,
registry errors, and retention of all three report files.
The same Linux job logs actual Sharp/libvips/librsvg versions and checks Sharp
`>=0.35.5` plus librsvg `>=2.63.2` before decoding a small SVG to PNG; the
runner check is the native Linux proof that local macOS Sharp output cannot
provide. A focused Node policy test covers lower, equal, higher, missing, and
malformed stable-version strings.

Candidate audit evidence after a clean install:

```text
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm ci
exit 0; postinstall regenerated public/icon-{192,512}.png and Monaco assets
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm run audit:production
exit 0
full:       exit 1, valid JSON, 5 high, 2 moderate, 0 critical
production: exit 0, valid JSON, 0 high, 2 moderate, 0 critical
```

The remaining production moderate records are the Monaco/DOMPurify chain. A
fresh candidate summary records commit `7fd4238fee8fe2639b202d05ef70438a91beb2b9`
and lockfile SHA-256
`2101a13c95b26dcfa705cf4bf051778c237aa98cc6be41733403effd826717e2`.

The helper's failure propagation was exercised with black-box audit fixtures:

```text
moderate fixture: full status 1, production status 0 -> helper exit 0; reports retained
high fixture:     full status 1, production status 1 -> helper exit 1; reports retained
malformed fixture: both invalid -> helper exit 1; reports retained with validation errors
```

These results demonstrate that moderate findings do not block the production
threshold, while high findings and registry/malformed responses do. This
milestone does not claim zero audit findings or whole-product safety.
