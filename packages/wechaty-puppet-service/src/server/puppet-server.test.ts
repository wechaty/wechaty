/**
 * Unit tests for `PuppetServer`: version reporting, server-first shutdown with active
 * client streaming connections, and bind failure resilience.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import http2 from 'node:http2'

import { PuppetMock } from 'wechaty-puppet-mock'
import type { PuppetOptions } from 'wechaty-puppet'

import { freePort } from '../../tests/fixtures/free-port.ts'
import { useTempHome } from '../../tests/fixtures/temp-home.ts'
import {
  PuppetServer,
  type PuppetServerOptions,
} from './puppet-server.ts'
import { PuppetService } from '../client/puppet-service.ts'

const NIL_UUID_V4 = '00000000-0000-0000-0000-000000000000'

test('version()', async _t => {
  const options: PuppetServerOptions = {
    endpoint : '127.0.0.1:8788',
    puppet   : new PuppetMock(),
    token    : 'secret',
  }

  const puppet = new PuppetServer(options)
  assert.ok(puppet.version(), 'should have version() method')
})

test('server-first stop() resolves promptly while a client stream is open', async t => {
  useTempHome(t)
  const port = await freePort()
  const token = `insecure_${NIL_UUID_V4}`
  const endpoint = `127.0.0.1:${port}`

  const puppet = new PuppetMock()
  const puppetServer = new PuppetServer({
    endpoint,
    puppet,
    token,
  } as PuppetServerOptions)
  await puppetServer.start()

  const puppetService = new PuppetService({
    endpoint,
    token,
  } as PuppetOptions)
  await puppetService.start()

  try {
    // Stopping server before client stops must resolve promptly without hanging
    const stopPromise = puppetServer.stop()
    const timeout = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('puppetServer.stop() timed out')), 4000),
    )

    await assert.doesNotReject(
      Promise.race([stopPromise, timeout]),
      'puppetServer.stop() should resolve cleanly even with active client streams',
    )
  } finally {
    await puppetService.stop().catch(() => {})
    await puppetServer.stop().catch(() => {})
    await puppet.stop().catch(() => {})
  }
})

test('failed listen() clears server state allowing retry', async () => {
  const port = await freePort()
  const token = `insecure_${NIL_UUID_V4}`
  const endpoint = `127.0.0.1:${port}`

  // Occupy the port with a plain HTTP/2 server
  const blocker = http2.createServer()
  await new Promise<void>((resolve) => blocker.listen(port, '127.0.0.1', () => resolve()))

  const puppet = new PuppetMock()
  const puppetServer = new PuppetServer({
    endpoint,
    puppet,
    token,
  } as PuppetServerOptions)

  try {
    // start() should reject because port is occupied
    await assert.rejects(puppetServer.start(), /EADDRINUSE/)

    // Close blocker
    await new Promise<void>((resolve) => blocker.close(() => resolve()))

    // Retry should now succeed instead of throwing "grpc server existed!"
    await assert.doesNotReject(puppetServer.start(), 'start() retry after failure should succeed')
  } finally {
    await new Promise<void>((resolve) => blocker.close(() => resolve())).catch(() => {})
    await puppetServer.stop().catch(() => {})
    await puppet.stop().catch(() => {})
  }
})
