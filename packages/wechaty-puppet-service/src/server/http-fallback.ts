/**
 * Plain-HTTP `fallback` routes and CORS handling for `PuppetServer`:
 * - Public: `GET /healthz`, `GET /openapi.json`, `GET /docs` (Scalar API Reference)
 * - Authenticated: `GET /events` (W3C SSE), `POST /files`, `GET /files/:id`
 */
import { createReadStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'

import { cors } from '@connectrpc/connect'
import type { connectNodeAdapter } from '@connectrpc/connect-node'
import { openApiSpec } from 'wechaty-grpc'
import type { FileBoxInterface } from 'file-box'
import * as PUPPET from 'wechaty-puppet'

import { verifyTokenFromHeaders } from '../auth/verify-token.ts'
import { PayloadTooLargeError, type StagedFileStore } from './staged-file-store.ts'

type NodeHandlerFn = NonNullable<Parameters<typeof connectNodeAdapter>[0]['fallback']>
export type NodeReq = Parameters<NodeHandlerFn>[0]
export type NodeRes = Parameters<NodeHandlerFn>[1]

const DEFAULT_SCALAR_CDN_URL = 'https://cdn.jsdelivr.net/npm/@scalar/api-reference/esm.js'

const ALLOWED_METHODS = Array.from(new Set([...cors.allowedMethods, 'GET', 'POST', 'OPTIONS'])).join(', ')
const ALLOWED_HEADERS = Array.from(
  new Set([
    ...cors.allowedHeaders,
    'Authorization',
    'X-Wechaty-Token',
    'X-File-Name',
    'Content-Type',
  ]),
).join(', ')
const EXPOSED_HEADERS = cors.exposedHeaders.join(', ')

/**
 * Apply CORS headers to an HTTP response.
 */
export function applyCorsHeaders (res: NodeRes): void {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS)
  res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS)
  if (EXPOSED_HEADERS) {
    res.setHeader('Access-Control-Expose-Headers', EXPOSED_HEADERS)
  }
}

function sendJson (res: NodeRes, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(payload)
}

