# Beginner Rust pilot — combined maintainer protocol and learner cards (CANDIDATE)

[Polski](learner-pilot.pl.md)

**Date:** 2026-10-09 (Europe/Warsaw)

**Status:** candidate maintainer protocol and authored material for adopted Astra packet 005. This document is a source documentation/material artifact; it is not a participant release, scheduler, executor, runtime implementation, or pilot result.

## Scope and source boundary

Use this document only after the maintainer has reconciled the current source and has confirmed each dependency below. Packet 003, packet 004, and packet 005 remain an adopted sequence; this candidate does not reopen, redesign, or promote any packet. The six staged lessons with twelve ordered packet-005 stop entries are authored presentation metadata only. They must not become persisted state, evidence events, schema changes, migrations, indexes, new families, credits, automatic skips, automatic completion, resets, uploads, analytics, accounts, or another save path.

The latest accepted release before the session-scaffolding candidate is M8, ordinary main head `54d9f1a1f62840cb7d85f8300cec0ca71a2c60b6`, tree `277104d82e7da6d1941dfdae573b615a37cd02ad`. The prior PR49 final reviewed source is `480cc55f54e90f2dd9083ded107b389d3dc3a412`; its natural PR run was `37845814389`, and the exact natural main run was `37850180035`, attempt 1, with all eleven jobs successful. The natural PR and main evidence records 103 unit files with 1106 passing unit tests, 2406 authored Rust cases on stable and 2406 on exact MSRV, 137 browser cases with zero retries and flaky cases, and offline page errors `[]`. Code and Security review found no new issues at `480cc...`; all three prior findings were resolved. The M8 local release was accepted with production preview HTTP 200 and the recorded bounded audit of 2 moderate, 0 high, and 0 critical production findings; the full audit has 5 high and 2 moderate informational findings. These are prior-release facts, not packet-005 source evidence. As of this 2026-10-09 promotion, a committed packet-005 candidate is present in the current checkout. When material is used, record the actual checkout commit or authored-material hash; source existence remains distinct from current CI/main and release confirmation, and learner artifacts/results remain unobserved.

Packet 003 and packet 004 authored materials are available in accepted M8; learner artifacts and results remain not observed. Packet-005 stops and materials remain an authored candidate; candidate status and availability must be reconciled against the exact current source, verification, and release state before use. This file is the single maintainer protocol for the candidate documentation path; the verification snapshot and current pointers are maintained from the accepted release facts above.

During material preparation, do not run a compiler, test, browser, runtime, dependency install, network operation, Git mutation, or source mutation. A finite software-only snippet proof is reconciled explicitly near the end; it is not a learner observation. Future human-authorized sessions may use the runnable cards and observe actual local/manual work under the protocol below.

## Maintainer protocol

### Purpose

Observe how a basic programmer with no Rust experience identifies a next action, predicts a boundary, repairs a compiler-guided error, and explains a choice. The initial feasibility target is 3–5 volunteers only if a human authorizes contact and people are actually available. One observed learner can expose a concrete barrier. No participant count, timing, transfer, retention, efficacy, mastery, or recruitment claim may be filled in before observation.

The observer records what happened. Keep these evidence classes separate:

- **Fixed fixture:** supplied browser task, authored code, tests, API, or known contract.
- **Baseline authored context:** public API, supplied method body, supplied text-method body, scaffold, or contract deliberately given with the task. It is not additional help and does not by itself change the result category.
- **Learner-owned artifact:** source and tests written locally by the learner; architecture, types, names, and rationale remain theirs.
- **Self-report:** what the learner says they did or understood.
- **Human review:** what the observer personally inspected, ran, or heard, with the evidence named.
- **Infrastructure interruption:** installation, network, browser, toolchain, runner, or other environment delay. It is separate from learner active time.

During material preparation, do not install Rust, execute arbitrary learner source through the repository verifier, create accounts or uploads, recruit or message people, or change course state. A future human-authorized observation may use a learner's local Cargo toolchain or manual/browser work, but must not route arbitrary learner source through the repository verifier. If a toolchain is absent, record `not observed — toolchain unavailable` and continue any available browser work.

