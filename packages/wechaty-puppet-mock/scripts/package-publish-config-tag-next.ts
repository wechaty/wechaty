#!/usr/bin/env ts-node

// tslint:disable:no-console
// tslint:disable:no-var-requires

import * as fs    from 'fs'
import * as path  from 'path'

const PACKAGE_JSON = path.join(__dirname, '../package.json')

const pkg = require(PACKAGE_JSON)

pkg.publishConfig = {
  access: 'public',
  ...pkg.publishConfig,
  tag: 'next',
}

fs.writeFileSync(PACKAGE_JSON, JSON.stringify(pkg, null, 2))
// console.log(JSON.stringify(pkg, null, 2))

console.log('set package.json:publicConfig.tag to next.')
