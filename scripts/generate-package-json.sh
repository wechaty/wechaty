#!/usr/bin/env bash
set -e

SRC_PACKAGE_JSON_TS_FILE='src/package-json.ts'

[ -f ${SRC_PACKAGE_JSON_TS_FILE} ] || {
  echo ${SRC_PACKAGE_JSON_TS_FILE}" not found"
  exit 1
}

GIT_COMMIT_HASH=$(git rev-parse HEAD)

cat <<_SRC_ > ${SRC_PACKAGE_JSON_TS_FILE}
/**
 * This file was auto generated from scripts/generate-version.sh
 */
import { PackageJsonWechaty } from './config'

export const GIT_COMMIT_HASH: string = '${GIT_COMMIT_HASH}'
export const packageJson: PackageJsonWechaty = $(cat package.json)

_SRC_
