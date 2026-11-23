#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import { test } from 'tstest'

import {
  puppet,
}                 from './openapi.js'

test('puppet.v0.file', async t => {
  const EXPECTED_PATH_REG = /puppet.swagger.json$/
  t.ok(EXPECTED_PATH_REG.test(puppet.v0.file), 'puppet OpenAPI file should be puppet.swagger.json')
})

test('puppet.v0.data', async t => {
  t.ok(puppet.v0.data.length > 0, 'should get JSON data for puppet.v0.data')
  try {
    const obj = JSON.parse(puppet.v0.data)
    t.ok(obj, 'should be able to parse JSON for puppet.v0.data')
  } catch (e) {
    t.fail('should be able to parse JSON data for puppet.v0.data')
  }
})
