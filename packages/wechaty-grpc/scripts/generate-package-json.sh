#!/usr/bin/env bash
set -e

SRC_PACKAGE_JSON_TS_FILE='src/package-json.ts'

[ -f ${SRC_PACKAGE_JSON_TS_FILE} ] || {
  echo ${SRC_PACKAGE_JSON_TS_FILE}" not found"
  exit 1
}

cat <<_SRC_ > ${SRC_PACKAGE_JSON_TS_FILE}
/**
 * This file was auto generated from scripts/generate-version.sh
 */
import type { PackageJson } from 'type-fest'
export const packageJson: PackageJson = $(cat package.json) as any
_SRC_
