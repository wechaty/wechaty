#!/usr/bin/env bash
#
# Builds the lockstep release tarballs and smoke-tests them inside headless Chromium
# as an external browser consumer (Wechaty 2.0 roadmap Stage 2, issue #3107).
#
# Usage:
#   scripts/pack-browser-test.sh [tarballs-dir]
#
# If [tarballs-dir] is provided and contains *.tgz files, it reuses those tarballs;
# otherwise, it checks lockstep metadata, embeds release versions, builds dist/
# across all workspaces, and packs the tarballs into a temporary staging directory.
#
# Next, it sets up an isolated temporary consumer project, installs the tarballs,
# compiles the browser smoke test with TypeScript (under standard DOM/ESNext lib
# definitions without @types/node), and runs the test in Chromium via Modern Web
# Test Runner. Finally, it executes a negative probe to guarantee that attempts
# to import Node built-ins fail immediately.
#
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
WORK=$(mktemp -d "${TMPDIR:-/tmp}/wechaty-pack-browser.XXXXXX")

# Track embedded metadata backups to restore on exit: "<file>\t<backup>" lines.
RESTORE_LIST="$WORK/restore.tsv"
: > "$RESTORE_LIST"
restore () {
  while IFS=$'\t' read -r file backup; do
    if [ -f "$backup" ]; then
      cp "$backup" "$file"
    fi
  done < "$RESTORE_LIST"
  rm -rf "$WORK"
}
trap restore EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

cd "$ROOT"

TARBALLS_DIR="${1:-}"

if [ -n "$TARBALLS_DIR" ]; then
  if [ ! -d "$TARBALLS_DIR" ]; then
    echo "Tarballs directory does not exist: $TARBALLS_DIR" >&2
    exit 1
  fi
  TARBALLS_DIR=$(cd "$TARBALLS_DIR" && pwd)
  echo "Using existing tarballs from: $TARBALLS_DIR"
  TARBALLS=()
  for tb in "$TARBALLS_DIR"/*.tgz; do
    if [ -f "$tb" ]; then
      TARBALLS+=("$tb")
    fi
  done
  if [ "${#TARBALLS[@]}" -eq 0 ]; then
    echo "No tarballs found in $TARBALLS_DIR" >&2
    exit 1
  fi
else
  TARBALLS_DIR="$WORK/tarballs"
  mkdir -p "$TARBALLS_DIR"
  echo "Building and packing workspace packages into: $TARBALLS_DIR"

  node scripts/lockstep.ts check
  VERSION=$(node scripts/lockstep.ts version)

  PACKAGES=()
  while IFS= read -r name; do
    PACKAGES+=("$name")
  done < <(node scripts/lockstep.ts order)

  TARBALLS=()
  for name in "${PACKAGES[@]}"; do
    dir="$ROOT/packages/$name"
    if [ -x "$dir/scripts/generate-version.sh" ]; then
      generator=scripts/generate-version.sh
      embedded=src/version.ts
    else
      generator=scripts/generate-package-json.sh
      embedded=src/package-json.ts
    fi
    backup="$WORK/$name.embedded"
    cp "$dir/$embedded" "$backup"
    printf '%s\t%s\n' "$dir/$embedded" "$backup" >> "$RESTORE_LIST"
    pkg_backup="$WORK/$name.package-json"
    cp "$dir/package.json" "$pkg_backup"
    printf '%s\t%s\n' "$dir/package.json" "$pkg_backup" >> "$RESTORE_LIST"

    (cd "$dir" && "./$generator")
    npm run dist --workspace "$name"
    npm pack --workspace "$name" --pack-destination "$TARBALLS_DIR"
    tarball="$TARBALLS_DIR/$name-$VERSION.tgz"
    if [ ! -f "$tarball" ]; then
      echo "npm pack did not produce $tarball" >&2
      exit 1
    fi
    TARBALLS+=("$tarball")
  done
fi

echo "Installing ${#TARBALLS[@]} packed tarballs in clean consumer project..."
CONSUMER="$WORK/consumer"
mkdir -p "$CONSUMER"
cp "$ROOT/scripts/fixtures/browser-consumer-smoke.ts" "$CONSUMER/"

cd "$CONSUMER"
npm init -y > /dev/null
npm pkg set type=module

# Install the packed tarballs alongside published external dependencies from the npm
# registry to test external consumption under real semver resolution rules.
npm install --ignore-scripts \
  "${TARBALLS[@]}" \
  'file-box@^2.3.0' \
  '@bufbuild/protobuf@^2.17.0' \
  '@typescript/native@npm:typescript@^7.0.2'

echo "Type-checking browser consumer fixture with TypeScript (DOM + ESNext lib)..."
npx tsc \
  --target esnext \
  --module nodenext \
  --moduleResolution nodenext \
  --verbatimModuleSyntax \
  --lib esnext,dom \
  --noEmitOnError \
  --noImplicitAny \
  --skipLibCheck \
  browser-consumer-smoke.ts

echo "Executing browser consumer smoke tests in Chromium via Modern Web Test Runner..."
CONSUMER_DIR="$CONSUMER" "$ROOT/node_modules/.bin/wtr" \
  --config "$ROOT/scripts/fixtures/web-test-runner.consumer.config.js"

echo "Verifying negative failure probe (importing Node built-ins must fail in browser consumer)..."
cat <<'PROBE' > "$CONSUMER/negative-probe.js"
import 'node:fs'
it('should fail in browser without node built-ins', () => {})
PROBE

set +e
PROBE_OUTPUT=$(CONSUMER_DIR="$CONSUMER" "$ROOT/node_modules/.bin/wtr" "$CONSUMER/negative-probe.js" \
  --config "$ROOT/scripts/fixtures/web-test-runner.consumer.config.js" 2>&1)
PROBE_STATUS=$?
set -e

if [ "$PROBE_STATUS" -eq 0 ]; then
  echo "Error: The browser runner accepted an import of a Node built-in ('node:fs')!" >&2
  exit 1
fi

# In headless Chromium, an unresolvable Node built-in import causes the browser's dynamic import
# to fail with 'Could not import your test module' / 'Failed to fetch dynamically imported module'.
if ! grep -E -q '(Could not import your test module|Failed to fetch dynamically imported module)' <<< "$PROBE_OUTPUT"; then
  echo "Error: Negative probe failed for an unexpected reason, output did not indicate module import failure:" >&2
  echo "$PROBE_OUTPUT" >&2
  exit 1
fi
echo "Verified: browser consumer correctly rejects Node built-in imports."

echo "All packed browser consumer smoke tests passed successfully in Chromium!"
