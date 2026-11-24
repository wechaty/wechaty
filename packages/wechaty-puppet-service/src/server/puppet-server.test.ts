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
  const puppetService = new PuppetService({
    endpoint,
    token,
  } as PuppetOptions)

  try {
    await puppetServer.start()
    await puppetService.start()

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

test('PuppetServer rejects malformed endpoints without leaking puppet listeners', async () => {
  const puppet = new PuppetMock()
  const invalidPortServer = new PuppetServer({
    endpoint: '127.0.0.1:abc',
    puppet,
    token: 'insecure_token',
  } as PuppetServerOptions)

  await assert.rejects(
    async () => invalidPortServer.start(),
    /Invalid endpoint port "abc"/,
    'should reject non-numeric port',
  )
  assert.equal(puppet.listenerCount('scan'), 0, 'no scan listener should be attached on startup failure')

  const outOfRangeServer = new PuppetServer({
    endpoint: '127.0.0.1:99999',
    puppet,
    token: 'insecure_token',
  } as PuppetServerOptions)

  await assert.rejects(
    async () => outOfRangeServer.start(),
    /out of range/,
    'should reject port out of range',
  )

  const unclosedBracketServer = new PuppetServer({
    endpoint: '[::1:8788',
    puppet,
    token: 'insecure_token',
  } as PuppetServerOptions)

  await assert.rejects(
    async () => unclosedBracketServer.start(),
    /missing closing bracket/,
    'should reject unclosed bracket IPv6',
  )
})

test('PuppetServer supports cleartext HTTP/1.1 and HTTP/2 dispatch when TLS is disabled', async () => {
  const port = await freePort()
  const token = `insecure_${NIL_UUID_V4}`
  const endpoint = `127.0.0.1:${port}`

  const puppet = new PuppetMock()
  const puppetServer = new PuppetServer({
    endpoint,
    puppet,
    token,
    tls: { disable: true },
  } as PuppetServerOptions)

  await puppetServer.start()

  try {
    // 1. Test cleartext HTTP/1.1
    const http = await import('node:http')
    const h1Status = await new Promise<number>((resolve, reject) => {
      const req = http.get(`http://127.0.0.1:${port}/`, (res) => {
        resolve(res.statusCode || 0)
      })
      req.on('error', reject)
    })
    assert.ok(h1Status > 0, 'HTTP/1.1 request should receive an HTTP response code')

    // 2. Test cleartext HTTP/2
    const client = http2.connect(`http://127.0.0.1:${port}`)
    const h2Status = await new Promise<number>((resolve, reject) => {
      const req = client.request({
        ':path': '/grpc.health.v1.Health/Check',
        ':method': 'POST',
        'content-type': 'application/grpc',
      })
      req.on('response', (headers) => {
        resolve(Number(headers[':status'] || 0))
      })
      req.on('error', reject)
      req.end()
    })
    client.close()
    assert.ok(h2Status > 0, 'HTTP/2 request should receive an HTTP/2 response status')
  } finally {
    await puppetServer.stop()
  }
})

test('PuppetServer authenticates legacy HTTP/2 clients using :authority header', async () => {
  const port = await freePort()
  const token = `insecure_${NIL_UUID_V4}`
  const endpoint = `127.0.0.1:${port}`

  const puppet = new PuppetMock()
  const puppetServer = new PuppetServer({
    endpoint,
    puppet,
    token,
    tls: { disable: true },
  } as PuppetServerOptions)

  await puppetServer.start()

  try {
    const client = http2.connect(`http://127.0.0.1:${port}`)
    const status = await new Promise<number>((resolve, reject) => {
      const req = client.request({
        ':path': '/wechaty.Puppet/Version',
        ':method': 'POST',
        ':authority': token,
        'content-type': 'application/json',
      })
      req.on('response', (headers) => {
        resolve(Number(headers[':status'] || 0))
      })
      req.on('error', reject)
      req.end('{}')
    })
    client.close()
    assert.equal(status, 200, 'legacy HTTP/2 request with :authority token should succeed')
  } finally {
    await puppetServer.stop()
  }
})

test('PuppetServer stops cleanly when lingering raw connection is unclosed', async () => {
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

  // Open a raw TCP connection without completing any HTTP/2 or HTTP/1 transaction
  const net = await import('node:net')
  const clientSocket = net.connect(port, '127.0.0.1')
  await new Promise<void>((resolve) => clientSocket.once('connect', () => resolve()))

  try {
    const stopPromise = puppetServer.stop()
    const timeout = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('puppetServer.stop() timed out with lingering socket')), 4000),
    )
    await assert.doesNotReject(Promise.race([stopPromise, timeout]))
  } finally {
    clientSocket.destroy()
    await puppetServer.stop().catch(() => {})
    await puppet.stop().catch(() => {})
  }
})
