#!/usr/bin/env -S ts-node --project tsconfig.cjs.json

import { test } from 'tstest'

import * as puppet from './generated.js'

test('CJS: "EventRequest"', async t => {
  t.ok(puppet.EventRequest, 'should export EventRequest')
})

test('CJS: "PuppetService"', async t => {
  t.ok(puppet.PuppetService, 'should export PuppetSevice')
})

test('CJS: "PuppetService"', async t => {
  const map: puppet.EventTypeMap = {} as any
  map.EVENT_TYPE_DIRTY = puppet.EventType.EVENT_TYPE_DIRTY
  t.equal(Object.keys(map).length, 1, 'should export type EventTypeMap')
})

test('CJS: DingRequest', async t => {
  t.ok(puppet.DingRequest, 'should exists "DingRequest"')
})
