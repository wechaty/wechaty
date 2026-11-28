/**
 * Unit tests for `PuppetServer` plain-HTTP `fallback` routes (`/healthz`,
 * `/openapi.json`, `/docs`, `/events` SSE, `/files` upload/download) and CORS.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { PuppetMock } from 'wechaty-puppet-mock'

import { PuppetServer } from './puppet-server.ts'

test('PuppetServer serves /healthz, /openapi.json, /docs, /events SSE, and /files on single port', async (t) => {
  const puppet = new PuppetMock()
  await puppet.start()

  const token = 'test-openapi-token'
  const port = 18789
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

  const baseUrl = `http://127.0.0.1:${port}`

  // 1. Public /healthz
  const healthRes = await fetch(`${baseUrl}/healthz`)
  assert.equal(healthRes.status, 200)
  assert.deepEqual(await healthRes.json(), { status: 'ok' })

  // 2. Public /openapi.json
  const specRes = await fetch(`${baseUrl}/openapi.json`)
  assert.equal(specRes.status, 200)
  const spec = await specRes.json() as { openapi: string; paths: Record<string, unknown> }
  assert.equal(spec.openapi, '3.2.0')
  assert.ok(spec.paths['/events'])

  // 3. Public /docs (Scalar HTML)
  const docsRes = await fetch(`${baseUrl}/docs`)
  assert.equal(docsRes.status, 200)
  const docsHtml = await docsRes.text()
  assert.match(docsHtml, /@scalar\/api-reference/)

  // 4. CORS preflight
  const corsRes = await fetch(`${baseUrl}/wechaty.Puppet/Version`, { method: 'OPTIONS' })
  assert.equal(corsRes.status, 204)
  assert.equal(corsRes.headers.get('access-control-allow-origin'), '*')

  // 5. Unauthenticated /events and /files return 401
  assert.equal((await fetch(`${baseUrl}/events`)).status, 401)
  assert.equal((await fetch(`${baseUrl}/files`, { method: 'POST', body: 'hi' })).status, 401)

  // 6. Authenticated POST /files + GET /files/:id
  const uploadRes = await fetch(`${baseUrl}/files`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'text/plain',
      'X-File-Name': 'hello.txt',
    },
    body: 'hello wechaty',
  })
  assert.equal(uploadRes.status, 201)
  const uploaded = await uploadRes.json() as { id: string; url: string; name: string; size: number }
  assert.equal(uploaded.name, 'hello.txt')
  assert.equal(uploaded.size, 13)

  const downloadRes = await fetch(`${baseUrl}${uploaded.url}`, {
    headers: { 'x-wechaty-token': token },
  })
  assert.equal(downloadRes.status, 200)
  assert.equal(await downloadRes.text(), 'hello wechaty')

  // 7. Authenticated GET /events SSE receives initial heartbeat and live puppet events
  const sseController = new AbortController()
  const sseRes = await fetch(`${baseUrl}/events`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: sseController.signal,
  })
  assert.equal(sseRes.status, 200)
  assert.match(sseRes.headers.get('content-type') || '', /text\/event-stream/)

  const reader = sseRes.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (!buffer.includes('event: heartbeat')) {
    const chunk = await reader.read()
    if (chunk.done) break
    buffer += decoder.decode(chunk.value, { stream: true })
  }
  assert.match(buffer, /event: heartbeat/)

  puppet.emit('dong', { data: 'sse-dong' })
  while (!buffer.includes('event: dong')) {
    const chunk = await reader.read()
    if (chunk.done) break
    buffer += decoder.decode(chunk.value, { stream: true })
  }
  assert.match(buffer, /sse-dong/)
  sseController.abort()
})
