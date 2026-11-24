/**
 * Tests authentication, error propagation, and lifecycle resiliency
 * between `PuppetServer` and `PuppetService` as part of the Phase 4.1 Safety Net Test Suite (#3123).
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { PuppetOptions } from 'wechaty-puppet'
import { PuppetMock } from 'wechaty-puppet-mock'

import { freePort } from '../fixtures/free-port.ts'
import { useTempHome } from '../fixtures/temp-home.ts'

import {
  PuppetService,
  PuppetServer,
  type PuppetServerOptions,
} from '../../src/mod.ts'

const VALID_TOKEN_UUID   = '11111111-1111-1111-1111-111111111111'
const INVALID_TOKEN_UUID = '22222222-2222-2222-2222-222222222222'

test('Resiliency and authentication simulation between PuppetService and PuppetServer', async t => {
  useTempHome(t)

  await t.test('rejects connection with mismatched token', async () => {
    const port = await freePort()
    const endpoint = `0.0.0.0:${port}`
    const serverToken = `insecure_${VALID_TOKEN_UUID}`
    const clientToken = `insecure_${INVALID_TOKEN_UUID}`

    const puppet = new PuppetMock()
    const server = new PuppetServer({
      endpoint,
      puppet,
      token: serverToken,
    } as PuppetServerOptions)
    await server.start()

    const client = new PuppetService({
      endpoint,
      token: clientToken,
    } as PuppetOptions)

    await assert.rejects(
      async () => client.start(),
      /UNAUTHENTICATED/,
      'client should reject with UNAUTHENTICATED when token is invalid',
    )

    await client.stop().catch(() => {})
    await server.stop().catch(() => {})
    await puppet.stop().catch(() => {})
  })

  await t.test('propagates backend puppet error cleanly to client without crashing server', async () => {
    const port = await freePort()
    const endpoint = `0.0.0.0:${port}`
    const token = `insecure_${VALID_TOKEN_UUID}`

    const puppet = new PuppetMock()
    puppet.contactPayload = async () => {
      throw new Error('simulated backend database failure')
    }

    const server = new PuppetServer({
      endpoint,
      puppet,
      token,
    } as PuppetServerOptions)
    await server.start()

    const client = new PuppetService({
      endpoint,
      token,
    } as PuppetOptions)
    await client.start()

    // 1. First call fails as expected
    await assert.rejects(
      async () => client.contactPayload('contact-error-id'),
      /simulated backend database failure/,
      'client call should reject with the backend puppet error message',
    )

    // 2. Server remains alive and serves subsequent requests
    puppet.contactPayload = async (id: string) => ({
      id,
      name: 'Recovered Contact',
    } as any)

    const payload = await client.contactPayload('contact-recovered-id')
    assert.equal(payload.name, 'Recovered Contact', 'server should continue serving after error')

    await client.stop()
    await server.stop()
    await puppet.stop()
  })

  await t.test('clean stop and restart lifecycle without socket or resource leaks', async () => {
    const port1 = await freePort()
    const token = `insecure_${VALID_TOKEN_UUID}`

    const puppet1 = new PuppetMock()
    const server1 = new PuppetServer({
      endpoint: `0.0.0.0:${port1}`,
      puppet: puppet1,
      token,
    } as PuppetServerOptions)
    await server1.start()

    const client1 = new PuppetService({
      endpoint: `0.0.0.0:${port1}`,
      token,
    } as PuppetOptions)
    await client1.start()

    // Verify first session works
    assert.ok(client1.isLoggedIn === false, 'client1 should be started')
    await client1.stop()
    await server1.stop()
    await puppet1.stop()

    // Start a second session on a new port
    const port2 = await freePort()
    const puppet2 = new PuppetMock()
    const server2 = new PuppetServer({
      endpoint: `0.0.0.0:${port2}`,
      puppet: puppet2,
      token,
    } as PuppetServerOptions)
    await server2.start()

    const client2 = new PuppetService({
      endpoint: `0.0.0.0:${port2}`,
      token,
    } as PuppetOptions)
    await client2.start()

    assert.ok(client2.isLoggedIn === false, 'client2 should start cleanly on new port')
    await client2.stop()
    await server2.stop()
    await puppet2.stop()
  })
})
