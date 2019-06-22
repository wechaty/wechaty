#!/usr/bin/env ts-node

// tslint:disable:no-shadowed-variable
import test  from 'tstest'

import { VERSION } from './version'

test('Make sure the VERSION is fresh in source code', async (t) => {
  t.equal(VERSION, '0.0.0', 'version should be 0.0.0 in source code, only updated before publish to NPM')
})
