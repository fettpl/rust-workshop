# Readability and Rust foundations — implementation plan

[Polski](2026-09-12-readability-foundations.pl.md)

Refresh the interface, support learners starting with no Rust experience, and compare the product with the complete brief.

The local v3 state and current lesson IDs stay intact. A separate foundations catalog joins the ownership catalog through `course.ts`. The map and navigation use the module array. The editor and evidence engine serve both catalogs.

Keep lesson access open and preserve progress. Assume no knowledge of other languages and keep learner code out of the local shell. The complete curriculum in the brief guides future development.

- [x] Rework the light and dark palettes around white, gray, navy, and blue. Improve the readability of labels, commands, panels, and buttons in `globals.css` and Monaco. Check desktop and mobile visually and with axe.
- [x] Show the actual lesson plan on the dashboard. Add the module picker and links to evidence for completed criteria in `overview.tsx` and `app-shell.tsx`. Verify that existing lessons resume and opening foundations preserves saved data.
- [x] Add five foundations lessons, sources, concepts, and an explicit module contract in `foundations.ts`. Compile starters, solutions, and tests with `content:rust`.
- [x] Generalize graph validation across modules in `validate.ts` and `course.ts`. Test misassigned lessons, module cycles, and references to an assessment from a different module.
- [x] Check retrieval practice and cross-cutting competencies. Add the missing behavior found by the audit with tests for evidence and persistence.
- [x] Complete `docs/requirements-audit.md` with delivered, partial, future, and user-amended requirements.
- [x] Run lint, TypeScript, Vitest, content and Rust validation, the build, and Playwright. Refresh the local preview on port 3002 and verify production offline mode.

Final checks passed for 75 Vitest tests, 113 Rust cases, nine Playwright scenarios, lint, TypeScript, content validation, the build, 14 HTTP sources, five live API checks, and production offline mode. The preview on port 3002 was refreshed. Learning effectiveness requires a separate study with learners. [Verification report](../../verification.md)
