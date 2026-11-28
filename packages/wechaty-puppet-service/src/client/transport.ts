/**
 * WinterTC / browser ConnectRPC transport factory using `@connectrpc/connect-web`
 * (`fetch`-based). Zero `node:*` imports.
 */
import type { Interceptor, Transport } from '@connectrpc/connect'
import { createConnectTransport } from '@connectrpc/connect-web'

export type PuppetTransportProtocol = 'grpc' | 'connect'

export interface PuppetTransportOptions {
  baseUrl: string
  protocol?: PuppetTransportProtocol
  pingIntervalMs?: number
  interceptors?: Interceptor[]
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
 * Create a ConnectRPC `Transport` for browser/web-platform runtimes.
 */
export function createPuppetTransport (options: PuppetTransportOptions): PuppetTransportHandle {
  if (options.protocol === 'grpc') {
    throw new Error('gRPC binary transport is not supported in browser/web-platform environments; use protocol: "connect"')
  }

  const transport = createConnectTransport({
    baseUrl: options.baseUrl,
    interceptors: options.interceptors,
  })

  return {
    transport,
    abort: () => {},
  }
}
