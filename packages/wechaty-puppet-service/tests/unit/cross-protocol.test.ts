/**
 * Cross-protocol E2E verification for Stage 4 of #3068:
 * - Plain `fetch` + JSON (`POST` and `GET` on `NO_SIDE_EFFECTS` RPCs)
 * - Connect client (`protocol: 'connect'`) and binary gRPC client (`protocol: 'grpc'`)
 * - Pattern 3 Sidecar Bridge: upstream PuppetServer -> PuppetService (gRPC) -> bridge PuppetServer (HTTP/JSON + SSE)
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { createClient } from '@connectrpc/connect'
import { Puppet as PuppetServiceDef } from 'wechaty-grpc'
import { PuppetMock } from 'wechaty-puppet-mock'

import { useTempHome } from '../fixtures/temp-home.ts'
import { callCredToken } from '../../src/auth/mod.ts'
import { createPuppetTransport } from '../../src/node/transport.ts'
import { PuppetServer } from '../../src/server/puppet-server.ts'
import { PuppetService } from '../../src/client/puppet-service.ts'

test('Cross-protocol E2E: fetch JSON, Connect, gRPC, and Pattern 3 sidecar bridge', async (t) => {
  useTempHome(t)

  const deadline = new AbortController()
  const deadlineTimer = setTimeout(() => {
    deadline.abort(new Error('Cross-protocol E2E test timed out after 30000ms'))
  }, 30_000)
  t.after(() => {
    clearTimeout(deadlineTimer)
    deadline.abort()
  })

  const upstreamPuppet = new PuppetMock()
  await upstreamPuppet.start()

  const token = 'insecure_stage4-e2e-token'
  const upstreamPort = 18791
  const upstreamServer = new PuppetServer({
    endpoint: `127.0.0.1:${upstreamPort}`,
    puppet: upstreamPuppet,
    token,
    tls: { disable: true },
  })
  await upstreamServer.start()

  t.after(async () => {
    await upstreamServer.stop()
    await upstreamPuppet.stop()
  })

  // 1. Plain fetch + JSON POST & GET (NO_SIDE_EFFECTS) directly against upstreamServer
  const baseUrl = `http://127.0.0.1:${upstreamPort}`

  const postDingRes = await fetch(`${baseUrl}/wechaty.Puppet/Ding`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data: 'fetch-post-ding' }),
    signal: deadline.signal,
  })
  assert.equal(postDingRes.status, 200)

  const getVersionRes = await fetch(
    `${baseUrl}/wechaty.Puppet/Version?connect=v1&encoding=json&message=%7B%7D`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      signal: deadline.signal,
    },
  )
  assert.equal(getVersionRes.status, 200)
  const versionJson = await getVersionRes.json() as { version: string }
  assert.ok(versionJson.version)

  // 2. Connect & gRPC transports on the same port
  const grpcHandle = createPuppetTransport({
    baseUrl,
    protocol: 'grpc',
    interceptors: [callCredToken(token)],
  })
  t.after(() => grpcHandle.abort())
  const grpcClient = createClient(PuppetServiceDef, grpcHandle.transport)
  assert.equal((await grpcClient.version({}, { signal: deadline.signal })).version, versionJson.version)

  const connectHandle = createPuppetTransport({
    baseUrl,
    protocol: 'connect',
    interceptors: [callCredToken(token)],
  })
  t.after(() => connectHandle.abort())
  const connectClient = createClient(PuppetServiceDef, connectHandle.transport)
  assert.equal((await connectClient.version({}, { signal: deadline.signal })).version, versionJson.version)

  // 3. Pattern 3 Sidecar Bridge (PuppetService -> PuppetServer)
  const bridgeClientPuppet = new PuppetService({
    endpoint: `127.0.0.1:${upstreamPort}`,
    token,
    protocol: 'grpc',
    tls: { disable: true },
  })
  bridgeClientPuppet.on('error', () => {})
  await bridgeClientPuppet.start()

  const bridgePort = 18792
  const bridgeServer = new PuppetServer({
    endpoint: `127.0.0.1:${bridgePort}`,
    puppet: bridgeClientPuppet,
    token,
    tls: { disable: true },
  })
  await bridgeServer.start()

  t.after(async () => {
    await bridgeServer.stop()
    await bridgeClientPuppet.stop()
  })

  const bridgeSpecRes = await fetch(`http://127.0.0.1:${bridgePort}/openapi.json`, {
    signal: deadline.signal,
  })
  assert.equal(bridgeSpecRes.status, 200)
  const bridgeSpec = await bridgeSpecRes.json() as { openapi: string }
  assert.equal(bridgeSpec.openapi, '3.2.0')

  const upstreamDongPromise = new Promise<string>((resolve, reject) => {
    const cleanup = () => {
      deadline.signal.removeEventListener('abort', onAbort)
      upstreamPuppet.off('dong', onDong)
    }
    const onAbort = () => {
      cleanup()
      reject(deadline.signal.reason)
    }
    const onDong = (payload: { data?: string }) => {
      if (payload.data === 'bridge-ding') {
        cleanup()
        resolve(payload.data)
      }
    }
    deadline.signal.addEventListener('abort', onAbort, { once: true })
    upstreamPuppet.on('dong', onDong)
  })

  const bridgeDingRes = await fetch(`http://127.0.0.1:${bridgePort}/wechaty.Puppet/Ding`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data: 'bridge-ding' }),
    signal: deadline.signal,
  })
  assert.equal(bridgeDingRes.status, 200)
  assert.equal(await upstreamDongPromise, 'bridge-ding')
})
