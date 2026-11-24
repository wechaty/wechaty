#!/usr/bin/env bash
#
# Embeds package.json into src/package-json.ts, which keeps an empty object in
# git (see src/package-json.test.ts). Run it before packing;
# scripts/npm-pack-testing.sh does.
#
set -euo pipefail

SRC_PACKAGE_JSON_TS_FILE='src/package-json.ts'

[ -f "${SRC_PACKAGE_JSON_TS_FILE}" ] || {
  echo "${SRC_PACKAGE_JSON_TS_FILE} not found" >&2
  exit 1
}

cat <<_SRC_ > "${SRC_PACKAGE_JSON_TS_FILE}"
/**
 * The package's own package.json, embedded by scripts/generate-package-json.sh
 * before packing. Git keeps an empty object.
 */
export const packageJson: { name?: string, version?: string, [key: string]: unknown } = $(cat package.json)
_SRC_
