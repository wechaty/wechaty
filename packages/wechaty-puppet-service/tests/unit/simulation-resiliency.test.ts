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
    const endpoint = `127.0.0.1:${port}`
    const serverToken = `insecure_${VALID_TOKEN_UUID}`
    const clientToken = `insecure_${INVALID_TOKEN_UUID}`

    let puppet: PuppetMock | undefined
    let server: PuppetServer | undefined
    let client: PuppetService | undefined

    try {
      puppet = new PuppetMock()
      server = new PuppetServer({
        endpoint,
        puppet,
        token: serverToken,
      } as PuppetServerOptions)
      client = new PuppetService({
        endpoint,
        token: clientToken,
      } as PuppetOptions)

      await server.start()
      await assert.rejects(
        async () => client!.start(),
        /UNAUTHENTICATED/,
        'client should reject with UNAUTHENTICATED when token is invalid',
      )
    } finally {
      await client?.stop().catch(() => {})
      await server?.stop().catch(() => {})
      await puppet?.stop().catch(() => {})
    }
  })

  await t.test('propagates backend puppet error cleanly to client without crashing server', async () => {
    const port = await freePort()
    const endpoint = `127.0.0.1:${port}`
    const token = `insecure_${VALID_TOKEN_UUID}`

    let puppet: PuppetMock | undefined
    let server: PuppetServer | undefined
    let client: PuppetService | undefined

    try {
      puppet = new PuppetMock()
      puppet.contactPayload = async () => {
        throw new Error('simulated backend database failure')
      }

      server = new PuppetServer({
        endpoint,
        puppet,
        token,
      } as PuppetServerOptions)
      client = new PuppetService({
        endpoint,
        token,
      } as PuppetOptions)

      await server.start()
      await client.start()

      // 1. First call fails as expected
      await assert.rejects(
        async () => client!.contactPayload('contact-error-id'),
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
    } finally {
      await client?.stop().catch(() => {})
      await server?.stop().catch(() => {})
      await puppet?.stop().catch(() => {})
    }
  })

  await t.test('clean stop and restart lifecycle on the same port', async () => {
    const port = await freePort()
    const endpoint = `127.0.0.1:${port}`
    const token = `insecure_${VALID_TOKEN_UUID}`

    // 1. First session: start, perform RPC, stop
    let puppet1: PuppetMock | undefined
    let server1: PuppetServer | undefined
    let client1: PuppetService | undefined

    try {
      puppet1 = new PuppetMock()
      server1 = new PuppetServer({
        endpoint,
        puppet: puppet1,
        token,
      } as PuppetServerOptions)
      client1 = new PuppetService({
        endpoint,
        token,
      } as PuppetOptions)

      await server1.start()
      await client1.start()

      assert.ok(client1.isLoggedIn === false, 'client1 should be started')
      const qrCode1 = await client1.contactSelfQRCode()
      assert.ok(typeof qrCode1 === 'string', 'client1 should be operational before stop')
    } finally {
      await client1?.stop().catch(() => {})
      await server1?.stop().catch(() => {})
      await puppet1?.stop().catch(() => {})
    }

    // 2. Second session: rebind to the EXACT same port to verify socket release without EADDRINUSE
    let puppet2: PuppetMock | undefined
    let server2: PuppetServer | undefined
    let client2: PuppetService | undefined

    try {
      puppet2 = new PuppetMock()
      server2 = new PuppetServer({
        endpoint,
        puppet: puppet2,
        token,
      } as PuppetServerOptions)
      client2 = new PuppetService({
        endpoint,
        token,
      } as PuppetOptions)

      await server2.start()
      await client2.start()

      assert.ok(client2.isLoggedIn === false, 'client2 should start cleanly on reused port')
      const qrCode2 = await client2.contactSelfQRCode()
      assert.ok(typeof qrCode2 === 'string', 'client2 should be operational after restart')
    } finally {
      await client2?.stop().catch(() => {})
      await server2?.stop().catch(() => {})
      await puppet2?.stop().catch(() => {})
    }
  })
})
