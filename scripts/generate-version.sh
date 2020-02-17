#!/usr/bin/env bash
set -e

SRC_VERSION_TS_FILE='src/version.ts'

[ -f ${SRC_VERSION_TS_FILE} ] || {
  echo ${SRC_VERSION_TS_FILE}" not found"
  exit 1
}

VERSION=$(npx pkg-jq -r .version)
GIT_COMMIT_HASH=$(git rev-parse HEAD)

cat <<_SRC_ > ${SRC_VERSION_TS_FILE}
/**
 * This file was auto generated from scripts/generate-version.sh
 */
export const VERSION: string = '${VERSION}'
export const GIT_COMMIT_HASH: string = '${GIT_COMMIT_HASH}'
_SRC_
