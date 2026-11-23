# Security policy

[Polski](SECURITY.pl.md)

## Reporting a vulnerability

Sign in to GitHub and report security vulnerabilities to the maintainers through the
[private vulnerability reporting form](https://github.com/fettpl/rust-workshop/security/advisories/new).
You can also select **Report a vulnerability** on the repository's
[Security Advisories page](https://github.com/fettpl/rust-workshop/security/advisories).

Do not post vulnerability details, exploit code, credentials, learner exports,
or private attachments in issues, pull requests, reviews, or Actions logs.

Include the affected versions or commit, the impact, and a minimal reproduction
with secrets and personal data removed. Share sensitive supporting material only
through the private report.

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
