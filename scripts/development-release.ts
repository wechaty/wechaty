#!/usr/bin/env ts-node
/**
 * Author: Huan LI <zixia@zixia.net>
 * https://github.com/zixia
 * License: Apache-2.0
 */
import readPkgUp from 'read-pkg-up'
import { minor } from 'semver'

const pkg = readPkgUp.sync({ cwd: __dirname })!.package
export const VERSION = pkg.version

if (minor(VERSION) % 2 === 0) { // production release
  console.log(`${VERSION} is production release`)
  process.exit(1) // exit 1 for not development
}

// development release
console.log(`${VERSION} is development release`)
process.exit(0)
