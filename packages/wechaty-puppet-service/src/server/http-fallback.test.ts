/**
 * Unit tests for `PuppetServer` plain-HTTP `fallback` routes (`/healthz`,
 * `/openapi.json`, `/docs`, `/events` SSE, `/files` upload/download), error
 * handling (malformed URLs, 413 oversized uploads), and CORS.
 */
import assert from 'node:assert/strict'
import http from 'node:http'
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
  assert.ok(spec.paths['/files'])
  assert.ok(spec.paths['/files/{id}'])
  assert.ok(spec.paths['/healthz'])

  // 3. Public /docs (Scalar HTML)
  const docsRes = await fetch(`${baseUrl}/docs`)
  assert.equal(docsRes.status, 200)
  const docsHtml = await docsRes.text()
  assert.match(docsHtml, /@scalar\/api-reference/)

  // 4. CORS preflight
  const corsRes = await fetch(`${baseUrl}/wechaty.Puppet/Version`, { method: 'OPTIONS' })
  assert.equal(corsRes.status, 204)
  assert.equal(corsRes.headers.get('access-control-allow-origin'), '*')

  // 5. Malformed URLs return 400 without crashing server
  const badPercentRes = await fetch(`${baseUrl}/files/%ZZ`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  assert.equal(badPercentRes.status, 400)

  const badUrlStatus = await new Promise<number>((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: '//[', method: 'GET' }, res => {
      res.resume()
      resolve(res.statusCode ?? 0)
    })
    req.on('error', reject)
    req.end()
  })
  assert.equal(badUrlStatus, 400)

  // 6. Unauthenticated /events and /files return 401
  assert.equal((await fetch(`${baseUrl}/events`)).status, 401)
  assert.equal((await fetch(`${baseUrl}/files`, { method: 'POST', body: 'hi' })).status, 401)

  // 7. Authenticated POST /files + GET /files/:id
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

  // 8. Authenticated GET /events SSE receives initial heartbeat and live puppet events
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

test('PuppetServer returns HTTP 413 cleanly when POST /files exceeds maxBytes', async (t) => {
  const prevLimit = process.env['WECHATY_PUPPET_SERVICE_MAX_FILE_BYTES']
  process.env['WECHATY_PUPPET_SERVICE_MAX_FILE_BYTES'] = '2'
  t.after(() => {
    if (prevLimit === undefined) {
      delete process.env['WECHATY_PUPPET_SERVICE_MAX_FILE_BYTES']
    } else {
      process.env['WECHATY_PUPPET_SERVICE_MAX_FILE_BYTES'] = prevLimit
    }
  })

  const puppet = new PuppetMock()
  await puppet.start()
  const token = 'test-413-token'
  const port = 18793
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

  const res = await fetch(`http://127.0.0.1:${port}/files`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: '1234',
  })
  assert.equal(res.status, 413)
})