### Before a session

Record the date, observer, a short participant code (no name or contact detail), stated programming background, and whether the learner has used Rust. Ask permission to observe and record code, explanations, timings, and screen-visible assistance. The learner can pause or stop at any time.

Before naming a task as available, check its material and dependency status:

| Material | Status in this candidate | Availability rule |
| --- | --- | --- |
| First-program and functions basics | fixed browser material | Recheck current source before use. |
| Packet 004 learner-owned parcel | available in accepted M8 source | Use only when a local Rust/Cargo toolchain is available; learner artifacts and results remain unobserved. |
| Accepted shared-borrow repair | separate bounded scope | Recheck current accepted PR45 contracts; use supplied method bodies as baseline authored context. |
| Packet 003 short I/O probe | available in accepted M8 source | Use only with the accepted packet-003 material. A full I/O review is not a short probe. |
| Six packet-005 staged lessons | `P005-authored candidate` | Use only after exact lesson IDs, stop metadata, and the current implementation are reconciled and verified; they are not released packet-005 material. |
| Packet 004 Study Session CLI | available in accepted M8 source | Do not present learner work as observed. |
| Packet 004 `--min-total N` change | available in accepted M8 source | The change is available after documented self-review or external review of the first learner-owned artifact; record the evidence category. |
| Packet 004 Durable Log Service K | optional later material available in accepted M8 source | Separate from the beginner pilot; do not imply learner availability or results. |

Prepare the exact task/version before showing a task. Record a distinct source/material version as the supplied commit or authored-material hash; if no identity is available, record `not observed`. Keep this field separate from task/version and source/material status. Use task kinds `fixed-fixture`, `prediction`, `repair`, `open-local-artifact`, or `delayed-transfer`. Keep requirement exposure as `not shown before release`, `shown previously`, `unknown`, or `not applicable`; a new version does not make a previously read requirement unseen.

### Session 1 — early prediction and repair

Allow roughly 35–45 minutes of active learner work, with permission to pause. This is an organizational time box, not an observed solve time. Record installation, network, browser, and toolchain delay separately.

1. Use first-program and functions basics.
2. Ask the learner to explain a short unfamiliar function in their own words and show what an expression or semicolon changes.
3. Ask for one boundary prediction before execution; record it before showing the result.
4. Give one compiler-guided correction in this order: concept hint, local code-shape hint, then the existing full solution only if needed. Record documentation/API lookup and every additional intervention.
5. Offer the packet-004 learner-owned parcel only if the current source has it and Cargo is available. Its architecture, types, function name, tests, and invalid-result representation belong to the learner; do not infer success from a checkbox.

Suggested Polish prompts:

- “Before we run the code you predict and why?”
- “What do you think this function does? Show what changes a semicolon or an
  expression.”
- ‘What will you take next step? You can ask for a clue or stop.”
- “Which decision in your program did you choose and why?”

### Session 2 — ownership, bounded repair, and transfer

Run after relevant ownership practice. Keep these dimensions separate: prediction, mechanical repair, plain-language reason, and changed-domain transfer. Record prior exposure for every version.

Use the exact versions `S2-MC-v1`, `S2-SB-WORDS-v1`, `S2-SB-SUFFIX-v1`, and `S2-XFER-v1`.

- `S2-MC-v1`: before execution, predict whether the original `text` and `number` bindings remain usable after assignments and explain move versus `Copy`.
- `S2-SB-WORDS-v1`: perform the accepted shared-borrow boundary repair with `text.split_whitespace().count()` supplied as the method body.
- `S2-SB-SUFFIX-v1`: perform the accepted shared-borrow boundary repair with `text.ends_with(suffix)` supplied as the method body; both inputs remain read-only views and reusable by the caller.
- `S2-XFER-v1`: implement the ticket-label fragment helper. The caller uses `String::from("INC-42: parser")`, the literal fragments `"parser"` and `"cli"`, and reuses the title after both calls. The learner chooses the helper name, decomposition, and `String`/`&str` boundary.

