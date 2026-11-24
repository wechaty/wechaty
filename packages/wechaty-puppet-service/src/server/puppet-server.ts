/**
 * `PuppetServer`: serves any `wechaty-puppet` puppet over ConnectRPC and standard gRPC.
 * Binds the endpoint with the puppet service (behind token check) and the health service,
 * supporting HTTP/2, HTTP/1.1, Connect, standard gRPC, and gRPC-Web from a single port.
 */
import http from 'node:http'
import type { Server as HttpServer } from 'node:http'
import type { Http2Server, Http2SecureServer } from 'node:http2'
import * as http2 from 'node:http2'
import net from 'node:net'
import type { AddressInfo, Socket } from 'node:net'

import {
  Puppet,
  log,
} from 'wechaty-puppet'
import {
  Puppet as PuppetServiceDefinition,
  Health as HealthServiceDefinition,
} from 'wechaty-grpc'
import {
  UniformResourceNameRegistry,
} from 'file-box'
import { connectNodeAdapter } from '@connectrpc/connect-node'

import {
  envVars,
  VERSION,
} from '../config.ts'
import {
  authImplToken,
} from '../auth/mod.ts'
import {
  TLS_INSECURE_SERVER_CERT,
  TLS_INSECURE_SERVER_KEY,
} from '../auth/ca.ts'

import {
  puppetImplementation,
} from './puppet-implementation.ts'
import {
  healthImplementation,
} from './health-implementation.ts'
import {
  serverErrorInterceptor,
} from './grpc-error.ts'
import {
  uuidifyFileBoxLocal,
} from '../file-box-helper/uuidify-file-box-local.ts'

export interface PuppetServerOptions {
  endpoint : string,
  puppet   : Puppet,
  token    : string,
  tls?: {
    serverCert? : string,
    serverKey?  : string,
    disable?    : boolean,
  }
}

export class PuppetServer {

  protected server?: HttpServer | Http2Server | Http2SecureServer | net.Server
  protected urnRegistry?: UniformResourceNameRegistry
  protected shutdownController?: AbortController

  private sessions = new Set<http2.ServerHttp2Session>()
  private sockets = new Set<Socket>()
  private h1CleartextServer?: HttpServer
  private h2CleartextServer?: Http2Server

  readonly options: PuppetServerOptions

  constructor (
    options: PuppetServerOptions,
  ) {
    this.options = options
    log.verbose('PuppetServer',
      'constructor({endpoint: "%s", puppet: "%s", token: "%s"})',
      options.endpoint,
      options.puppet,
      options.token,
    )
  }

  public version (): string {
    return VERSION
  }

