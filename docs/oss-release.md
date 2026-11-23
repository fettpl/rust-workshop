# OSS readiness and public release plan

[Polski](oss-release.pl.md)

The approved publication target is the independent repository `fettpl/rust-workshop`.
The operational sequence and retirement criteria are maintained in the
[publication handoff](publication-handoff.md). This document records the
curriculum, licensing and review work that prepares a candidate for that handoff.
The release delivers source and a verified local application.

## Goal and scope

Prepare a truthful English entry point for a Polish, local-first Rust learning
workspace, practical contributor and agent guidance, explicit code/content
licenses, and a reviewable public-release package. The course assumes basic
programming knowledge and no previous Rust experience. Public source availability
is separate from hosting, package publication and evidence of learning outcomes.

The maintainer authorizes local preparation and has approved MIT software,
CC BY 4.0 teaching material, the three existing narrow Cargo exceptions, and
the project credit Pixel Media Workshop Paweł Borawski (starting in 2026).
These approvals do not establish rights in all AI-generated or third-party
material. Source provenance, privacy remediation and public visibility remain
separate gates. The [scoped provenance inventory](oss-provenance.md) checks
tracked course/public-file coverage and hashes. The [bounded rights
assessment](rights-assessment.md) records the course source review as complete
within its stated comparison scope, with no identified actionable
copied-expression case; it does not establish exhaustive rights clearance. On
24 October 2026 the maintainer accepted the documented generated icon origin
and confirmed that, to their knowledge, no additional external icon file or
reference was supplied. Both scoped provenance blockers are resolved; wider
release gates remain separate.
GitHub Private Vulnerability Reporting is enabled for the public repository.
The [security policy](../SECURITY.md) links to the private form and describes
how to report a vulnerability. No paid infrastructure,
billing changes, package publication, deployment, history rewriting or removal of
evidence is authorized by this plan. Keep private audit inputs and resume state
in ignored handoff storage, never in the public package.

## Execution plan

Use independent review for the actual release candidate and preserve the reviewed
SHA. Contributor tooling is optional.

1. **Inspect the actual release surface.** Inventory current files, Git history,
   published branches/tags, issues, PRs/reviews, Actions history, available logs
   and artifacts. Record coverage, expired/unavailable evidence and unresolved
   findings privately. Never print secret values. Exposed credentials require
   revocation; deleting the current file alone is insufficient.
2. **Rewrite the human entry point.** Replace `README.md`; add `CONTRIBUTING.md`
   and, if useful, `.github/pull_request_template.md`. Check claims against
   `src/content/course.ts`, project definitions, persistence and runner code.
   Separate app setup, downloaded Cargo projects and maintainer prerequisites.
3. **Rewrite operational guidance.** Replace `AGENTS.md` after mapping every
   existing binding requirement. Preserve the Next.js managed block. Update
   `docs/ci-cd.md` or a linked specialist guide for current commands and native
   qualification, keeping root instructions concise and portable.
4. **Maintain the approved licensing package.** Preserve official full MIT text in
   `LICENSE`, full CC BY 4.0 text in `LICENSE-CONTENT`, explicit mixed-file and
   attribution rules in `docs/licensing.md`, and third-party notices where
   required. Code, tests, scripts and programming examples use MIT; authored
   narrative, exercise descriptions, explanations and illustrations use CC BY
   4.0. Existing third-party licenses remain effective. Neither is a blanket
   alternative license for the whole repository. The approved project credit
   starts in 2026; retain only rights the project can actually grant. Preserve
   the three existing authored Cargo `MIT OR Apache-2.0` declarations as the
   approved narrow exceptions, with their full Apache text; do not
   extend that option to the whole repository.
5. **Cover distributions and security.** Extend `scripts/project-archive.ts`
   through the generator, with focused archive tests, to include appropriate
   license/attribution notices in both variants of every project archive. Keep
   authored Rust payloads, historical IDs, course hashes and evidence unchanged.
   Add `SECURITY.md` stating the actual reporting route or its unavailability,
   without invented contacts or response promises. GitHub private reporting is
   an opt-in public-repository feature: verify any required prepublication
   private contact before the visibility handoff, or obtain an explicit
   maintainer decision on enabling and verifying GitHub reporting immediately
   after publication. An unavailable route must not be described as ready.
   Audit fork workflows, full commit pins, permissions,
   secrets, caches, artifacts and runner trust. No privileged fork execution or
   maintainer-machine execution; no test reduction just to reduce minutes.
