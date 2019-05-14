#!/usr/bin/env ts-node

// tslint:disable:no-console
// tslint:disable:no-var-requires

import fs from 'fs'

const { version } = require('../package.json')

const VERSION_CODE = `
/**
 * This file will be overwrite when we publish NPM module
 * by scripts/generate_version.ts
 */

export const VERSION = '${version}'
`
fs.writeFileSync('src/version.ts', VERSION_CODE)
