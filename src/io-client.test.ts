/**
 * Deterministic unit tests for `IoClient` ordered resource acquisition,
 * partial-startup rollback, `restart()`, and `quit()` cleanup.
 */
import assert from 'node:assert/strict'
import type { EventEmitter } from 'node:events'
import { test } from 'node:test'
import { PuppetMock } from 'wechaty-puppet-mock'

import { IoClient } from './io-client.ts'
import type { LifecycleState } from './lifecycle/mod.ts'
import { WechatyBuilder } from './wechaty-builder.ts'

test('IoClient starts children in dependency order and stops all children in reverse order on quit() and restart()', async t => {
  const trace: string[] = []
  const puppet = new PuppetMock()
  t.mock.method(puppet, 'start', async () => { trace.push('wechaty.puppet.start') })
  t.mock.method(puppet, 'stop', async () => { trace.push('wechaty.puppet.stop') })

  const wechaty = WechatyBuilder.build({ puppet })
  const botEmitter = wechaty as unknown as EventEmitter
  const client = new IoClient({
    createIo: () => ({
      start: async () => { trace.push('io.start') },
      stop: async () => { trace.push('io.stop') },
    }),
    createPuppetServer: () => ({
      start: async () => { trace.push('puppetServer.start') },
      stop: async () => { trace.push('puppetServer.stop') },
    }),
    port: 18788,
    token: 'test-token',
    wechaty,
  })

  await client.start()
  assert.deepEqual(client.state, { generation: 1, kind: 'running' })
  assert.equal(botEmitter.listenerCount('message'), 1)

  await client.restart()
  assert.deepEqual(client.state, { generation: 2, kind: 'running' })
  assert.equal(botEmitter.listenerCount('message'), 1, 'restart must not leak Wechaty listeners')

  await client.quit()
  assert.deepEqual(client.state, { generation: 2, kind: 'stopped' })
  assert.equal(botEmitter.listenerCount('message'), 0)

  assert.deepEqual(trace, [
    'wechaty.puppet.start',
    'puppetServer.start',
    'io.start',
    'io.stop',
    'puppetServer.stop',
    'wechaty.puppet.stop',
    'wechaty.puppet.start',
    'puppetServer.start',
    'io.start',
    'io.stop',
    'puppetServer.stop',
    'wechaty.puppet.stop',
  ])
})

test('IoClient rolls back already-started wechaty and puppetServer when a later child fails during start()', async t => {
  const trace: string[] = []
  const puppet = new PuppetMock()
  t.mock.method(puppet, 'start', async () => { trace.push('wechaty.start') })
  t.mock.method(puppet, 'stop', async () => { trace.push('wechaty.stop') })

  const wechaty = WechatyBuilder.build({ puppet })
  const botEmitter = wechaty as unknown as EventEmitter
  const readState = (svc: { readonly state: LifecycleState }): LifecycleState => svc.state
  let failServer = true
  let failIo = true

  const client = new IoClient({
    createIo: () => ({
      start: async () => {
        trace.push('io.start')
        if (failIo) {
          throw new Error('io handshake failed')
        }
      },
      stop: async () => { trace.push('io.stop') },
    }),
    createPuppetServer: () => ({
      start: async () => {
        trace.push('puppetServer.start')
        if (failServer) {
          throw new Error('port already in use')
        }
      },
      stop: async () => { trace.push('puppetServer.stop') },
    }),
    port: 18789,
    token: 'test-token',
    wechaty,
  })

  // 1. puppetServer fails -> wechaty is rolled back!
  await assert.rejects(client.start(), /port already in use/)
  assert.equal(readState(client).kind, 'failed')
  assert.equal(readState(wechaty).kind, 'stopped', 'wechaty must not remain running after puppetServer failure')
  assert.equal(botEmitter.listenerCount('login'), 0)
  assert.deepEqual(trace, [
    'wechaty.start',
    'puppetServer.start',
    'wechaty.stop',
  ])

  // 2. puppetServer succeeds, io fails -> puppetServer AND wechaty roll back in reverse order!
  trace.length = 0
  failServer = false
  await assert.rejects(client.start(), /io handshake failed/)
  assert.equal(readState(wechaty).kind, 'stopped')
  assert.deepEqual(trace, [
    'wechaty.start',
    'puppetServer.start',
    'io.start',
    'puppetServer.stop',
    'wechaty.stop',
  ])

  // 3. All children succeed cleanly on retry!
  trace.length = 0
  failIo = false
  await client.start()
  assert.equal(readState(client).kind, 'running')
  await client.stop()
  assert.equal(readState(client).kind, 'stopped')
})
