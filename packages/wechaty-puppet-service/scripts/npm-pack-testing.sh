#!/usr/bin/env bash
#
# Packs wechaty-puppet-service and checks that the tarball works as a consumer
# sees it: installs it in a temporary ESM project together with the workspace
# packages it needs (wechaty-puppet, wechaty-grpc, wechaty-token, and
# wechaty-puppet-mock for the smoke test), packed from the workspace as 2.0 is
# not on npm yet. Then it type-checks a smoke test against the published types
# and runs a gRPC round trip between the packed client and server.
#
set -euo pipefail

PACKAGE_DIR=$(pwd)
TMPDIR=$(mktemp -d "/tmp/npm-pack-testing.XXXXXX")

RESTORE_LIST="$TMPDIR/restore.tsv"
: > "$RESTORE_LIST"

backup_file () {
  local file=$1
  if [ -f "$file" ]; then
    local backup
    backup="$TMPDIR/$(echo "$file" | tr '/.' '__')"
    cp "$file" "$backup"
    printf "%s\t%s\n" "$file" "$backup" >> "$RESTORE_LIST"
  fi
}

cleanup () {
  local sig=${1:-0}
  trap - EXIT INT TERM
  if [ -f "$RESTORE_LIST" ]; then
    while IFS=$'\t' read -r file backup; do
      [ -f "$backup" ] && cp "$backup" "$file"
    done < "$RESTORE_LIST"
  fi
  [ -d "$TMPDIR" ] && rm -rf "$TMPDIR"
  if [ "$sig" -ne 0 ]; then
    kill -s "$sig" $$
  fi
}
trap 'cleanup' EXIT
trap 'cleanup INT' INT
trap 'cleanup TERM' TERM

# generate-package-json.sh rewrites src/package-json.ts; put back exactly what
# was there, including uncommitted edits.
backup_file "$PACKAGE_DIR/src/package-json.ts"
backup_file "$PACKAGE_DIR/package.json"

for workspace in wechaty-puppet wechaty-grpc wechaty-token wechaty-puppet-mock; do
  backup_file "$PACKAGE_DIR/../$workspace/package.json"
done

./scripts/generate-package-json.sh
npm run dist
npm pack --pack-destination "$TMPDIR"
for workspace in wechaty-puppet wechaty-grpc wechaty-token wechaty-puppet-mock; do
  npm run dist --workspace "$workspace"
  npm pack --workspace "$workspace" --pack-destination "$TMPDIR"
done
cp tests/fixtures/smoke-testing.ts "$TMPDIR"

cd "$TMPDIR"
npm init -y > /dev/null
npm pkg set type=module
npm install ./wechaty-*.tgz \
  @types/node \
  @typescript/native@npm:typescript@^7.0.2

npx tsc \
  --target esnext \
  --module nodenext \
  --moduleResolution nodenext \
  --verbatimModuleSyntax \
  --lib esnext \
  --noEmitOnError \
  --noImplicitAny \
  --skipLibCheck \
  smoke-testing.ts

echo
echo "ES Module: pack testing..."
node smoke-testing.js
