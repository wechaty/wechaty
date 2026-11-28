/**
 * Tests `createPuppetTransport` across both `'grpc'` and `'connect'` protocols,
 * plus `@connectrpc/connect-web` (`fetch`) transport against `PuppetServer`.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { createClient } from '@connectrpc/connect'
import { createConnectTransport as createWebConnectTransport } from '@connectrpc/connect-web'
import { Puppet as PuppetServiceDef } from 'wechaty-grpc'
import { PuppetMock } from 'wechaty-puppet-mock'

import { callCredToken } from '../auth/mod.ts'
import { PuppetServer } from '../server/puppet-server.ts'
import { createPuppetTransport as createNodeTransport } from '../node/transport.ts'
import { createPuppetTransport as createWebTransport } from './transport.ts'

test('createPuppetTransport supports web connect-web and node grpc/connect transports', async (t) => {
  assert.throws(() => createWebTransport({ baseUrl: 'http://127.0.0.1:8788', protocol: 'grpc' }))

  const puppet = new PuppetMock()
  await puppet.start()
  const token = 'insecure_test-connect-web-token'
  const port = 18790
  const server = new PuppetServer({
    endpoint: `127.0.0.1:${port}`,
    puppet,
    token,
    tls: { disable: true },
  })
  await server.start()

  t.after(async () => {
    await server.stop()
    await puppet.stop()
  })

  // 1. Connect-web transport over HTTP/1.1 fetch
  const webTransport = createWebConnectTransport({
    baseUrl: `http://127.0.0.1:${port}`,
    interceptors: [callCredToken(token)],
  })
  const webClient = createClient(PuppetServiceDef, webTransport)
  const webVersion = await webClient.version({})
  assert.ok(webVersion.version)

  // 2. Node Connect transport over HTTP/2
  const nodeConnect = createNodeTransport({
    baseUrl: `http://127.0.0.1:${port}`,
    protocol: 'connect',
    interceptors: [callCredToken(token)],
  })
  t.after(() => nodeConnect.abort())
  const connectClient = createClient(PuppetServiceDef, nodeConnect.transport)
  const connectVersion = await connectClient.version({})
  assert.equal(connectVersion.version, webVersion.version)

  // 3. Node gRPC transport over HTTP/2
  const nodeGrpc = createNodeTransport({
    baseUrl: `http://127.0.0.1:${port}`,
    protocol: 'grpc',
    interceptors: [callCredToken(token)],
  })
  t.after(() => nodeGrpc.abort())
  const grpcClient = createClient(PuppetServiceDef, nodeGrpc.transport)
  const grpcVersion = await grpcClient.version({})
  assert.equal(grpcVersion.version, webVersion.version)
})
