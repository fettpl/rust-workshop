# Disjoint range transfer: contract and evidence boundary

Date: 2026-10-22. This is a local feature candidate on top of the local native-test
maintenance milestone. GitHub Actions acceptance, PR integration and resulting-main
checks remain deferred during the billing hold.

## Authored contract

The existing `unsafe-miri-disjoint-regions` lesson retains its seven original
steps and appends `disjoint-regions-range-model` and
`disjoint-regions-range-transfer`. The fixed model explains half-open ends,
argument order including reversed storage order, empty ranges and overlap. It
is exposure only. The primary asks for this public API:

```rust
use std::ops::Range;

#[derive(Debug, PartialEq, Eq)]
pub enum RangeError { FirstInvalid, SecondInvalid, Overlap }

pub fn select_regions<'a>(
    buffer: &'a mut [u8],
    first: Range<usize>,
    second: Range<usize>,
) -> Result<(&'a mut [u8], &'a mut [u8]), RangeError>;
```

Validate the first range, then the second, then overlap. A range is invalid when
`start > end` or `end > buffer.len()`. Overlap requires two nonempty intersecting
ranges; `2..2` inside `0..4` is valid. Empty results have length zero and no
pointer-identity requirement. Nonempty results retain exact original-buffer
identity, length and argument order. Errors do not change the buffer. Subsequent
mutations affect only the selected regions; gaps and remaining bytes survive.
Safe implementations are accepted without requiring a particular source spelling
or allocation strategy.

## Learning evidence and compatibility

The new primary has family `unsafe-miri/disjoint-ranges-v1`, version 2 and only
concept `unsafe-miri-disjoint-regions-contract`. The original midpoint gate,
blank and contract alias retain `unsafe-miri/disjoint-regions-v1`. The model,
recall, review and repeated aliases do not create a second primary family.
The concept still requires two distinct clean primary families; the module
criterion still requires one independent coding task. No thresholds or saved-state
schemas change. Two authored families are availability, not earned evidence.

Compatibility tests pin the authentic predecessor course digest
`ce77d3f044159372bacc143ff4d22c04241333e09fbbba3b52bba8b1dc1296d5`.
The historical projection removes only the declared new steps/ref/metadata and
replaces the Miri project only when its complete reviewed successor hash matches.
Unexpected historical lesson, step, criterion, package or project mutations remain
visible and fail the predecessor digest. Earlier historical projections compose
through this boundary; frozen predecessor files remain unchanged.

V1/V2/V3 checks preserve old indices, drafts, notes, attempts, raw events,
assistance, bookmarks, reviews, ratings, sessions and exact resume. Old completion
does not synthesize the new task or credit. Starter downloads expose no solution;
revealing the Miri package solution also marks the new primary assisted. Earlier
clean raw events remain unchanged.

The assembled local candidate contains 48 modules, 192 lessons, 194 concepts,
1,277 steps and 349 sources. This feature adds two steps and no new module,
lesson, concept or source. Slot and MutSlot still each have one authored primary
family; the four provisional foundation concepts remain separate follow-up work.

## Earlier curriculum review follow-through

This milestone follows the [6 October review](curriculum-review-2026-10-06.md):
provide a distinct executable transfer contract, preserve historical assistance
and raw evidence, verify exact resume and offline study, and separate authored
availability from observed learning. The beginner route and prerequisite graph
remain intact. The [original-scope audit](curriculum-audit-2026-10-10.md) retains
its dated 19-topic/five-project reconciliation. Remaining foundation calibration,
open design evidence and broader target-map work keep their separate queue and
acceptance requirements.

## Trusted verification scope

The exercise harness checks seven behaviors, including 2,274 endpoint combinations
for buffers of length 0 through 4, extreme endpoints, error precedence, pointer
identity, order, mutation and reuse. Three safe implementations pass. Seven safe
semantic mutants compile and fail their exact named test normally. An owner-escape
client is compile-negative with a scoped positive twin. These bounded cases are
not a proof over every possible implementation or input.

