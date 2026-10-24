# Local development queue

Date: 2026-10-22; local continuation updated 2026-10-24 (UTC).

This queue starts from main commit `7c760e3`. The local native-test maintenance
milestone is complete on a separate branch. Disjoint-range integration has
completed its local verification and independent review. The GitHub Actions
billing block is expected to remain until the 2026-11-01 reset. Full-main jobs
never started during this period; that is an infrastructure scheduling result,
not a source failure or evidence about the application. GitHub Actions acceptance,
remote integration, release and publication remain pending.

## Maintainer-authorized continuation

On 24 October 2026 the maintainer explicitly authorized continuing the approved
course order after the independently reviewed local OSS preparation. Public OSS
release waits for usable Actions and its separate privacy/integration/human
publication gates. The preserved OSS candidate is not modified by this course
feature. Continue on separate local branches without push, project remote
changes or main integration; this decision does not bypass future CI gates.

## Local workflow

Each milestone stays on its own local feature branch. The contributor runs the
focused checks first, then the required lint, typecheck, content validation and
full test suite with the documented trusted-fixture prerequisites. Heavy checks
run serially. The contributor records exact commands, pass/skip/failure counts,
tool versions and infrastructure limits, keeps learner/imported code outside
local native execution, self-reviews the diff, and requests an independent
review before handing the result to the controller.

The local definition of done is a scoped, reviewable patch with fresh local
evidence, an English commit and a portable report. A local pass does not claim
GitHub Actions acceptance, a green main branch, release readiness, broader
coverage, or learner achievement.

## Queue order

The queue is maintained in this order:

1. local maintenance and verification hygiene;
2. disjoint-region transfer work — authored; local verification and independent
   review complete;
3. OSS readiness and public release — local preparation reviewed and complete;
   public release deferred behind its separate external gates;
4. `Slot` lazy-initialization transfer — current separate local feature candidate;
5. `MutSlot` variance transfer work;
6. foundation reconciliation after those changes.

Future feature work remains split into separate feature branches and future
pull requests. The OSS milestone must wait for this disjoint chapter's local
checks, independent review and English commit, and must remain separate from
new chapters, dependency updates and application redesign. Local preparation is
complete; the maintainer continuation above permits Slot work while publication
is deferred. It requires license
and copyright approval, exact-head CI and resulting-`main` checks when Actions
is available, human publication on GitHub, and post-publication checks. During
the current Actions hold, keep that work local: do not publish, change billing,
or create hosting. Once Actions is available again, each integration requires
independent review and fresh required checks on the exact feature head and on
the resulting `main` commit. Historical runs remain historical observations.

## Recovery and scheduling boundary

Keep an offline backup of the local repository, including `.git`, outside
iCloud before cleanup or machine migration. Do not create new scheduled
automation for this queue. Local maintenance is complete at source commit
`d12d789fc3e35bb7ef4b8cbacb571079a2570a4e`: the fresh full suite recorded
1,426 passes and one explicit opt-in skip; lint recorded zero errors and 29
existing warnings; typecheck and content validation passed. Independent review
is approved with no findings. Remote acceptance remains on hold, and main
checks and a main merge remain unexecuted. When the controller creates a local
Git bundle, retain it with the offline recovery materials; this document does
not claim that the bundle already exists.

## Disjoint-range candidate

The [portable feature contract and evidence boundary](disjoint-range-transfer-evidence.md)
describes the appended model/primary, unchanged historical IDs and assistance
policy, bounded native witnesses and current local acceptance status. The source
adds two steps (1,275 to 1,277) while retaining 48 modules, 192 lessons, 194 concepts
and 349 sources. Independent review has resolved the initial model/wording
findings; local unit, Rust, build, production E2E and offline checks are complete,
with independent review complete. OSS local preparation followed this milestone. The maintainer continuation
above now permits Slot implementation while public release and remote acceptance
stay deferred. The [Slot transfer contract](slot-lazy-init-transfer-evidence.md)
records the next distinct primary family and its verification boundaries.
