# A2 cancellation and transfer — source plan

[Polski](2026-10-15-cancellation-transfer.pl.md)

15 October 2026. This document records the bounded A2 source scope after the accepted A1 release. A1 PR68 is merged as `f975409feb0f1972089c2b368dc994417ca958d0` from head `7e03e2d56d29a10f68dfbeba2c4bf530109ab830`, tree `fad6f04d491b8e83a125327c7ba17a3818ca8a6c`. The [natural PR checks](https://github.com/fettpl/rustcrushcourse/actions/runs/38747309342) and [resulting-main checks](https://github.com/fettpl/rustcrushcourse/actions/runs/38752602241) passed all eleven jobs.

## Scope

A2 appends exactly two steps to the existing five-step `async-lending-cancel-commit` lesson. The supplementary `async-lending-cancel-commit-reply-model` is exposure only. The primary `async-lending-cancel-commit-lost-reply` uses `async-lending/cancel-lost-reply-v1`, `apply`/`transfer`/`tests`, evidence version 2, the existing cancellation concept, and one lesson-qualified criterion reference. No module, lesson, concept, review, package, schema, prerequisite, or dependency is added.

The public exercise teaches a local borrowed `Ledger::submit` future with independently controlled `before_commit` and `before_reply` gates. New keys commit before the reply gate; dropping after that boundary preserves one entry, while dropping before it leaves no entry. An identical retry returns the original receipt without polling either gate; a changed payload returns `Conflict`. Values remain opaque strings, receipts use successful insertion order, and the exercise makes no durability, rollback, exactly-once delivery, concurrency, panic atomicity, or process-crash promise. The public bounds intentionally add no `Send`, `Sync`, `Clone`, `Unpin`, `Debug`, or `'static` requirement.

## Compatibility and evidence boundaries

The accepted pre-A2 fixture binds the complete old cancellation lesson, the accepted seven-step A1 Send lesson, module criterion/copy, registry identities, old assessment fixtures and immutable-file sources. The cancellation V1/V2/V3 examples are authored representative builders in the compatibility test; the older generic saved-state golden remains separately preserved. The historical projection removes only the two declared A2 step IDs, removes only the new lesson-qualified criterion reference, and restores only the changed module metadata. It is composed before the existing A1 Send projection. Old V1/V2/V3 state, raw event order and timestamps, attempts, drafts, review queues, ratings, notes, bookmarks, resume locations and routes must remain byte-for-byte compatible; historical five-step completion does not gain fabricated A2 progress.

Assistance and evidence remain family-contained. The old gate and blank remain `async-lending/cancel-commit-v1`; the new task is a distinct family. A clean old plus clean new task supplies two families. Help, reveal, exposure and retries do not manufacture independent credit; a retry preserves the complete raw event prefix. The primary submission predicate is the exact lesson, step, `transfer` kind, `tests` evaluator and `passed` result. Delayed eligibility retains the strict more-than-24-hour relevant-contact/rating rule.

Browser and offline checks are UI/state evidence only. They cover imported old states, new drafts, help/note/step resume, IndexedDB durability before reload, the historical five-step boundary, desktop and 390px Kod-tab selection, Tab/Shift+Tab focus, warmed-resource offline save/resume and absence of fabricated credit. A2 runtime/compiler verification, whole-product browser/offline verification, independent review and A2 release acceptance remain pending for this source checkpoint. No A2 PR, merge, main run, learner outcome or readiness claim is made here.

The broader A3–A9 curriculum and the separate dependency maintenance block remain outside this plan.