The std-only Miri package adds the same API and a separate fixed overlap witness.
UB fixtures are compiled to metadata and interpreted by pinned
`nightly-2026-08-08` Miri; they are never native-executed. The overlap classifier
requires normal status 1, exactly one primary UB event, the expected Unique retag
category in that header and the primary authored tuple span before help/notes.
Stdout, later notes, unrelated diagnostics, signals, spawn errors and timeouts do
not establish the verdict. The receipt records actual commands, tool versions,
archive/source hashes, status and retained output. It is bounded package evidence,
not a replacement for the initialized-prefix qualification or proof of general
unsafe soundness.

Learner and imported Rust remain behind the isolated remote runner. Mocked browser
responses verify request, interface and persistence behavior only. Offline checks
preserve study state and report compiler unavailability without granting coding
credit.

## Local acceptance status

Application source remains `5cdb2f1`, including the runnable starter-status fix.
The final verification head is `9bfb357`; it contains script-only offline
viewport/output fixes while the application source stayed unchanged. The fresh
local campaign completed on that verification head:

| Scope                                 | Result                                                                                     |
| ------------------------------------- | ------------------------------------------------------------------------------------------ |
| Lint / typecheck / content validation | Passed; 0 lint errors, 29 existing warnings                                                |
| Structural source audit               | Passed; live URLs were not rechecked                                                       |
| Focused browser check                 | 1 passed in 2.7 seconds; narrow coverage only                                              |
| Full ordinary unit suite              | 133 files; 1,461 passed, 0 failed, 1 explicit prefix-profile opt-in skip, 0 other skips    |
| Authored Rust, selected stable 1.98.1 | 2,525 / 2,525 passed in 456,464 ms                                                         |
| Authored Rust, exact 1.85.0           | 2,525 / 2,525 passed in 421,815 ms                                                         |
| Production build                      | Passed; exit 0 in 5,761 ms                                                                 |
| Production E2E                        | 185 expected; 0 skipped, unexpected or flaky in 276,757.806 ms                             |
| Offline flow                          | Passed; exit 0; no page errors; unavailable runner reported honestly and no credit granted |

The offline flow covered the disjoint draft, note, hint, exact-index 8,
keyboard and honest-unavailability paths. Two earlier offline RED findings were
fixed in the verification scripts on `9bfb357` and independently approved. The
focused browser result and the production run exercise the application source
from `5cdb2f1`; the verification-head script changes do not change its learning
policy. No production learning policy or historical credit was changed.

The prior integrated campaign at source `9dbd27a` recorded 1,461 ordinary unit
passes with one explicit native-profile opt-in skip and 2,523 / 2,523 authored
Rust passes. Those results remain historical. Its first full-unit attempt exposed
six stale historical expectations; targeted recovery and predecessor-projection
corrections then passed 118 focused tests before that historical retry passed.

The genuine qualified native proof also remains historical: frozen source
`459da10` produced strict success for stable 118 recipes / 125 commands / 9
controls, pinned Miri 122 / 131 / 11, and exact MSRV 118 / 125 / 9. The proof
qualified unchanged runtime paths and does not claim a same-head native run or
Linux CI parity.

Narrow QA screenshots had empty console/page-error output on desktop and mobile.
The existing long-module breadcrumb/mobile-header crowding remains a known,
narrow UX observation rather than a new regression; this is not a complete
accessibility claim. Independent review of the feature, assembled receipts and
these documents is complete. Remote acceptance remains deferred until the
expected 2026-11-01 Actions reset; no publishing, billing or hosting operation
is part of this local milestone.

For reproducible checks, use the commands and prerequisites in [AGENTS.md](../AGENTS.md)
and [CI documentation](ci-cd.md), together with the current initialized-prefix
qualification profile in [.github/workflows/ci.yml](../.github/workflows/ci.yml).
Heavy native, unit, Rust, build and browser campaigns run serially. Production E2E
and offline checks require a production server and Chromium.