The public API, supplied method bodies, starter shape, and typed caller are baseline authored context. Concept hints, code-shape hints, API lookup, observer guidance, revealed target decisions, and solution exposure are recorded separately. Do not turn the bounded repair into a claim about all ownership.

### Delayed follow-up

Use the exact version `D-XFER-v1` only after an actual interval strictly greater than 24 hours from the last contact with the target concept. Exactly 24:00, or less, has delayed qualification status `quiet interval: no — repeated practice` and does not qualify as a delayed interval; keep the primary result in the five-category set. Record the actual hours and intervening practice.

The new notification-prefix domain uses an owned message `String::from("Przerwa: Rust")` with prefix `"Przerwa"`, plus literal message `"Status: gotowe"` with lowercase prefix `"status"`. The helper is read-only, case-sensitive, and does not trim or normalize. The caller must use both forms and retain use of the owned message. Do not reopen the old solution. Record fresh prediction, active minutes, assistance, criteria, explanation, and observed evidence.

### Later dependency-gated observations

After the packet-005 source implementation and focused verification make the candidate stops available, choose one of the six staged hotspots and record the exact boundary reached. A stop note permits a pause and return to the current task through existing autosave; it does not mean the boundary is completed, and it must not skip, auto-complete, award evidence, or create a save path. The authored lesson workload remains an estimate.

The packet-004 authored material is available in accepted M8. A later observation may cover the learner-owned Study Session CLI. For an optional observation, record prior exposure to the public `--min-total N` requirement. Its availability follows documented self-review or external review; an external participant is not a development prerequisite. Durable Log Service K is optional later evidence and outside the beginner time box. Do not describe any of these later observations as covered by Sessions 1–2.

## Learner cards (runnable when the maintainer confirms availability)

The learner may pause or ask for help. The observer records active learner minutes separately from pause and infrastructure delay. Before execution, the learner states a prediction and why. Exact wording is not required; meaning is what is scored.

### To-do card for a beginner

**Level:** is enough basic programming; Rust may be new. Start the section marked “accessible
after confirmation” only after clear confirmation of the host.

#### Session 1

1. Go through the basics of the first program and function.
2. In your own words, explain a short, unknown part of the function. Show what changes
   an expression or a semicolon.
3. Before performing a border example, tell or save the prediction.
4. Complete one amendment as indicated by the compiler message. You can get a conceptual
   clue first, then a code-shaped clue, and then a full solution at the end.

#### Local Cargo program for package payment — available in accepted M8 after confirmation

Start only after the availability has been confirmed and Rust/Cargo. No tool save as `nie zaobserwowano: brak narzędzia`.

Create a separate local Cargo program calculating the fee for the total weight of the
package: scales 1–5 cost 8, scales 6–20 cost 12, and any other weight is rejected in
your chosen way. Show results for `0`, `1`, `5`, `6`, `20`, `21`. Select the function name
and return type yourself. You don't have to use the input from terminal, file, `Result`,
structure or loop.

Use at least two of your own sensible tests: one for the border `5/6` and one for the
incorrect weight. Change one expected value temporarily, run tests, see a real failure,
and then restore it. Save the message and repair method. The driver may check the
results of commands, limits, tests and an explanation of how to mark rejection.

Useful commands:

```text
cargo new nazwa-projektu
cd nazwa-projektu
cargo check
cargo run
cargo test
```

#### Session 2

The driving person will issue separate cards `S2-MC-v1`, one of the mechanical cards `S2-SB-WORDS-v1` or
`S2-SB-SUFFIX-v1`, and `S2-XFER-v1`. Write down if the requirements were previously shown. Perform separately
the prediction, repair of the mechanical contract, explanation and transfer to a new
field.

#### Interruption points in six lessons (12 points) — available after confirmation of implementation

If the interface shows a note, you can save the state and return. The title is a place
of detention, not a result or completion. The note does not finish the task, does not
skip the step and does not admit evidence. Return uses an existing autosave and returns
to the current task.

