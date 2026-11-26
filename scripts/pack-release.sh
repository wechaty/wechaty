#!/usr/bin/env bash
#
# Builds the lockstep release tarballs and smoke-tests them together
# (wechaty/wechaty#3054 step 8). Usage:
#
#   scripts/pack-release.sh <output-dir>
#
# For each workspace package, in the root package.json order (dependencies
# first), it embeds the package metadata (scripts/generate-version.sh or
# scripts/generate-package-json.sh), builds dist/ and packs the tarball into
# <output-dir>. Then it installs all the tarballs into a temporary ESM project
# and runs scripts/fixtures/release-smoke.ts: every package reports the
# release version, and a wechaty bot over wechaty-puppet-mock answers ding
# with dong. It writes <output-dir>/release.json, which lists the tarballs in
# publish order with the version, for the npm workflow's publish job.
#
# The embedded metadata files are restored afterwards, including uncommitted
# edits. Run it from a clean `npm ci` install.
#
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "usage: $0 <output-dir>" >&2
  exit 2
fi

ROOT=$(cd "$(dirname "$0")/.." && pwd)
mkdir -p "$1"
OUT=$(cd "$1" && pwd)
WORK=$(mktemp -d "${TMPDIR:-/tmp}/wechaty-pack-release.XXXXXX")

# Embedded metadata files to put back on exit: "<file>\t<backup>" lines.
RESTORE_LIST="$WORK/restore.tsv"
: > "$RESTORE_LIST"
restore () {
  while IFS=$'\t' read -r file backup; do
    cp "$backup" "$file"
  done < "$RESTORE_LIST"
  rm -rf "$WORK"
}
trap restore EXIT

cd "$ROOT"
node scripts/lockstep.ts check
VERSION=$(node scripts/lockstep.ts version)

PACKAGES=()
while IFS= read -r name; do
  PACKAGES+=("$name")
done < <(node scripts/lockstep.ts order)

# The tarballs of this run. The smoke test installs exactly these, not every
# *.tgz in <output-dir>, which may hold older releases.
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
  npm pack --workspace "$name" --pack-destination "$OUT"
  tarball="$OUT/$name-$VERSION.tgz"
  if [ ! -f "$tarball" ]; then
    echo "npm pack did not produce $tarball" >&2
    exit 1
  fi
  TARBALLS+=("$tarball")
done

# release.json: what the publish job publishes, in this order.
node --input-type=module - "$OUT" "$VERSION" "${PACKAGES[@]}" <<'NODE'
import { existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
const [ out, version, ...names ] = process.argv.slice(2)
const packages = names.map(name => {
  const file = `${name}-${version}.tgz`
  if (!existsSync(join(out, file))) throw new Error(`missing tarball ${file}`)
  return { name, file }
})
writeFileSync(join(out, 'release.json'), JSON.stringify({ version, packages }, null, 2) + '\n')
NODE

# Smoke test: a fresh project installs only the release tarballs.
SMOKE="$WORK/smoke"
mkdir "$SMOKE"
cp scripts/fixtures/release-smoke.ts "$SMOKE"
cd "$SMOKE"
npm init -y > /dev/null
npm pkg set type=module
npm install "${TARBALLS[@]}" \
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
  release-smoke.ts

RELEASE_VERSION="$VERSION" node release-smoke.js
echo "Release $VERSION: ${#PACKAGES[@]} tarballs in $OUT passed the smoke test."
