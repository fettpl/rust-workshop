# Local development queue

Date: 2026-10-22

This queue starts from main commit `7c760e3`. The local native-test maintenance
milestone is being developed on a separate branch while the GitHub Actions
billing block is expected to remain until the 2026-11-01 reset. Full-main jobs
never started during this period; that is an infrastructure scheduling result,
not a source failure or evidence about the application.

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
2. disjoint-region transfer work — authored; integrated local acceptance pending;
3. `Slot` transfer work;
4. variance transfer work;
5. foundation reconciliation after those changes.

Future feature work remains split into separate feature branches and future
pull requests. It must not be folded into the maintenance patch. Once Actions
is available again, each future integration requires an independent review and
fresh required checks on the exact feature head and on the resulting `main`
commit. Historical runs remain historical observations.

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
findings; the full integrated campaign remains pending. Slot implementation waits
for this local milestone. Remote acceptance stays deferred.
