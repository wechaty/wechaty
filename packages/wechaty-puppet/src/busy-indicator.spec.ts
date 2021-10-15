#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import {
  test,
  sinon,
}           from 'tstest'

import { BusyIndicator } from './busy-indicator.js'

test('BusyIndicator init state', async t => {
  const indicator = new BusyIndicator()

  t.equal(indicator.busy(), false, 'should not be not busy after init')
  await t.resolves(() => indicator.available(), 'should be available after init')
})

test('BusyIndicator set busy', async t => {
  const sandbox = sinon.createSandbox()
  const spy = sandbox.spy()

  const indicator = new BusyIndicator()

  indicator.busy(true)
  t.equal(indicator.busy(), true, 'should not be busy after set busy')

  indicator.available().then(spy).catch(e => t.fail(e))
  await new Promise(setImmediate)
  t.equal(spy.callCount, 0, 'should not resolve available() when busy')

  sandbox.restore()
})

test('BusyIndicator state transition', async t => {
  const sandbox = sinon.createSandbox()
  const spy = sandbox.spy()

  const indicator = new BusyIndicator()

  indicator.busy(true)
  indicator.available().then(spy).catch(e => t.fail(e))
  await new Promise(setImmediate)
  t.equal(spy.callCount, 0, 'should not resolve available() when busy')

  indicator.busy(false)
  await new Promise(setImmediate)
  t.equal(spy.callCount, 1, 'should resolve available() when set busy to false')
})
