#!/usr/bin/env ts-node

// tslint:disable:no-console
// tslint:disable:no-var-requires

import { minor } from 'semver'

const { version } = require('../package.json')

if (minor(version) % 2 === 0) { // production release
  console.log(`${version} is production release`)
  process.exit(1) // exit 1 for not development
}

// development release
console.log(`${version} is development release`)
process.exit(0)
