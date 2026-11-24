#!/usr/bin/env bash

# Installs the verified Linux x86-64 release on a GitHub-hosted runner.
set -euo pipefail
release="cargo-audit-x86_64-unknown-linux-gnu-v0.23.0"
tool_dir="$(mktemp -d "${RUNNER_TEMP}/rustsec-tool.XXXXXX")"
archive="${tool_dir}/${release}.tgz"
curl --fail --silent --show-error --location --retry 2 --max-time 120 \
  --output "$archive" "https://github.com/RustSec/rustsec/releases/download/cargo-audit/v0.23.0/${release}.tgz"
# SHA-256 from the upstream cargo-audit v0.23.0 release asset.
printf '%s  %s\n' b77993532b253fcbf550996d7716465ec3d734d4e74e7f87bfb65a19add0fb59 "$archive" | sha256sum --check --strict
tar --extract --gzip --file "$archive" --directory "$tool_dir" --strip-components=1 "${release}/cargo-audit"
printf '%s\n' "$tool_dir" >> "$GITHUB_PATH"
