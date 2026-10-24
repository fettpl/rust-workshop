# Third-party notices (draft)

This inventory accompanies the mixed-license source-release draft. The license
split and project credit are approved; the inventory remains a release draft
pending provenance and public-release review. It is based on the locked
dependency graph on 24 October 2026. The proposed release
surface is the source repository, authored Cargo project archives, and the
published audit surface; no hosted deployment, compiled browser application,
`.next` directory, or `node_modules` tree is being published in this
milestone. This file does not replace the license or notice shipped by an
upstream package, and the repository's [`LICENSE`](LICENSE) and
[`LICENSE-CONTENT`](LICENSE-CONTENT) do not override those rights.

## Direct packages

The direct packages in `package.json` currently report these licenses in
`package-lock.json`:

| Package | Version | License | Upstream |
| --- | ---: | --- | --- |
| `@monaco-editor/react` | 4.7.0 | MIT | <https://github.com/suren-atoyan/monaco-react> |
| `dompurify` | 3.4.17 | MPL-2.0 OR Apache-2.0 | <https://github.com/cure53/DOMPurify> |
| `idb` | 8.0.4 | ISC | <https://github.com/jakearchibald/idb> |
| `lucide-react` | 1.61.0 | ISC | <https://github.com/lucide-icons/lucide> |
| `monaco-editor` | 0.57.0 | MIT | <https://github.com/microsoft/monaco-editor> |
| `next` | 16.4.3 | MIT | <https://github.com/vercel/next.js> |
| `react` | 19.3.1 | MIT | <https://github.com/facebook/react> |
| `react-dom` | 19.3.1 | MIT | <https://github.com/facebook/react> |
| `toml-eslint-parser` | 1.0.3 | MIT | <https://github.com/ota-meshi/toml-eslint-parser> |
| `zod` | 4.6.7 | MIT | <https://github.com/colinhacks/zod> |
| `@axe-core/playwright` | 4.14.0 | MPL-2.0 | <https://github.com/dequelabs/axe-core-npm> |
| `@playwright/test` | 1.64.1 | Apache-2.0 | <https://github.com/microsoft/playwright> |
| `@tailwindcss/postcss` | 4.3.3 | MIT | <https://github.com/tailwindlabs/tailwindcss> |
| `@types/node` | 22.20.5 | MIT | <https://github.com/DefinitelyTyped/DefinitelyTyped> |
| `@types/react` | 19.3.0 | MIT | <https://github.com/DefinitelyTyped/DefinitelyTyped> |
| `@types/react-dom` | 19.3.0 | MIT | <https://github.com/DefinitelyTyped/DefinitelyTyped> |
| `eslint` | 9.39.5 | MIT | <https://github.com/eslint/eslint> |
| `eslint-config-next` | 16.4.3 | MIT | <https://github.com/vercel/next.js> |
| `fake-indexeddb` | 6.2.6 | Apache-2.0 | <https://github.com/dumbmatter/fakeIndexedDB> |
| `fflate` | 0.8.3 | MIT | <https://github.com/101arrowz/fflate> |
| `prettier` | 3.9.10 | MIT | <https://github.com/prettier/prettier> |
| `sharp` | 0.35.5 | Apache-2.0 | <https://github.com/lovell/sharp> |
| `tailwindcss` | 4.3.3 | MIT | <https://github.com/tailwindlabs/tailwindcss> |
| `tsx` | 4.23.15 | MIT | <https://github.com/privatenumber/tsx> |
| `typescript` | 6.0.3 | Apache-2.0 | <https://github.com/microsoft/TypeScript> |
| `vite` | 8.3.5 | MIT | <https://github.com/vitejs/vite> |
| `vitest` | 5.0.5 | MIT | <https://github.com/vitest-dev/vitest> |

## Bundled and transitive obligations

The locked graph includes packages whose notices need separate preservation:

- `monaco-editor` includes `LICENSE` and `ThirdPartyNotices.txt` for bundled
  upstream components. The current setup path copies both beside `min/vs`
  into `public/monaco/`; a clean locked install and built-distribution check
  must still verify that they survive into each distribution containing those
  assets.
- The served Monaco AMD chunk replaces its embedded DOMPurify factory with the
  official 3.4.17 AMD singleton during staged asset generation. Its unchanged
  license is copied to `public/monaco/DOMPurify-LICENSE`; artifact headers and
  source map are retained. Installed dormant Monaco ESM remains upstream stock.
- `dompurify` 3.4.17 is `MPL-2.0 OR Apache-2.0`; `marked` is MIT. Both are
  dependencies of the copied Monaco editor package.
- `caniuse-lite` 1.0.30001819 is CC BY 4.0. It is pulled into the Next.js
  toolchain and must retain its attribution/license notice where distributed.
- `axe-core` 4.14.0 and `@axe-core/playwright` 4.14.0 are MPL-2.0.
- `lightningcss` and its platform packages are MPL-2.0. `@img/sharp-*`
  packages used by `sharp` include Apache-2.0 and, for some platform builds,
  LGPL-3.0-or-later terms. `sharp`'s own Apache notice does not replace those
  notices.
- Playwright, TypeScript, `fake-indexeddb`, and several build packages are
  Apache-2.0. The graph also contains ISC, BSD-2-Clause, BSD-3-Clause, 0BSD,
  CC0-1.0, BlueOak-1.0.0, Python-2.0, and MIT packages. Their package-level
  notices remain effective.

The complete package names, versions, resolved URLs, integrity values, and
license metadata are intentionally retained in `package-lock.json`. A clean
locked install must be used to refresh this notice before any release or
dependency update. A lockfile reference is a build input and provenance
record; it does not redistribute registry package source. Preserve a full
upstream notice when a package's source, an asset, an example, or another
external work is actually copied or vendored into a released archive. Do not
copy a machine-local `node_modules` tree into the source repository, claim
that every registry crate or production package is redistributed, or claim
that a package is MIT merely because the application code around it is MIT.

## Downloaded projects and source references

Generated Cargo projects may contain repository-authored code under the MIT
scope, the three existing authored package manifests with the explicit
package-level `MIT OR Apache-2.0` exception documented in
[`docs/licensing.md`](docs/licensing.md), and external crates named by their
Cargo manifests or lockfiles. Naming a registry crate in `Cargo.lock` does not
copy or redistribute that crate's source. Include its notice only when the
crate source, asset, example, or other external work is actually vendored or
copied into the archive. A course citation or URL is not a license grant. The
archive generator must include the applicable project license and notices for
material actually present in every distributed variant; generated ZIP files
must not be edited by hand. Verify extracted starter and solution archives and
resolve local scope-document links before claiming this requirement is
satisfied.

This file is a draft notice index, not a claim that every historical source,
icon, or example has verified provenance. Resolve any source-rights or
attribution uncertainty in the private release audit before the public-release
gate. License-choice approval alone does not clear third-party rights.
