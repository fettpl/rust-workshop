# Rust Workshop — first ownership slice

Authoritative brief: the user's pasted-text-1.txt, provided 2026-09-12.

## Product and scope
Polish, calm technical learning application. No account, no gamification. A cool white/slate, navy and blue identity, persistent compact course rail, large next action, responsive workspace. Dark mode uses deep navy. The course route starts with a short action-based diagnostic, then Rust foundations (first program/Cargo, variables, functions and control flow), memory, move, Copy, function ownership, borrowing, transfer project, delayed review, and scenario assessment. The rest of the curriculum is a visible roadmap, explicitly not implemented.

The target learner knows basic programming concepts but has no assumed Rust experience. The first three diagnostic tasks use clearly labeled, language-neutral Polish pseudocode; the fourth is a scaffolded Rust arithmetic function with its syntax explained in the task.

## Approach
Use Next.js App Router, strict TypeScript, React, Tailwind, locally served Monaco, IndexedDB, Vitest and Playwright. Alternative single-page static architecture would obstruct the secured runner boundary. A custom Rust execution host would add security/operations scope; use the existing isolated Rust Playground through an interchangeable server adapter. Local user source is never executed on the web server. An unavailable runner is infrastructure feedback, not a failed learner attempt.

## Domain boundaries
Content schema defines lessons, exercises, module contracts, sources and concept dependencies. Engine evaluates declared evidence, schedules reviews and derives mastery. User state includes exact resume, per-step drafts, answers, attempts, hint/reveal use, notes and settings. Persistence validates and migrates state, uses IndexedDB and exports a versioned envelope. UI renders content, rather than embedding curriculum. The runner returns structured status and keeps original compiler stderr.

## Learning integrity
Every core lesson follows prediction, observation and practice, followed by transfer. Self-rated recall cannot create understood/retained mastery. A reveal weakens evidence. Repeated clicks on the same task never accumulate competence. Delayed verified retrieval is necessary for retained. Gate requires unseen move/Copy, a fix without solution reveal, function ownership, borrowing and anti-clone diagnosis. Free explanations are rubric guided and explicitly self-assessed; code evidence remains separate.

## Reliability and access
All drafts save on change. Single app route carries view in persisted state for exact offline resume. Service worker caches app shell and same-origin assets; execution requires network and says so. Local storage failure is visible and never silently resets progress. Import is validated before replacement; destructive replacement requires confirmation. Keyboard focus, skip navigation, mobile Lesson/Code/Output, reduced motion and textual visualizer states are part of acceptance.

## Validation
Vitest covers evaluation, mastery, review scheduling, state migration/import and content graph. Trusted authored examples alone compile locally through rustc; exercise user code only goes to the sandbox adapter. Playwright covers onboarding, diagnostic, lesson work, hints and exact reload resume, notes, bookmarks, themes, focus, mobile and import/export. Live runner smoke check is separate from deterministic API fixtures. Finish with educational/UX/engineering/accessibility audit; do not expand the curriculum.