| Lesson | `afterStepId` stop 1 | Title / Next Objective | `afterStepId` stop 2 | Title / Next Objective | Other stage |
| --- | --- | --- | --- | --- | --- |
| `todo-command-parser` | `parser-explain` | “Stop when parser is explained”; “Move parser rules to the next task.” | `parser-add-gate` | “Stop at gate Add”; “Check the transfer of parser on other commands.” | `parser-transfer`, `parser-recall` |
| `todo-state-invariants` | `state-explain` | “Stop after state explanation”; “Go to the goal of correct Add and Done operations.” | `state-add-done-gate` | “Stop at gate Add and Done”; “Check the listing gate and transfer.” | `state-list-gate`, `state-transfer`, `state-recall` |
| `todo-session-project` | `session-explain` | “Stop after explaining the session”; “Start the session goal with a middle error.” | `session-run-gate` | "Stop at session gate"; "Compare the regular session with closeness." | `session-strict-gate`, `session-recall`, `session-blank` |
| `todo-storage-format` | `format-explain` | “Stop after explanation of the format”; “Check the coding and decoding gateway.” | `format-gate` | “Stop at format gate”; “Watch the behavior at the damaged line.” | `format-observe`, `format-recall` |
| `todo-file-persistence` | `file-explain` | “Stop when the file is explained”; “Check the recording and reading gate.” | `file-gate` | “Stop at the file gate”; “Watch to replace the file safely.” | `file-observe`, `file-recall` |
| `todo-terminal-cli` | `cli-explain` | “Stop after explanation CLI’; “Check the execution gate.” | `cli-gate` | ‘Stop at gate CLI’; ‘Go to read the input and local practice.’ | `cli-recall`, `cli-input-boundary`, `cli-local-practice` |

The estimated lesson time is the respect of the author, not the observed solution time.

#### Own program summarizing sessions — available in accepted M8 after confirmation

When you confirm availability, create a separate local Cargo project; do not copy the
reference project. The program takes one path UTF-8. The blank line is in the form of `name;minutes`
with exactly one semicolon; cut the white characters of the name and number field; the
name cannot be empty; `minutes` is at least one digit ASCII `0–9`, and the value belongs to
1-1440. Reject `+5`, `-5`, spaces inside numbers and digits outside ASCII. Empty lines skip.
Unicode names are distinguished by the size of letters. Sort by Rust Order and write
`name;total`.

Invalid records report to `stderr` with line number, process them further and end with code
2. Bad arguments, read error or UTF-8 report on `stderr`, do not write the report and end with
code 1. The correct file ends with code 0. The sum cannot quietly wrap; the overflowing
record is incorrect, and the earlier sums remain preserved. Use only std, without
external dependencies. The network, time tags, implementation and performance threshold
are beyond requirements.

Show the correct and mixed file, prepare your own test of wrong record, aggregation and
order, and explain your decision to borrow or own names. The check includes repeated and
clipped equivalent names, Unicode, empty file, CRLF, minute limits, characters other than
ASCII `0–9`, incorrect fields, input error and overflow.

### `S2-MC-v1`, `S2-SB-WORDS-v1`, `S2-SB-SUFFIX-v1` and `S2-XFER-v1` — issued by the host

Write down: `pokazane wcześniej`, `nie pokazano` or `nie wiadomo` before you start.

#### `S2-MC-v1` — predicting a move/`Copy`

Before you run the code, answer which of the original bonds `text` i `number` will remain
correct with later use in `println!`:

- both original bonds (`text` and `number`);
- only the original total number binding (`number`);
- only original bond `String` (`text`).

```rust
fn main() {
    let text = String::from("rust");
    let text_next = text;
    let number = 7;
    let number_next = number;
    println!("{text} {number} {number_next}");
}
```

Write down the prediction first. `text_next` is a new attachment after attribution; the question
concerns later original use `text` and `number`.

#### `S2-SB-WORDS-v1` — Repair text view

In the application, open an existing lesson `shared-borrow-calibration` (‘Lending Text View’) and a task `shared-count-words`
(‘Repair Counting Part of the Text’). Use the delivered body method `text.split_whitespace().count()`, starter and
code calling function shown in the initial code as base material. Fix only the function
limit so that the calling code keeps its own `String` after calling.

Keep counting blank parts by white characters, including empty text, tabulators, line
ends and multiple intervals. After repair, use the visible “Start Tests” button in the
existing task. Save separately the result, reason for repairs, explanation and any help
from the host.

