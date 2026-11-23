#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import { test }  from 'tstest'

import * as helpers from '../src/mods/helpers.js'

test('Re-export helper modules', async t => {
  t.equal(typeof helpers.resolvePuppet, 'function', 'should export resolvePuppet()')
})
