#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import { test }  from 'tstest'

import {
  FileBox,
  MemoryCard,
  StateSwitch,
}                 from '../src/mod.js'

test('Re-export helper modules', async t => {
  t.ok(FileBox,     'should re-export FileBox')
  t.ok(MemoryCard,  'should re-export MemoryCard')
  t.ok(StateSwitch, 'should re-export StateSwitch')
})