#### `S2-SB-SUFFIX-v1` — repairing two views of the text

In the application, open an existing lesson `shared-borrow-calibration` ("Lending Text View") and a task `shared-has-suffix`
("Repair End Checking"). Use the delivered body method `text.ends_with(suffix)`, starter and code calling
function shown in the initial code as base material. Fix only the function limit so that
both inputs remain read-only views, and the calling code can use `text` and `suffix` after
calling.

Keep accurate checking of the ending from the existing contract: no clipping, change in
letter size or normalization; empty suffix fits. After repair, use the visible “Start
Tests” button in the existing task. Save separately the result, reason for repairs,
explanation and any help from the host.

#### `S2-XFER-v1` — Notification label

Write a little read-only helper that returns `true` if and only if the title contains a
given passage of text. Checking is case-sensitive; do not trim, don't normalize or
change the text.

- `String::from("INC-42: parser")` with fragment `"parser"` give `true`;
- the same title with passage `"cli"` gives `false`;
- the caller shall issue his own title after both checks;
- at least one call uses a textual literal as a fragment.

Select the name, signature and code organization yourself. Select `String` or `&str` at the
helper border and explain how the caller retains the ability to use the title.
Documentation API is permitted and recorded separately from additional guidance.

### `D-XFER-v1` — a card of subsequent verification

It is issued only after a break longer than 24 hours from the last contact with the
concept; the exact 24:00 is not enough. Save the real interval and exercise in the
meantime. If the interval is 24 hours or less, the operator shall record this test as a
repetition rather than a deferred check. The evaluation of the performance remains
separate.

Write a little read-only helper that returns `true` when and only if the text starts with
the given prefix; the comparison is letter sensitive and does not trim the text.

- `String::from("Przerwa: Rust")` with prefix `"Przerwa"` gives `true`, and after calling you can still write a message;
- The letter `"Status: gotowe"` with the prefix `"status"` gives `false`;
- calling using its own `String` and the letter, and retains the possibility to use its own
  message;
- do not open the previous solution.

### Post-Amendment Card `--min-total N` — after written review

Take this change after the written self-assessment or external review of the first
artifact. The requirement is public; do not assume it is unknown. Write if the
requirement was shown earlier: `nie pokazano przed wydaniem`, `pokazano wcześniej` either `nie wiadomo`.

Add optional argument `--min-total N`. It is to filter only the final totals written out: leave
names whose sum is at least `N`. The no-option call to date still works. Do not change
the parsing, diagnostics or exit codes. Add your own tests and explain the changed
programme limit.

## Observation record and narrow rubric

Use one record per task. This is a maintainer template, not a product schema or automatic evidence event. Leave unknown fields as `not observed`.

### Required identity and timing fields

Record participant code, session date/observer, session stage, exact task/version, task kind, source/material status, distinct source/material version (commit or authored-material hash; otherwise `not observed`), prerequisite confirmation, learner Rust/toolchain context, and requirement exposure status. Use the exact versions `S2-MC-v1`, `S2-SB-WORDS-v1`, `S2-SB-SUFFIX-v1`, `S2-XFER-v1`, and `D-XFER-v1` when those tasks are used. Do not use task/version or source/material status as a substitute for the source/material version field.

Record active learner minutes, pause minutes, installation/network/browser delay minutes, other infrastructure interruption minutes, total wall-clock interval, last contact with the target concept, actual delayed interval in hours, intervening practice, and whether the quiet interval was achieved (`yes (>24h)`, `no`, `unknown`). Never add infrastructure delay to active time.

### Required work and evidence fields

Record attempted code or artifact; baseline authored context; first prediction; errors and recovery; additional hints/guidance; documentation/API lookup; full-solution use; criteria; learner explanation; and what the observer actually saw. Mark every criterion separately as `met`, `not met`, or `not observed`. Record unexplained terms separately from compiler errors. For learner-owned artifacts, separate architecture, types, names, tests, and rationale from fixed browser fixtures and self-report.

### Exactly five result categories

Choose one primary result category:

