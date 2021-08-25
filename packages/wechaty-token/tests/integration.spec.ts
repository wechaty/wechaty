#!/usr/bin/env ts-node

import { test }  from 'tstest'

import {
  WechatyToken,
}                         from '../src/mod'

test('integration testing', async t => {
  void WechatyToken
  void t.skip('tbw')
})
