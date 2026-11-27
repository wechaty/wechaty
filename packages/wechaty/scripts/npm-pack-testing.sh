#!/usr/bin/env bash
#
# Packs wechaty and checks that the tarball works as a consumer sees it:
# installs it in a temporary ESM project together with the workspace
# packages it needs (scopelet, wechaty-puppet, wechaty-grpc, wechaty-token,
# wechaty-puppet-service and wechaty-puppet-mock), packed from the workspace
# into deps/ because 2.0 is not on npm yet. Then it type-checks and runs
# tests/fixtures/smoke-testing.ts. With TESTED_PACKAGE_OUTPUT_PATH set, it
# copies the tested wechaty tarball there (the npm workflow publishes it).
#
set -e

PACKAGE_DIR=$(pwd)
TMPDIR=$(mktemp -d "/tmp/npm-pack-testing.XXXXXX")
DEPS_DIR="$TMPDIR/deps"
mkdir -p "$DEPS_DIR"

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

# The smoke test requires a real VERSION, which generate-package-json.sh embeds
# in src/package-json.ts; put back exactly what was there, including
# uncommitted edits.
backup_file "$PACKAGE_DIR/src/package-json.ts"
backup_file "$PACKAGE_DIR/package.json"

for workspace in scopelet wechaty-puppet wechaty-grpc wechaty-token wechaty-puppet-service wechaty-puppet-mock; do
  backup_file "$PACKAGE_DIR/../$workspace/package.json"
done

./scripts/generate-package-json.sh
npm run dist
npm pack --pack-destination "$TMPDIR"
shopt -s nullglob
PACK_FILES=("$TMPDIR"/*.tgz)
if [ "${#PACK_FILES[@]}" -ne 1 ]; then
  echo "Expected exactly one package tarball, found ${#PACK_FILES[@]}." >&2
  exit 1
fi
PACK_FILE="${PACK_FILES[0]##*/}"
for workspace in scopelet wechaty-puppet wechaty-grpc wechaty-token wechaty-puppet-service wechaty-puppet-mock; do
  npm run dist --workspace "$workspace"
  npm pack --workspace "$workspace" --pack-destination "$DEPS_DIR"
done
cp tests/fixtures/smoke-testing.ts "$TMPDIR"

cd "$TMPDIR"

npm init -y
npm install --production "./$PACK_FILE" ./deps/*.tgz \
  @types/node \
  @typescript/native@npm:typescript@^7.0.2

#
# ES Modules
#
npm pkg set type=module

npx tsc \
  --target esnext \
  --module nodenext \
  \
  --moduleResolution nodenext \
  --verbatimModuleSyntax \
  --esModuleInterop \
  --lib esnext \
  --noEmitOnError \
  --noImplicitAny \
  --skipLibCheck \
  smoke-testing.ts

echo
echo "ES Module: pack testing..."
node smoke-testing.js

if [ -n "${TESTED_PACKAGE_OUTPUT_PATH:-}" ]; then
  cp "$PACK_FILE" "$TESTED_PACKAGE_OUTPUT_PATH"
fi