1. **help-free success** — all stated criteria met without hints, documentation/API lookup, observer guidance, or solution exposure.
2. **success with documentation** — criteria met with learner-initiated documentation/API lookup, without observer guidance or full solution exposure.
3. **guided success** — criteria met after concept/code-shape guidance, observer direction, a revealed target decision, or solution exposure. Baseline authored APIs, method bodies, and scaffolds do not by themselves make success guided.
4. **incomplete attempt** — learner stopped or criteria were not met before a technical interruption ended the task.
5. **infrastructure interruption** — toolchain, installation, network, browser, runner, or other environment event prevented a fair attempt; preserve partial work separately.

If an interruption also left the attempt incomplete, keep `infrastructure interruption` as the primary category and add the incomplete note. Do not collapse observations into a completion percentage.

### Narrow criteria

For Session 1, mark separately: unfamiliar function meaning; expression/semicolon effect; boundary prediction before execution; response to one compiler-guided correction; active work separated from infrastructure delay.

For the learner-owned parcel, mark separately: weights `0, 1, 5, 6, 20, 21`; learner explanation of invalid-result representation; at least two meaningful tests; `5/6` and invalid-case coverage; real failing test followed by restoration; actual local command output; and learner-owned source/architecture distinct from fixed fixtures. If Cargo is unavailable, use `not observed — toolchain unavailable`.

For Session 2, mark separately: `S2-MC-v1` prediction; distinction between moved `String` and `Copy` integer; `S2-SB-WORDS-v1` or `S2-SB-SUFFIX-v1` repair; plain-language ownership reason; `S2-XFER-v1` true/false results; helper boundary and caller title reuse; and separate recording of assistance/unexplained terms.

For `D-XFER-v1`, mark separately: actual interval and delayed-qualification status (`quiet interval: yes (>24h)` or `quiet interval: no — repeated practice`); keep the primary result as one of the five categories; required prefix results; owned `String` and literal use with caller reuse; no reopening of the old solution; fresh notification-domain explanation; intervening practice.

For a packet-005 hotspot, record the exact lesson ID, exact `afterStepId`, whether the note was observed, resume to the current task through existing autosave, and that no auto-complete/skip/evidence award occurred. If stops are unavailable, use `not available`.

For the Study Session CLI, mark separately: local Cargo project rather than reference copy; valid summary/sort/exit 0; malformed record with line number and continued valid records/exit 2; wrong args/I/O/UTF-8 on stderr with no report/exit 1; trim/Unicode/ASCII `0–9` including rejection of `+5`, `-5`, non-ASCII digits, CRLF and overflow; one ownership/data-structure explanation; and review category (documented self-review, external review, or not observed).

For `--min-total N`, mark separately: first submission before exposure; only final totals filtered; parsing/diagnostics/exit status/old invocation compatible; learner tests and boundary explanation; and prior exposure (`yes`, `no`, `unknown`).

### Observer decision note

Record concrete examples:

```text
Barrier or recurring failure observed:
Evidence the learner could identify the next action:
Undisclosed prerequisite or unexplained term:
One corrective change proposed for the next iteration (maximum two):
What remains not observed or dependency-blocked:
```

Do not record participant contact details, unrelated personal information, a universal timing threshold, a sole completion percentage, population mastery, causal retention improvement, or production readiness.

<hr>

## MAINTAINER-ONLY ANSWER KEY — CANDIDATE; DO NOT GIVE TO A LEARNER

This section is controlled maintainer material. It records expected behavior and narrow criteria; it must never be presented as a learner answer or used to call a requirement unseen. It does not turn software checks into learning outcomes.

### Assistance and exposure

The public contract, `move-copy-discovery` code, supplied APIs, supplied method bodies, and supplied scaffold are baseline authored context. They are not additional help and do not make a result guided. Record concept hints, code-shape hints, observer direction, API lookup, revealed target decisions, and solution exposure separately. Record prior exposure as `not shown before release`, `shown previously`, or `unknown`.

### `S2-MC-v1`

