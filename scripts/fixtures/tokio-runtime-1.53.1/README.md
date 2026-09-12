# Trusted Tokio fixture profile

This package fixes the dependencies used to verify repository-authored Tokio lessons. It is not an execution service and never accepts learner drafts, imports, paths or manifests. Tokio is pinned to 1.53.1 with only macros, rt and sync; a separate future stage will add timer/network APIs deliberately.

The verifier copies this manifest and Cargo.lock into a new temporary directory, writes reviewed lesson sources there and invokes fixed Cargo commands with --offline --locked. Maintainers may run the dedicated verifier with --fetch once to populate Cargo's dependency cache from this exact lockfile. The browser continues to use the fixed external Playground prelude and does not send this manifest or select a dependency profile.
