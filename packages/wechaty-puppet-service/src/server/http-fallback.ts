/**
 * Plain-HTTP `fallback` routes and CORS handling for `PuppetServer`:
 * - Public: `GET /healthz`, `GET /openapi.json`, `GET /docs` (Scalar API Reference)
 * - Authenticated: `GET /events` (W3C SSE), `POST /files`, `GET /files/:id`
 */
import { createReadStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'

import { cors } from '@connectrpc/connect'
import type { connectNodeAdapter } from '@connectrpc/connect-node'
import { openApiSpec, type OpenApiDocument } from 'wechaty-grpc/openapi'
import type { FileBoxInterface } from 'file-box'
import * as PUPPET from 'wechaty-puppet'

import { verifyTokenFromHeaders } from '../auth/verify-token.ts'
import { log } from '../config.ts'
import { PayloadTooLargeError, type StagedFileStore } from './staged-file-store.ts'

type NodeHandlerFn = NonNullable<Parameters<typeof connectNodeAdapter>[0]['fallback']>

/** Incoming Node HTTP/1.1 or HTTP/2 request type accepted by `connectNodeAdapter`. */
export type NodeReq = Parameters<NodeHandlerFn>[0]
/** Outgoing Node HTTP/1.1 or HTTP/2 response type accepted by `connectNodeAdapter`. */
export type NodeRes = Parameters<NodeHandlerFn>[1]

const DEFAULT_SCALAR_CDN_URL = 'https://cdn.jsdelivr.net/npm/@scalar/api-reference/esm.js'
const MAX_SSE_BUFFERED_BYTES = 1024 * 1024 // 1 MiB backpressure cap per slow SSE consumer

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
 * Apply CORS headers to an HTTP response, using `WECHATY_PUPPET_SERVICE_CORS_ORIGIN`
 * if configured (defaulting to `*`).
 */
export function applyCorsHeaders (res: NodeRes): void {
  const origin = process.env['WECHATY_PUPPET_SERVICE_CORS_ORIGIN'] || '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS)
  res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS)
  if (EXPOSED_HEADERS) {
    res.setHeader('Access-Control-Expose-Headers', EXPOSED_HEADERS)
  }
}

function sendJson (res: NodeRes, status: number, body: unknown): void {
  if (res.writableEnded || res.destroyed) return
  const payload = JSON.stringify(body)
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(payload)
}

function resolveScalarCdnUrl (): string {
  const raw = process.env['WECHATY_PUPPET_SERVICE_SCALAR_CDN_URL'] || DEFAULT_SCALAR_CDN_URL
  try {
    const parsed = new URL(raw)
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString()
    }
  } catch {
    // Fall back to default CDN URL if override is invalid
  }
  return DEFAULT_SCALAR_CDN_URL
}