function renderScalarHtml (cdnUrl: string): string {
  const safeCdnUrl = cdnUrl.replace(/'/g, '%27')
  return [
    '<!doctype html>',
    '<html lang="en">',
    '  <head>',
    '    <meta charset="utf-8" />',
    '    <meta name="viewport" content="width=device-width, initial-scale=1" />',
    '    <title>Wechaty Puppet Service — OpenAPI 3.2 Reference</title>',
    '  </head>',
    '  <body>',
    '    <div id="app"></div>',
    '    <script type="module">',
    `      import { createApiReference } from '${safeCdnUrl}'`,
    '      createApiReference("#app", {',
    '        url: "/openapi.json",',
    '        authentication: { preferredSecurityScheme: "BearerAuth" },',
    '      })',
    '    </script>',
    '  </body>',
    '</html>',
    '',
  ].join('\n')
}

const SSE_EVENT_NAMES: ReadonlyArray<PUPPET.types.PuppetEventName> = [
  'dirty',
  'dong',
  'error',
  'friendship',
  'heartbeat',
  'login',
  'logout',
  'message',
  'post',
  'ready',
  'reset',
  'room-invite',
  'room-join',
  'room-leave',
  'room-topic',
  'scan',
]

export interface HttpFallbackOptions {
  puppet: PUPPET.Puppet
  token: string
  stagedFiles: StagedFileStore
  shutdownSignal: AbortSignal
}

/**
 * Create the `connectNodeAdapter` `fallback` handler serving OpenAPI, Scalar docs,
 * healthz, W3C SSE `/events`, and `/files` media offload on the same port.
 */
export function createHttpFallback (options: HttpFallbackOptions) {
  const { puppet, token, stagedFiles, shutdownSignal } = options
  const openApiJson = JSON.stringify(openApiSpec)

  return async (req: NodeReq, res: NodeRes): Promise<void> => {
    const method = (req.method || 'GET').toUpperCase()
    const rawUrl = req.url || '/'
    const url = new URL(rawUrl, 'http://localhost')
    const pathname = url.pathname

    if (method === 'OPTIONS') {
      res.statusCode = 204
      res.end()
      return
    }

    if (method === 'GET' && pathname === '/healthz') {
      sendJson(res, 200, { status: 'ok' })
      return
    }

    if (method === 'GET' && pathname === '/openapi.json') {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(openApiJson)
      return
    }

    if (method === 'GET' && pathname === '/docs') {
      const cdnUrl = process.env['WECHATY_PUPPET_SERVICE_SCALAR_CDN_URL'] || DEFAULT_SCALAR_CDN_URL
      res.statusCode = 200
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.end(renderScalarHtml(cdnUrl))
      return
    }

    if (method === 'GET' && pathname === '/events') {
      if (!verifyTokenFromHeaders(req.headers, token)) {
        sendJson(res, 401, { error: 'Unauthorized' })
        return
      }

      res.statusCode = 200
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
      res.setHeader('Cache-Control', 'no-cache, no-transform')
      res.setHeader('Connection', 'keep-alive')
      res.setHeader('X-Accel-Buffering', 'no')
      res.write('retry: 3000\n\n')

      let eventId = 0
      const writeSse = (eventName: string, payload: unknown) => {
        if (res.writableEnded || res.destroyed) return
        eventId += 1
        res.write(`id: ${eventId}\nevent: ${eventName}\ndata: ${JSON.stringify(payload ?? {})}\n\n`)
      }

      const listeners: Array<{ name: PUPPET.types.PuppetEventName; fn: (...args: unknown[]) => void }> = []
      for (const eventName of SSE_EVENT_NAMES) {
        const fn = (payload: unknown) => {
          writeSse(eventName, payload)
        }
        listeners.push({ name: eventName, fn })
        puppet.on(eventName as any, fn as any)
      }

      writeSse('heartbeat', { data: 'Wechaty Puppet SSE stream connected' })
      const heartbeatTimer = setInterval(() => {
        writeSse('heartbeat', { data: 'heartbeat' })
      }, 15_000)
      heartbeatTimer.unref?.()

      await new Promise<void>((resolve) => {
        let cleaned = false
        const cleanup = () => {
          if (cleaned) return
          cleaned = true
          clearInterval(heartbeatTimer)
          for (const { name, fn } of listeners) {
            puppet.off(name as any, fn as any)
          }
          shutdownSignal.removeEventListener('abort', cleanup)
          req.removeListener('close', cleanup)
          if (!res.writableEnded && !res.destroyed) {
            res.end()
          }
          resolve()
        }

        if (shutdownSignal.aborted) {
          cleanup()
          return
        }

        req.once('close', cleanup)
        shutdownSignal.addEventListener('abort', cleanup, { once: true })
      })
      return
    }

    if (method === 'POST' && pathname === '/files') {
      if (!verifyTokenFromHeaders(req.headers, token)) {
        sendJson(res, 401, { error: 'Unauthorized' })
        return
      }
      const fileNameHeader = req.headers['x-file-name']
      const fileName = Array.isArray(fileNameHeader) ? fileNameHeader[0] : fileNameHeader
      const contentTypeHeader = req.headers['content-type']
      const mimeType = Array.isArray(contentTypeHeader) ? contentTypeHeader[0] : contentTypeHeader

      try {
        const entry = await stagedFiles.stageFromStream(req, {
          name: fileName,
          mimeType,
        })
        sendJson(res, 201, {
          id: entry.id,
          url: entry.url,
          name: entry.name,
          mimeType: entry.mimeType,
          size: entry.size,
        })
      } catch (err) {
        if (err instanceof PayloadTooLargeError) {
          sendJson(res, 413, { error: err.message })
          return
        }
        sendJson(res, 500, { error: (err as Error).message })
      }
      return
    }

    if (method === 'GET' && pathname.startsWith('/files/')) {
      if (!verifyTokenFromHeaders(req.headers, token)) {
        sendJson(res, 401, { error: 'Unauthorized' })
        return
      }
      const id = decodeURIComponent(pathname.slice('/files/'.length))
      if (!id) {
        sendJson(res, 400, { error: 'Missing file ID' })
        return
      }

      const kind = url.searchParams.get('kind')
      if (!kind || kind === 'staged') {
        const staged = stagedFiles.get(id)
        if (staged) {
          res.statusCode = 200
          res.setHeader('Content-Type', staged.mimeType)
          res.setHeader('Content-Disposition', `inline; filename="${staged.name.replace(/"/g, '')}"`)
          res.setHeader('Cache-Control', 'private, max-age=300')
          await pipeline(createReadStream(staged.filePath), res)
          return
        }
        if (kind === 'staged') {
          sendJson(res, 404, { error: 'Staged file not found or expired' })
          return
        }
      }

      try {
        let fileBox: FileBoxInterface
        if (kind === 'contact-avatar') {
          fileBox = await puppet.contactAvatar(id)
        } else if (kind === 'room-avatar') {
          fileBox = await puppet.roomAvatar(id)
        } else {
          fileBox = await puppet.messageFile(id)
        }
        const stream = await fileBox.toStream()
        res.statusCode = 200
        res.setHeader('Content-Type', fileBox.mediaType || 'application/octet-stream')
        res.setHeader('Content-Disposition', `inline; filename="${(fileBox.name || id).replace(/"/g, '')}"`)
        res.setHeader('Cache-Control', 'private, max-age=300')
        await pipeline(stream, res)
      } catch (err) {
        sendJson(res, 404, { error: (err as Error).message })
      }
      return
    }

    sendJson(res, 404, { error: 'Not Found' })
  }
}
