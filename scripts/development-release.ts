#!/usr/bin/env ts-node
/**
 * Author: Huan LI <zixia@zixia.net>
 * https://github.com/zixia
 * License: Apache-2.0
 */
import { minor } from 'semver'

const version: string = require('../package.json').version

if (minor(version) % 2 === 0) { // production release
  console.log(`${version} is production release`)
  process.exit(1) // exit 1 for not development
}

// development release
console.log(`${version} is development release`)
process.exit(0)