function renderScalarHtml (cdnUrl: string): string {
  const safeCdnUrl = cdnUrl.replace(/'/g, '%27').replace(/</g, '%3C')
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

function buildContentDisposition (filename: string): string {
  const sanitizedAscii = filename.replace(/[\r\n"\\]/g, '_').replace(/[^\x20-\x7e]/g, '_') || 'file.bin'
  const encoded = encodeURIComponent(filename.replace(/[\r\n]/g, '_'))
  return `inline; filename="${sanitizedAscii}"; filename*=UTF-8''${encoded}`
}

/**
 * Augment the base `wechaty-grpc/openapi` document with the live `PuppetServer`
 * plain-HTTP `fallback` routes (`/events`, `/files`, `/files/{id}`, `/healthz`).
 */
export function buildRuntimeOpenApiSpec (baseSpec: OpenApiDocument): OpenApiDocument {
  const unauthorized = {
    description: 'Unauthorized: missing or invalid Wechaty Puppet Service token',
  }
  return {
    ...baseSpec,
    paths: {
      ...baseSpec.paths,
      '/events': {
        get: {
          operationId: 'Puppet_EventsSSE',
          summary: 'Subscribe to real-time Puppet events via Server-Sent Events (SSE)',
          tags: ['wechaty.Puppet'],
          responses: {
            '200': {
              description: 'Continuous SSE stream of Wechaty Puppet events',
              content: {
                'text/event-stream': {
                  itemSchema: {
                    type: 'object',
                    required: ['event', 'data'],
                    properties: {
                      id: { type: 'string' },
                      event: {
                        type: 'string',
                        description: 'Wechaty PuppetEventName (e.g., message, scan, login, heartbeat)',
                      },
                      retry: { type: 'integer', minimum: 0 },
                      data: {
                        type: 'string',
                        contentMediaType: 'application/json',
                        contentSchema: { type: 'object', additionalProperties: true },
                      },
                    },
                  },
                },
              },
            },
            '401': unauthorized,
          },
        },
      },
      '/files': {
        post: {
          operationId: 'Puppet_FilesUpload',
          summary: 'Upload binary media to stage a FileBox handle for MessageSendFile',
          tags: ['wechaty.Puppet'],
          parameters: [
            {
              name: 'X-File-Name',
              in: 'header',
              required: false,
              schema: { type: 'string' },
              description: 'Optional filename for the uploaded media.',
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/octet-stream': {},
            },
          },
          responses: {
            '201': {
              description: 'Staged file metadata',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['id', 'url', 'name', 'mimeType', 'size'],
                    properties: {
                      id: { type: 'string' },
                      url: { type: 'string' },
                      name: { type: 'string' },
                      mimeType: { type: 'string' },
                      size: { type: 'integer', minimum: 0 },
                    },
                  },
                },
              },
            },
            '401': unauthorized,
            '413': { description: 'Payload Too Large' },
          },
        },
      },
      '/files/{id}': {
        get: {
          operationId: 'Puppet_FilesDownload',
          summary: 'Download staged upload or Puppet media/avatar FileBox by ID',
          tags: ['wechaty.Puppet'],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
            {
              name: 'kind',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
                enum: ['staged', 'message', 'contact-avatar', 'room-avatar'],
              },
            },
          ],
          responses: {
            '200': {
              description: 'Binary file stream',
              content: {
                'application/octet-stream': {},
              },
            },
            '401': unauthorized,
            '404': { description: 'File not found or expired' },
          },
        },
      },
      '/healthz': {
        get: {
          operationId: 'Puppet_Healthz',
          summary: 'Lightweight HTTP health probe',
          tags: ['grpc.health.v1.Health'],
          security: [],
          responses: {
            '200': {
              description: 'Service is healthy',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['status'],
                    properties: {
                      status: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  }
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

/**
 * Configuration options for `createHttpFallback`.
 */
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
export function createHttpFallback (options: HttpFallbackOptions): NodeHandlerFn {
  const { puppet, token, stagedFiles, shutdownSignal } = options
  const openApiJson = JSON.stringify(buildRuntimeOpenApiSpec(openApiSpec))

  return async (req: NodeReq, res: NodeRes): Promise<void> => {
    try {
      const method = (req.method || 'GET').toUpperCase()
      const rawUrl = req.url || '/'
      let url: URL
      try {
        url = new URL(rawUrl, 'http://localhost')
      } catch {
        sendJson(res, 400, { error: 'Invalid request URL' })
        return
      }
      const pathname = url.pathname

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
        res.statusCode = 200
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.end(renderScalarHtml(resolveScalarCdnUrl()))
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

        await new Promise<void>((resolve) => {
          let cleaned = false
          let eventId = 0
          const listeners: Array<{ name: PUPPET.types.PuppetEventName; fn: (...args: unknown[]) => void }> = []
          let heartbeatTimer: ReturnType<typeof setInterval> | undefined

          const cleanup = () => {
            if (cleaned) return
            cleaned = true
            if (heartbeatTimer) {
              clearInterval(heartbeatTimer)
              heartbeatTimer = undefined
            }
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

          const writeSse = (eventName: string, payload: unknown) => {
            if (cleaned || res.writableEnded || res.destroyed) return
            if (res.writableLength > MAX_SSE_BUFFERED_BYTES) {
              log.warn('PuppetServer', 'SSE consumer backpressure exceeded %d bytes; closing stream', MAX_SSE_BUFFERED_BYTES)
              cleanup()
              return
            }
            eventId += 1
            res.write(`id: ${eventId}\nevent: ${eventName}\ndata: ${JSON.stringify(payload ?? {})}\n\n`)
          }

          for (const eventName of SSE_EVENT_NAMES) {
            const fn = (payload: unknown) => {
              writeSse(eventName, payload)
            }
            listeners.push({ name: eventName, fn })
            puppet.on(eventName as any, fn as any)
          }

          writeSse('heartbeat', { data: 'Wechaty Puppet SSE stream connected' })
          heartbeatTimer = setInterval(() => {
            writeSse('heartbeat', { data: 'heartbeat' })
          }, 15_000)
          heartbeatTimer.unref?.()

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
          log.warn('PuppetServer', 'POST /files upload failed: %s', (err as Error).message)
          sendJson(res, 500, { error: 'File upload failed' })
        }
        return
      }

      if (method === 'GET' && pathname.startsWith('/files/')) {
        if (!verifyTokenFromHeaders(req.headers, token)) {
          sendJson(res, 401, { error: 'Unauthorized' })
          return
        }
        let id: string
        try {
          id = decodeURIComponent(pathname.slice('/files/'.length))
        } catch {
          sendJson(res, 400, { error: 'Invalid file ID encoding' })
          return
        }
        if (!id) {
          sendJson(res, 400, { error: 'Missing file ID' })
          return
        }

        const kind = url.searchParams.get('kind')
        if (!kind || kind === 'staged') {
          const staged = stagedFiles.get(id)
          if (staged) {
            try {
              res.statusCode = 200
              res.setHeader('Content-Type', staged.mimeType)
              res.setHeader('Content-Disposition', buildContentDisposition(staged.name))
              res.setHeader('Cache-Control', 'private, max-age=300')
              await pipeline(createReadStream(staged.filePath), res)
            } catch (err) {
              log.warn('PuppetServer', 'GET /files/%s stream failed: %s', id, (err as Error).message)
              if (!res.headersSent) {
                sendJson(res, 404, { error: 'Staged file not found or expired' })
              } else if (!res.destroyed) {
                res.destroy()
              }
            }
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
          res.setHeader('Content-Disposition', buildContentDisposition(fileBox.name || id))
          res.setHeader('Cache-Control', 'private, max-age=300')
          await pipeline(stream, res)
        } catch (err) {
          log.verbose('PuppetServer', 'GET /files/%s lookup failed: %s', id, (err as Error).message)
          if (!res.headersSent) {
            sendJson(res, 404, { error: 'File not found' })
          } else if (!res.destroyed) {
            res.destroy()
          }
        }
        return
      }

      sendJson(res, 404, { error: 'Not Found' })
    } catch (err) {
      log.warn('PuppetServer', 'HTTP fallback error: %s', (err as Error).message)
      if (!res.headersSent) {
        sendJson(res, 500, { error: 'Internal Server Error' })
      } else if (!res.destroyed) {
        res.destroy()
      }
    }
  }
}
