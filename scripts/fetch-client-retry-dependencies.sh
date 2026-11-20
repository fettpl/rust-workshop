#!/usr/bin/env bash
set -euo pipefail

# Preload only the dependencies of the authored archives. Native verification
# keeps its separate offline and locked execution boundary.
archives="public/projects/durable-log-retry-workspace"
scratch=$(mktemp -d)
trap 'rm -rf -- "$scratch"' EXIT

for variant in starter solution; do
  directory="$scratch/$variant"
  unzip -q "$archives/$variant.zip" -d "$directory"
  cargo fetch --locked --manifest-path "$directory/durable-log-retry-workspace/Cargo.toml"
done