`text` is a `String` and moves into `text_next`; later use of original `text` is invalid. `number` is an integer (`i32` in the supplied code) and is `Copy`; original `number` and `number_next` remain usable. The intended answer is **only the original integer binding**, with an explanation connecting move and implicit `Copy`. The supplied program intentionally exposes the moved-use problem at original `text`; `text_next` is a new binding and is not the later-use target. A compiler message alone is not the learner's explanation.

Narrow acceptance: prediction exists before execution; it distinguishes moved `String` from `Copy` integer; learner explains which binding remains usable and why.

### `S2-SB-WORDS-v1` and `S2-SB-SUFFIX-v1`

Use exact current source contracts after reconciliation. `S2-SB-WORDS-v1` supplies `text.split_whitespace().count()` and keeps caller-owned `String` reusable. `S2-SB-SUFFIX-v1` supplies `text.ends_with(suffix)`, keeps both inputs read-only views, and lets the caller reuse `text` and `suffix`. Narrow acceptance is the intended shared-borrow boundary repair plus the authored external behavior: no ownership-taking parameter where a read-only view is required, no trimming or case normalization, and caller reuse. A supplied method body is baseline context, not a hint.

### `S2-XFER-v1`

Required cases are `true` for `String::from("INC-42: parser")` with `"parser"`, `false` for the same title with `"cli"`, caller reuse/printing of the owned title after both calls, and at least one literal fragment argument. Matching is case-sensitive and does not trim, normalize, or rewrite. Accept any helper name, signature, decomposition, and `String`/`&str` choice that meets the contract and explanation. Record API lookup and additional guidance separately.

### `D-XFER-v1`

Release only after a strict interval `>24h`; exact 24:00 or less has delayed qualification status `quiet interval: no — repeated practice`, while the primary result remains one of the five categories. Required cases are `true` for owned `"Przerwa: Rust"` with `"Przerwa"` and `false` for literal `"Status: gotowe"` with lowercase `"status"`; caller uses both and can still use owned message. Matching is prefix, case-sensitive, and does not trim or normalize. Accept any helper name/signature and record any help separately. No expected signature, implementation algorithm, or production claim is part of this key.

## Historical draft versus finite software proof

The accepted R4 maintainer key and observation materials correctly described the controlled snippets as **unexecuted draft material at the time of their preparation**. A later finite verification report provides software-only proof for the authored snippets. Reconcile the two statements by preserving both scopes: the material was unexecuted when drafted, and the bounded authored proof was later run; neither statement is a learner outcome.

The accepted finite report says the authored `S2-MC` source was extracted verbatim and compiled with Rust 1.99.0 and Rust 1.85.0. Both intentional original-`text` uses exited `1` with `E0382`; stdout was empty. A temporary integer-only verifier variant compiled and ran with exit `0` and stdout `7 7\n`. Temporary verifier-only `S2-XFER` and `D-XFER` `&str` helpers compiled and ran with exit `0` against their stated case boundaries; `D-XFER` produced `true false Przerwa: Rust\n`, and `S2-XFER` produced `true false INC-42: parser\n`. Raw command JSON, stdout, stderr, numeric exits, toolchain versions, and before/after identity were retained by the finite report.

This proof establishes only finite authored behavior and visible case/whitespace boundaries. It does not establish participant success, learning outcome, retention, transfer, delayed interval, efficacy, a grader, a new task family, source GO, or current source integration. Do not duplicate the Rust campaign, add a grader, execute arbitrary learner source, or relabel diagnostics as observed learning.

## Explicit non-claims and future acceptance

Materials-ready means this protocol, Polish cards, narrow criteria, and delayed follow-up exist and dependency labels are truthful. It does not mean packet-005 stops are implemented, packet-004 learner work was observed, Cargo ran for a learner, participants were observed, or any timing, transfer, retention, efficacy, mastery, or production result exists.

Future observed-pilot reporting may record actual participant count/experience, tasks, help, correctness, explanations, active minutes, and actual interval, then name concrete recurring failures and at most two corrective changes. It must not claim comparative effectiveness, population mastery, causal retention improvement, or a required percentage gate. No learning outcome, participant, recruitment, message, scheduler, executor, upload, analytics, or efficacy evidence is created by this document.
