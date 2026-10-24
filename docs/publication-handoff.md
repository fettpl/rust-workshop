# Human publication handoff

Status: a procedure for a future gated handoff. Local preparation does not
mean the repository can be published now. The full release plan is
[oss-release.md](oss-release.md); current CI and fork boundaries are in
[ci-cd.md](ci-cd.md).

## Before asking the maintainer to publish

Require the separate OSS PR to pass independent review, disposition of
significant automated feedback, and fresh required checks on its exact head.
Use the normal merge path and verify fresh checks on the resulting `main`.
Confirm that README, `LICENSE`, `LICENSE-CONTENT`, and
[the license scope](licensing.md) are present on that commit. The approved
split is MIT software and CC BY 4.0 teaching material, with the documented
narrow exceptions and third-party obligations. No new license choice is
needed during the visibility change.

Resolve public-surface blockers across tracked files, published history,
branches/tags, issues, PRs/reviews, Actions history, logs and retained
artifacts. Record actual coverage, expired/unavailable material and residual
limitations privately; a local scan is not a live remote audit. Preserve prior
evidence. Do not rewrite history, delete records, or claim exhaustive rights
clearance from the bounded source/icon review. Exposed live credentials need
revocation through an authorized process.

A local history-redaction trial is preparation evidence, not authorization to
rewrite published refs or remove provider-side records. An ordinary merge does
not erase existing ancestry, stale branches, PR refs or comments. Resolve the
publication scope and obtain any separately required maintainer authorization
before changing those surfaces; keep recoverable backups and reverify the
provider state afterwards. Do not publish while that remediation is pending.

Check effective branch protection/rulesets, required checks, fork approvals,
allowed actions and standard hosted runners in the live UI. Recheck current
[GitHub visibility instructions](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility)
and the actual UI labels before issuing the handoff. GitHub currently warns
that private-to-public conversion exposes Actions history/logs and disables
push rulesets; do not assume existing protection remains effective. Unavailable
CI, unresolved blockers or unverified required settings keep this gate open.

## The maintainer's manual action

Only after the gates above are satisfied, deliver this message and the
verified steps below in Polish:

> Pakiet OSS jest gotowy. Proszę teraz upublicznić repozytorium
> fettpl/rustcrushcourse według poniższych kroków. Zmiana ujawni również
> historię repozytorium i Actions. Nie wykonam jej za Ciebie.

1. Open `fettpl/rustcrushcourse` and confirm that `main` contains README,
   `LICENSE`, `LICENSE-CONTENT`, and the license-scope explanation.
2. Confirm that the code license is **MIT License** and teaching material has
   its separate **CC BY 4.0** license. The licenses came through the reviewed
   PR; do not create another license or commit directly to `main`. If a code
   license template selector is needed, **MIT License** is the approved option;
   it does not replace the separate content license.
3. Open **Settings → General**, then scroll to **Danger Zone**.
4. Beside **Change repository visibility**, select **Change visibility**.
5. Select public visibility, confirm the correct repository and read the
   effects. Confirm **I have read and understand these effects**.
6. Select **Make this repository public** and complete any additional GitHub
   confirmation or authentication yourself.

Publication remains the maintainer's personal action. Public source does not
publish the app, packages or a hosted service.

## Immediately after human confirmation

The maintainer has selected GitHub private vulnerability reporting for
activation immediately after publication. Enable it using the current
[repository configuration instructions](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository)
(currently **Settings → Advanced Security → Private vulnerability reporting
→ Enable**). Verify the **Report a vulnerability** form from a separate
account, then update [SECURITY.md](../SECURITY.md) through the ordinary review
path. Until verified, its draft status remains accurate; do not invent a
private contact or submit a fake vulnerability report.

Verify actual public visibility and anonymous access to README, both licenses,
links and course/project materials. Recheck effective `main` protections and
required checks, fork approval controls and standard runner configuration.
Perform one justified verification run and review its result on the actual
commit. Recheck [current Actions billing rules](https://docs.github.com/en/billing/concepts/product-billing/github-actions):
standard public hosted execution is free, while storage and other products
have separate rules. Visibility does not establish that earlier charges or
account restrictions disappeared. Any proposed billing/budget change requires
a separate maintainer decision; never change it automatically.

Record the actual results and remaining limitations, update milestone status
and the approved course queue, and declare publication complete only when
these checks and the verified security route are finished. If a check fails,
report the concrete blocker and preserve the evidence.

External instructions checked 24 October 2026. The exact UI and effective
settings must be verified again when this future handoff occurs.
