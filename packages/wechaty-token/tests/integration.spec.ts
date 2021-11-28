#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import { test }  from 'tstest'

import {
  WechatyToken,
}                         from '../src/mod.js'

test('integration testing', async t => {
  void WechatyToken
  void t.skip('tbw')
})
