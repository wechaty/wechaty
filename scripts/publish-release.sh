#!/usr/bin/env bash
#
# Publishes the lockstep release tarballs that scripts/pack-release.sh built
# and smoke-tested (wechaty/wechaty#3054 step 8). Usage:
#
#   scripts/publish-release.sh <release-dir> <npm-dist-tag>
#
# It publishes in <release-dir>/release.json order (dependencies first), so
# a package never reaches npm before the packages it depends on. A version
# already on npm is skipped, so a failed run can be re-run: the npm workflow
# publishes with Trusted Publishing, which each package must allow for this
# repository and workflow. With DRY_RUN=1 it prints the npm commands instead.
#
set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "usage: $0 <release-dir> <npm-dist-tag>" >&2
  exit 2
fi
RELEASE_DIR=$1
DIST_TAG=$2

VERSION=$(node -p "require(process.argv[1]).version" "$(cd "$RELEASE_DIR" && pwd)/release.json")
# shellcheck disable=SC2016 # `${...}` below is a JavaScript template literal.
mapfile -t ENTRIES < <(node -e '
  const release = require(process.argv[1])
  for (const { name, file } of release.packages) console.log(`${name}\t${file}`)
' "$(cd "$RELEASE_DIR" && pwd)/release.json")

for entry in "${ENTRIES[@]}"; do
  IFS=$'\t' read -r name file <<< "$entry"
  # `npm view <name>@<version> version` prints the version only when it exists.
  if [ -n "$(npm view "$name@$VERSION" version 2>/dev/null)" ]; then
    echo "$name@$VERSION is already on npm; skipping."
    continue
  fi
  if [ "${DRY_RUN:-}" = 1 ]; then
    echo "DRY_RUN: npm publish $RELEASE_DIR/$file --tag $DIST_TAG"
  else
    npm publish "$RELEASE_DIR/$file" --tag "$DIST_TAG"
  fi
done