6. **Verify and independently review.** Run the clean-checkout quick start,
   documented relevant commands, link checks and privacy/license inventory.
   For generator or workflow changes, run meaningful focused regressions,
   `npm run content:packages`, `npm run typecheck`, `npm run lint`,
   `npm run content:check`, affected package checks and the appropriate broader
   checks. Documentation-only checks must not mirror prose in unit tests.
   Record actual failures, skips and infrastructure limits. Obtain independent
   README, AGENTS, licensing/publication and fork-security reviews.
7. **Recorded decisions, integration and publication.** The maintainer's license
   and credit decision is recorded above. Any change to that approved scope
   requires a new decision; do not ask again for the unchanged split. Present
   the files, diff and remaining provenance/privacy findings for release review.
   Finalize English local preparation commits after appropriate verification
   and independent review; these do not clear publication gates. The separate
   PR still requires independent/automated-review disposition, fresh required
   checks on the exact PR head, ordinary merge and checks on resulting `main`.
   If Actions is unavailable, retain the work locally; do not bypass the gates.
   The maintainer personally makes the verified empty shell public on the approved free route.
   Authorize disclosure of the cleaned source separately before its first public push. Reverify public access and CI after
   that human confirmation.

## Local completion and deferred publication gates

Complete all reversible local preparation before the integration handoff: accurate
README/contributor/agent instructions; approved license scope and notices;
recorded bounded source/icon assessment; generated-archive checks; static fork
workflow review; a fresh locked setup and appropriate application, browser and
offline checks; and independent review of the exact candidate. Retain dated
receipts with actual versions, source bindings, warnings, skips and coverage
privately. Do not turn this plan into a claim that unexecuted checks passed.

The scoped provenance validator returning zero covers its recorded inventory
only. The local history-redaction trial is also a separate bounded result. An
ordinary merge cannot erase old remote ancestry, branches, provider refs or
comments, and trial approval does not authorize remote rewriting or deletion.
Review the preserved public-surface exports with their dates and missing-data
limits, then resolve and recheck actual provider surfaces under separate
authorization before publication. Keep existing backups and historical evidence.

The [publication handoff](publication-handoff.md) governs the empty public shell,
authorization to disclose source, the protected release PR, green main and
retirement of the previous repository. The maintainer confirms destructive
cleanup against the recorded source ID after acceptance of the replacement.

## Definition of Done

- [ ] README describes existing capabilities accurately and its clean-checkout
      quick start works. Learner language, storage, offline and execution limits
      are clear. No professional-readiness or educational-efficacy guarantee.
- [ ] AGENTS is practical and preserves every still-binding requirement,
      managed block, persistent identity and evidence boundary.
- [x] The maintainer explicitly approves license selection and copyright credit
      (23 October 2026); source-rights verification remains a separate gate.
- [ ] Code/content scope, mixed TypeScript files, downloaded archives and
      third-party obligations are unambiguous.
- [ ] Public-surface audit coverage is recorded and no publication blocker remains.
- [ ] Appropriate checks and independent reviews pass; significant automated
      review feedback is technically verified and resolved.
- [ ] A separate PR is merged after fresh required exact-head checks; resulting
      `main` checks pass.
- [ ] The maintainer personally makes the empty shell public, verifies protection,
      and authorizes the reviewed source before its first public push.
- [ ] Anonymous access, README/licenses/links, branch protection, private security
      reporting, fork PR controls and standard runner configuration are checked
      after publication, with one justified verification run.
- [ ] Remaining limitations are explicit and the course queue is updated.

- [ ] The previous private repository has been backed up, restored in isolation,
      retired after acceptance of the public release, and checked for further Actions usage.

## Official references

Reviewed 22 October 2026. These sources describe external behavior and license
terms; the split license and review sequence above are maintainer/project choices.
Recheck live GitHub instructions and account/repository state at the actual handoff.

- [AGENTS.md format](https://agents.md/): Markdown guidance, no required schema;
  keep human onboarding in README and operational detail in AGENTS.
- [MIT license](https://opensource.org/license/mit) and
  [CC BY 4.0 legal code](https://creativecommons.org/licenses/by/4.0/legalcode.txt).
- [GitHub secure use](https://docs.github.com/en/actions/reference/security/secure-use):
  least privilege, untrusted pull-request boundaries and immutable action pins.
- [Repository visibility](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility):
  public visibility exposes Actions history and logs as well as repository history.
- [Private vulnerability reporting](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository):
  verify the actual reporting button and enablement; do not invent a channel.
- [Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions):
  standard GitHub-hosted runners in public repositories have free use; storage
  and other billed products remain distinct. Public visibility is not proof
  that existing account restrictions or charges have disappeared. Recheck
  current rules after publication; do not change billing settings automatically.
