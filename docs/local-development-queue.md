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
2. disjoint-region transfer work;
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
automation for this queue. The initial maintenance status is pending
independent review; the controller records the final local evidence after that
review and preserves any concerns or limitations.