  public async start (): Promise<void> {
    log.verbose('PuppetServer', 'start()')

    if (this.server) {
      throw new Error('grpc server existed!')
    }

    let parsedHost = '0.0.0.0'
    let parsedPort = 8788
    const endpoint = (this.options.endpoint || '').trim()
    if (endpoint) {
      if (endpoint.startsWith('[')) {
        const closeBracket = endpoint.indexOf(']')
        if (closeBracket === -1) {
          throw new Error(`Invalid IPv6 endpoint "${endpoint}": missing closing bracket`)
        }
        parsedHost = endpoint.slice(1, closeBracket)
        const remainder = endpoint.slice(closeBracket + 1)
        if (remainder) {
          if (!remainder.startsWith(':')) {
            throw new Error(`Invalid endpoint "${endpoint}" after IPv6 address`)
          }
          const portPart = remainder.slice(1)
          if (!/^\d+$/.test(portPart)) {
            throw new Error(`Invalid endpoint port "${portPart}" in "${endpoint}"`)
          }
          const p = Number(portPart)
          if (p < 0 || p > 65535) {
            throw new Error(`Endpoint port "${portPart}" out of range (0-65535) in "${endpoint}"`)
          }
          parsedPort = p
        }
      } else if (endpoint.includes(':')) {
        const lastColon = endpoint.lastIndexOf(':')
        const hostPart = endpoint.slice(0, lastColon)
        const portPart = endpoint.slice(lastColon + 1)
        if (hostPart.includes(':')) {
          throw new Error(`Invalid endpoint "${endpoint}": IPv6 endpoints with port must be bracketed like "[::1]:8788"`)
        }
        if (!/^\d+$/.test(portPart)) {
          throw new Error(`Invalid endpoint port "${portPart}" in "${endpoint}"`)
        }
        const p = Number(portPart)
        if (p < 0 || p > 65535) {
          throw new Error(`Endpoint port "${portPart}" out of range (0-65535) in "${endpoint}"`)
        }
        parsedHost = hostPart || '0.0.0.0'
        parsedPort = p
      } else if (/^\d+$/.test(endpoint)) {
        const p = Number(endpoint)
        if (p < 0 || p > 65535) {
          throw new Error(`Endpoint port "${endpoint}" out of range (0-65535)`)
        }
        parsedPort = p
      } else {
        parsedHost = endpoint
        parsedPort = 8788
      }
    }

    this.shutdownController = new AbortController()

    try {
      if (!this.urnRegistry) {
        log.verbose('PuppetServer', 'start() initializing FileBox UUID URN Registry ...')
        this.urnRegistry = new UniformResourceNameRegistry()
        await this.urnRegistry.init()
        log.verbose('PuppetServer', 'start() initializing FileBox UUID URN Registry ... done')
      }

      const FileBoxUuid = uuidifyFileBoxLocal(this.urnRegistry)
      const puppetImpl = puppetImplementation(
        this.options.puppet,
        FileBoxUuid,
        this.shutdownController.signal,
      )
      const healthImpl = healthImplementation(
        this.options.puppet,
        this.shutdownController.signal,
      )

      const handler = connectNodeAdapter({
        readMaxBytes: 4 * 1024 * 1024,
        shutdownSignal: this.shutdownController.signal,
        routes: (router) => {
          router.service(PuppetServiceDefinition, puppetImpl, {
            interceptors: [
              authImplToken(this.options.token),
              serverErrorInterceptor(),
            ],
          })
          router.service(HealthServiceDefinition, healthImpl, {
            interceptors: [serverErrorInterceptor()],
          })
        },
      })

      const requestListener = (req: http2.Http2ServerRequest, res: http2.Http2ServerResponse) => {
        if (req.headers[':authority'] && !req.headers['authority']) {
          req.headers['authority'] = req.headers[':authority']
        }
        return handler(req, res)
      }

      const disableTls = envVars.WECHATY_PUPPET_SERVICE_NO_TLS_INSECURE_SERVER(this.options.tls?.disable)

      if (disableTls) {
        log.warn('PuppetServer', 'start() TLS disabled: INSECURE!')
        const h1 = http.createServer(requestListener as any)
        const h2 = http2.createServer(requestListener)
        this.h1CleartextServer = h1
        this.h2CleartextServer = h2

        h2.on('session', (session) => {
          this.sessions.add(session)
          session.once('close', () => this.sessions.delete(session))
        })

        const cleartextServer = net.createServer((socket) => {
          this.sockets.add(socket)
          socket.once('close', () => this.sockets.delete(socket))
          socket.once('data', (chunk) => {
            socket.unshift(chunk)
            if (chunk.length >= 3 && chunk.toString('ascii', 0, 3) === 'PRI') {
              const handle = (socket as any)._handle
              if (handle) {
                Object.defineProperty(handle, 'isStreamBase', { value: false, configurable: true })
              }
              h2.emit('connection', socket)
            } else {
              h1.emit('connection', socket)
            }
          })
        })
        this.server = cleartextServer
      } else {
        log.verbose('PuppetServer', 'start() TLS enabled.')
        const cert = envVars.WECHATY_PUPPET_SERVICE_TLS_SERVER_CERT(this.options.tls?.serverCert) || TLS_INSECURE_SERVER_CERT
        const key = envVars.WECHATY_PUPPET_SERVICE_TLS_SERVER_KEY(this.options.tls?.serverKey) || TLS_INSECURE_SERVER_KEY
        this.server = http2.createSecureServer({ allowHTTP1: true, cert, key }, requestListener)

        this.server.on('session', (session) => {
          this.sessions.add(session)
          session.once('close', () => this.sessions.delete(session))
        })
        this.server.on('connection', (socket) => {
          this.sockets.add(socket)
          socket.once('close', () => this.sockets.delete(socket))
        })
        this.server.on('secureConnection', (socket) => {
          this.sockets.add(socket)
          socket.once('close', () => this.sockets.delete(socket))
        })
      }

      await new Promise<void>((resolve, reject) => {
        this.server!.once('error', reject)
        this.server!.listen(parsedPort, parsedHost, () => {
          this.server!.removeListener('error', reject)
          const addr = this.server!.address() as AddressInfo
          if (addr) {
            log.verbose('PuppetServer', 'start() listening on %s:%s', addr.address, addr.port)
          }
          resolve()
        })
      })
    } catch (e) {
      if (this.shutdownController) {
        this.shutdownController.abort()
        this.shutdownController = undefined
      }
      if (this.server) {
        try { this.server.close() } catch {}
        this.server = undefined
      }
      if (this.h1CleartextServer) {
        try { this.h1CleartextServer.close() } catch {}
        this.h1CleartextServer = undefined
      }
      if (this.h2CleartextServer) {
        try { this.h2CleartextServer.close() } catch {}
        this.h2CleartextServer = undefined
      }
      if (this.urnRegistry) {
        try { await this.urnRegistry.destroy() } catch {}
        this.urnRegistry = undefined
      }
      throw e
    }

    log.verbose('PuppetServer', 'start() server starting ... done')
  }

  public async stop (): Promise<void> {
    log.verbose('PuppetServer', 'stop()')

    if (this.shutdownController) {
      this.shutdownController.abort()
      this.shutdownController = undefined
    }

    for (const session of this.sessions) {
      if (!session.destroyed && !session.closed) {
        session.close()
      }
    }

    if (this.server) {
      const s = this.server
      this.server = undefined
      const h1 = this.h1CleartextServer
      this.h1CleartextServer = undefined
      const h2 = this.h2CleartextServer
      this.h2CleartextServer = undefined

      await new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
          for (const session of this.sessions) {
            if (!session.destroyed) {
              try {
                session.destroy()
              } catch {}
            }
          }
          for (const socket of this.sockets) {
            if (!socket.destroyed) {
              try {
                socket.destroy()
              } catch {}
            }
          }
        }, 1000)

        s.close(() => {
          clearTimeout(timer)
          try { h1?.close() } catch {}
          try { h2?.close() } catch {}
          resolve()
        })
      })
      this.sessions.clear()
      this.sockets.clear()
      log.verbose('PuppetServer', 'stop() server shutdown ... done')
    }

    if (this.urnRegistry) {
      log.verbose('PuppetServer', 'stop() destroy URN Registry ...')
      await this.urnRegistry.destroy()
      this.urnRegistry = undefined
      log.verbose('PuppetServer', 'stop() destroy URN Registry ... done')
    }
  }

}
