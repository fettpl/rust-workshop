# Publishing Rust Workshop

The release destination is the independent GitHub repository **fettpl/rust-workshop**. The maintainer chooses when it becomes public. Acceptance includes running the course locally from a fresh anonymous clone. Hosting the web app or publishing an npm or Cargo package would be a separate project.

Keep the dated operator log, provider exports, raw backup, object maps and personal data outside the public repository. The [OSS release plan](oss-release.md), [license scope](licensing.md), [source assessment](rights-assessment.md) and [CI guide](ci-cd.md) describe the release inputs.

## 1. Freeze and recover

Record the immutable GitHub IDs, owner, names and visibility of the source and destination. Record the source default-branch SHA, every advertised ref, any forks, open PRs, releases, integrations and active runs. Compare the source main and open proposals with the candidate. Record a disposition and owner for each outstanding change. Repeat the inventory at cutover and account for any intervening work.

Make a private bundle of the source refs, hash it and restore into a fresh, independent bare repository. Compare all ref names and SHAs, then run `git fsck --full --strict`. Archive required issues, PRs, reviews, comments, release assets, Actions logs and artifacts separately. Record which provider data is expired or inaccessible. Check a representative restore and retain a recoverable backup outside the machine before deletion. Never import this backup or its provider metadata into public history.

## 2. Qualify the candidate

Restore only the approved cleaned branch into an empty Git database. Bind the commit, tree, history length and selected ref. Inspect its reachable and physical objects, commit identities and messages, paths, archives, LFS pointers and submodule links. Run the approved privacy policy and a secret scan, including historical archive contents. Investigate any finding privately. Refresh the evidence on the final merge, including the new PR's logs and artifacts.

Verify the README quick start in a clean checkout, the course and archive checks, the locked dependency audit, both licenses and `node scripts/verify-oss-provenance.mjs --release`. Retain the actual results. Verify that present-day clone instructions and security links resolve to the destination. Frozen historical receipts retain their original identities.

## 3. Prepare the destination and protect main

The owner selected the free route. Create an independent empty private repository. Verify its immutable ID, zero branches, pull requests, runs and artifacts, and keep the source private. The owner personally changes **only the empty destination** to public under **Settings → General → Danger Zone → Change repository visibility**, and leaves it uninitialized. Re-read its ID, visibility and emptiness. Record this shell handoff separately from authorization to disclose source: the first push of any content branch to a public repository immediately exposes its entire reachable history. [GitHub visibility effects](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility)

Use the public repository's available protection features. Reserve the first main commit for an empty Git tree with no previous parents, workflow or files. After owner authorization, initialize that empty main, then apply active main rules and verify their effective status before any course history is uploaded. A repository that cannot enforce the rules stays empty of course content. Determine from Billing whether additional products or nonstandard runners would incur charges; the owner decides about any spending.

Limit writes during bootstrap. Use standard GitHub-hosted runners, read-only default workflow tokens, full-SHA action pins, no workflow permission to approve PRs and approval for external fork runs. Keep secrets, write tokens and self-hosted runners away from fork workflows. Check Issues, the dependency graph, Dependabot alerts and the two update ecosystems defined in `.github/dependabot.yml`. Enable available public secret scanning and push protection after publication and verify their effective status. Obtain a separate decision before enabling a billed feature.

Require a PR, an independent approving reviewer with the necessary repository permission, dismissal of stale approvals, resolved conversations and successful up-to-date checks from GitHub Actions. Block force pushes and branch deletion, including administrative bypass. Establish the required check contexts from the actual workflow/matrix and verify their provider against the live runs. Until the full requirement is effective, maintain a merge freeze. Verify enforcement on the release PR. If a reviewer has not been designated, keep the branch protected and obtain their identity before proceeding with the protected PR.

Prepare the integration commit locally with the public empty root as one parent and the already cleaned release tip as the other. Verify both parents, the exact release tree, full object closure and scans using a fresh database. Export only the empty main and approved release branch; never push a mirror or raw objects from the old source. Before the **first public source push**, present that bundle and local checks to the owner for explicit acceptance. Upload the reviewed release branch and open a same-repository PR against protected main. A public staging branch already exposes code, and closing the PR cannot recall a clone.

## 4. Verify hosted CI and merge

Use the separate English release PR for the reviewed changes. Disposition automated reviews as well as human feedback. Record the PR head, base, tested merge SHA, workflow ID, run attempt and conclusions. The current workflow expands to eleven jobs: five single jobs (`verify`, `workspace-msrv`, `mini-grep-fuzz`, `profile-evidence`, `miri-safety`) and three variants each of `allocation-evidence` and `unsafe-borrowed-memory`. Check the effective job names from the live run. Require all eleven to finish successfully, including the native profiler, Miri and offline checks. Re-qualify a changed head.

Merge normally after GitHub enforces the requirements. Require the fresh push run on the exact resulting main SHA to pass all eleven. Verify the integrated tree and rerun privacy checks on the final history and provider surfaces. A failed gate keeps the public release unmerged and the old private repository intact. If the first PR does not start CI, inspect its event, permissions and check attribution. Fix the workflow through the protected path and preserve the freeze until the full hosted checks exist.

## 5. Publish and verify the OSS installation

The empty repository is already public on this route. Confirm the identity and exact accepted main SHA after merge. Record which new PRs, reviews, logs and artifacts are now visible and verify their privacy.

Recheck visibility, fork controls, rules, required checks and the approved CI configuration. Enable GitHub Private Vulnerability Reporting as soon as the empty repository is public and verify **Report a vulnerability** using a separate account. Update [SECURITY.md](../SECURITY.md) through a protected PR once verified. Use its green PR and resulting main run to cover post-publication verification where the SHAs match. Verify README, notices, archive downloads and the local quick start from a fresh anonymous clone, including launch, lesson navigation and offline recovery. Review newly public logs and artifacts. Record the accepted release SHA. [GitHub private reporting](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository)

## 6. Retire the old repository after acceptance

1. Verify the public release and a working local clone. Freeze old writes. Record the old and new immutable IDs again, check open work and private forks, and verify any consumers, integrations and links have moved. Compare the final ref and metadata inventory with the recoverable private backup. Stop on drift or missing unique data.
2. Disable Actions on the **old ID**, stop queued/in-progress runs and verify no nonterminal runs remain. Preserve needed logs and artifact contents before removing old runs, artifacts and caches. Enumerate remaining storage and document accrued usage in Billing. Check the effective state after each operation. This sequence stops new compute while backups and deletion are verified.
3. Present the owner with both identities, successful release evidence, backup checksums and location, fork inventory, storage snapshot and remaining limitations. Obtain the final confirmation naming the old repository and ID immediately before destructive cleanup and deletion. Deleting a private repository also deletes its private forks. [GitHub deletion procedure](https://docs.github.com/en/repositories/creating-and-managing-repositories/deleting-a-repository)
4. Delete only the old GitHub repository. Verify its absence with an authenticated owner lookup and list, confirm the destination still resolves by its recorded ID and the accepted main is still accessible anonymously. Check usage by old repository and usage date after billing data has updated. Record the last incurred usage and distinguish later reporting of earlier charges from new usage. [Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)

## Recovery and completion

Before the first public source push, preserve the last known-good bundle and resolve source findings privately. After publication, use a reviewed revert for code regressions. Treat any exposed secret as an incident, coordinate revocation and assess forks or cached copies. Returning a repository to private cannot recall public copies. Keep the old source recoverable privately until the owner accepts retirement. Record closure only after the public release, effective security features, local installation, source deletion and follow-up billing checks have been verified.
