/**
 * WinterTC / browser ConnectRPC transport factory using `@connectrpc/connect-web`
 * (`fetch`-based). Zero `node:*` imports. Wires a transport-owned `AbortController`
 * so `abort()` cancels any in-flight HTTP requests during shutdown or reconnect.
 */
import type { Interceptor, Transport } from '@connectrpc/connect'
import { createConnectTransport } from '@connectrpc/connect-web'

export type PuppetTransportProtocol = 'grpc' | 'connect'

export interface PuppetTransportOptions {
  baseUrl: string
  protocol?: PuppetTransportProtocol
  pingIntervalMs?: number
  interceptors?: Interceptor[]
  fetch?: typeof globalThis.fetch
  nodeOptions?: {
    ca?: Uint8Array
    rejectUnauthorized?: boolean
    servername?: string
  }
}

export interface PuppetTransportHandle {
  transport: Transport
  abort: () => void
}

/**
 * Create a ConnectRPC `Transport` for browser/web-platform runtimes with
 * transport-wide abort propagation.
 */
export function createPuppetTransport (options: PuppetTransportOptions): PuppetTransportHandle {
  if (options.protocol === 'grpc') {
    throw new Error('gRPC binary transport is not supported in browser/web-platform environments; use protocol: "connect"')
  }

  const controller = new AbortController()
  const baseFetch = options.fetch ?? globalThis.fetch

  const transportFetch: typeof globalThis.fetch = (input, init) => {
    const signal = init?.signal
      ? AbortSignal.any([controller.signal, init.signal])
      : controller.signal
    return baseFetch(input, { ...init, signal })
  }

  const transport = createConnectTransport({
    baseUrl: options.baseUrl,
    interceptors: options.interceptors,
    fetch: transportFetch,
  })

  return {
    transport,
    abort: () => controller.abort(new Error('Transport aborted')),
  }
}
