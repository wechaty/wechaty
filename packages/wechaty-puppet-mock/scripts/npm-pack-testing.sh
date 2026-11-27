#!/usr/bin/env bash
#
# Packs wechaty-puppet-mock and checks that the tarball works as a consumer
# sees it: installs it in a temporary ESM project together with its
# wechaty-puppet peer (packed from the workspace, as 2.0 is not on npm yet),
# type-checks a smoke test against the published types, and runs it.
#
set -euo pipefail

PACKAGE_DIR=$(pwd)
TMPDIR=$(mktemp -d "/tmp/npm-pack-testing.XXXXXX")

RESTORE_LIST="$TMPDIR/restore.tsv"
: > "$RESTORE_LIST"

backup_file () {
  local file=$1
  if [ -f "$file" ]; then
    local backup="$TMPDIR/$(echo "$file" | tr '/.' '__')"
    cp "$file" "$backup"
    printf "%s\t%s\n" "$file" "$backup" >> "$RESTORE_LIST"
  fi
}

cleanup () {
  while IFS=$'\t' read -r file backup; do
    [ -f "$backup" ] && cp "$backup" "$file"
  done < "$RESTORE_LIST"
  rm -rf "$TMPDIR"
}
trap cleanup EXIT INT TERM

# generate-package-json.sh rewrites src/package-json.ts; put back exactly what
# was there, including uncommitted edits.
backup_file "$PACKAGE_DIR/src/package-json.ts"
backup_file "$PACKAGE_DIR/package.json"

backup_file "$PACKAGE_DIR/../wechaty-puppet/package.json"

./scripts/generate-package-json.sh
npm run dist
npm pack --pack-destination "$TMPDIR"
npm run dist --workspace wechaty-puppet
npm pack --workspace wechaty-puppet --pack-destination "$TMPDIR"
cp tests/fixtures/smoke-testing.ts "$TMPDIR"

cd "$TMPDIR"
npm init -y > /dev/null
npm pkg set type=module
npm install ./wechaty-puppet-mock-*.tgz ./wechaty-puppet-2*.tgz \
  @types/node \
  @typescript/native@npm:typescript@^7.0.2

npx tsc \
  --types node \
  --target esnext \
  --module nodenext \
  --moduleResolution nodenext \
  --verbatimModuleSyntax \
  --lib esnext,dom \
  --noEmitOnError \
  --noImplicitAny \
  --skipLibCheck \
  smoke-testing.ts

echo
echo "ES Module: pack testing..."
node smoke-testing.js
