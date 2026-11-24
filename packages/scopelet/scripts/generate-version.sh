#!/usr/bin/env bash
#
# Writes the package version from package.json into src/version.ts, which keeps
# a 0.0.0 placeholder in git (see src/version.test.ts). Run it before packing;
# scripts/npm-pack-testing.sh does.
#
set -euo pipefail

SRC_VERSION_TS_FILE='src/version.ts'

[ -f "${SRC_VERSION_TS_FILE}" ] || {
  echo "${SRC_VERSION_TS_FILE} not found" >&2
  exit 1
}

VERSION=$(node -p "require('./package.json').version")

cat <<_SRC_ > "${SRC_VERSION_TS_FILE}"
/**
 * The package version. Git keeps the \`0.0.0\` placeholder (checked by
 * \`version.test.ts\`); \`scripts/generate-version.sh\` overwrites this file from
 * \`package.json\` before packing.
 */
export const VERSION: string = '${VERSION}'
_SRC_
