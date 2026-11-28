/**
 * Node.js / Deno ConnectRPC transport factory supporting both binary HTTP/2 gRPC
 * (`createGrpcTransport`, default for legacy polyglot server compatibility) and
 * Connect (`createConnectTransport`) with `Http2SessionManager` keepalive pings.
 */
import {
  createConnectTransport,
  createGrpcTransport,
  Http2SessionManager,
} from '@connectrpc/connect-node'

import type {
  PuppetTransportHandle,
  PuppetTransportOptions,
  PuppetTransportProtocol,
} from '../client/transport.ts'

export type {
  PuppetTransportHandle,
  PuppetTransportOptions,
  PuppetTransportProtocol,
}

const DEFAULT_PING_INTERVAL_MS = 15_000

/**
 * Create a Node.js ConnectRPC `Transport` (`grpc` or `connect`) backed by `Http2SessionManager`.
 */
export function createPuppetTransport (options: PuppetTransportOptions): PuppetTransportHandle {
  const protocol = options.protocol ?? 'grpc'
  const pingIntervalMs = options.pingIntervalMs ?? DEFAULT_PING_INTERVAL_MS
  const nodeOptions = options.nodeOptions
    ? {
      ca: options.nodeOptions.ca ? Buffer.from(options.nodeOptions.ca) : undefined,
      rejectUnauthorized: options.nodeOptions.rejectUnauthorized,
      servername: options.nodeOptions.servername,
    }
    : undefined

  const sessionManager = new Http2SessionManager(
    options.baseUrl,
    { pingIntervalMs },
    nodeOptions,
  )

  const transport = protocol === 'connect'
    ? createConnectTransport({
      baseUrl: options.baseUrl,
      httpVersion: '2',
      sessionManager,
      interceptors: options.interceptors,
      nodeOptions,
    })
    : createGrpcTransport({
      baseUrl: options.baseUrl,
      sessionManager,
      interceptors: options.interceptors,
      nodeOptions,
    })

  return {
    transport,
    abort: () => sessionManager.abort(),
  }
}
