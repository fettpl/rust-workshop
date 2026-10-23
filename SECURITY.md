# Security policy (release draft)

## Reporting a vulnerability

A private vulnerability-reporting channel has not yet been verified for this
repository. Do not put vulnerability details, exploit code, credentials,
learner exports, or private attachments in an issue, pull request, review, or
Actions log. This draft does not promise a private contact address or response
time.

If you already have a trusted private channel with the maintainer, ask there
how to disclose the report securely. Otherwise, do not post the details
publicly while the reporting channel is unavailable. The maintainer must
resolve this gap as part of the public-release process.

For the planned GitHub reporting route, first open the repository's
[Security Advisories page](https://github.com/fettpl/rustcrushcourse/security/advisories).
Only use **Report a vulnerability** when that button is actually available;
an ordinary issue is not a private substitute. Include affected versions or
commit, impact, and a minimal reproduction without live secrets or personal
data. Share any sensitive supporting material only through the verified
private reporting channel.

## Maintainer release gate

The maintainer selected GitHub Private Vulnerability Reporting for activation
and verification immediately after manually making the repository public.
This is a future activation choice, not an enabled or verified channel today.

GitHub private vulnerability reporting is an opt-in feature for public
repositories. It has not been verified as available here. Before declaring
the public release complete, the maintainer must enable it and verify the
reporting form from a separate account. Replace this draft status with the
verified route. If secure reporting is required before visibility changes,
provide and verify an alternative private contact first; do not invent one.
See [GitHub's configuration instructions](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository).

## Scope and limitations

The web application forwards learner Rust to the isolated remote runner
through `POST /api/run`; it does not execute learner code locally. See
[the runner boundary](docs/runner.md). Offline availability does not provide
local Rust execution. Browser progress and imported evidence are not an
external assessment or trusted identity system.

Maintainer native verification is restricted to fixed repository-authored
fixtures. Undefined-behavior negative fixtures must never execute natively;
only their qualified Miri and metadata checks are permitted. External PR code
must not receive repository secrets, privileged workflow execution, or access
to maintainer machines.

There is no published supported-version or response-time commitment. Keep
security reports distinct from ordinary non-sensitive bugs, which can use
the normal contribution process.
