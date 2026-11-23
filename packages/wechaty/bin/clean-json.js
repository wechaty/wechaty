#!/usr/bin/env node

import fs from 'fs'
import JSON5 from 'json5'

const file = process.argv[2]
// console.error('Converting file: ', file)

const json = JSON5.parse(
  fs.readFileSync(file, 'utf8')
)

console.info(
  JSON.stringify(json, null, '  ')
)
