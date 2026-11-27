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
  AsyncLifecycle,
  type LifecycleClock,
  type LifecycleScope,
} from 'scopelet'
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
  endpoint      : string,
  puppet        : Puppet,
  token         : string,
  clock?        : LifecycleClock,
  stopTimeoutMs?: number,
  tls?: {
    serverCert? : string,
    serverKey?  : string,
    disable?    : boolean,
  }
}

export class PuppetServer extends AsyncLifecycle {

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
    super({
      name: 'PuppetServer',
      clock: options.clock,
      stopTimeoutMs: options.stopTimeoutMs,
    })
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

  protected override async onStart (scope: LifecycleScope): Promise<void> {
    log.verbose('PuppetServer', 'onStart()')

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

    const shutdownController = new AbortController()
    this.shutdownController = shutdownController
    const onScopeAbort = () => {
      shutdownController.abort()
    }
    scope.signal.addEventListener('abort', onScopeAbort, { once: true })
    scope.defer(() => {
      scope.signal.removeEventListener('abort', onScopeAbort)
      shutdownController.abort()
      if (this.shutdownController === shutdownController) {
        this.shutdownController = undefined
      }
    })

    if (!this.urnRegistry) {
      log.verbose('PuppetServer', 'onStart() initializing FileBox UUID URN Registry ...')
      const urnRegistry = new UniformResourceNameRegistry()
      this.urnRegistry = urnRegistry
      await urnRegistry.init()
      scope.defer(async () => {
        log.verbose('PuppetServer', 'onStop() destroy URN Registry ...')
        if (this.urnRegistry === urnRegistry) {
          this.urnRegistry = undefined
        }
        await urnRegistry.destroy()
        log.verbose('PuppetServer', 'onStop() destroy URN Registry ... done')
      })
      log.verbose('PuppetServer', 'onStart() initializing FileBox UUID URN Registry ... done')
    }

    const FileBoxUuid = uuidifyFileBoxLocal(this.urnRegistry)
    const puppetImpl = puppetImplementation(
      this.options.puppet,
      FileBoxUuid,
      shutdownController.signal,
    )
    const healthImpl = healthImplementation(
      this.options.puppet,
      shutdownController.signal,
    )

    const handler = connectNodeAdapter({
      readMaxBytes: 4 * 1024 * 1024,
      shutdownSignal: shutdownController.signal,
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
      log.warn('PuppetServer', 'onStart() TLS disabled: INSECURE!')
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

        const onPreDispatchError = (err: Error) => {
          log.verbose('PuppetServer', 'cleartext pre-dispatch socket error: %s', err.message)
          cleanupPreDispatch()
          this.sockets.delete(socket)
          socket.destroy()
        }

        const onPreDispatchClose = () => {
          cleanupPreDispatch()
          this.sockets.delete(socket)
        }

        let buffer = Buffer.alloc(0)
        const onData = (chunk: Buffer) => {
          buffer = Buffer.concat([buffer, chunk])
          // If we have received at least 3 bytes, or if it definitely cannot be the HTTP/2 preface ('PRI')
          if (buffer.length >= 3 || (buffer.length > 0 && !Buffer.from('PRI').subarray(0, buffer.length).equals(buffer))) {
            cleanupPreDispatch()
            socket.unshift(buffer)
            socket.once('close', () => this.sockets.delete(socket))
            if (buffer.length >= 3 && buffer.subarray(0, 3).toString('ascii') === 'PRI') {
              const handle = (socket as any)._handle
              if (handle) {
                try {
                  Object.defineProperty(handle, 'isStreamBase', { value: false, configurable: true })
                } catch {}
              }
              h2.emit('connection', socket)
            } else {
              h1.emit('connection', socket)
            }
          }
        }

        function cleanupPreDispatch () {
          socket.removeListener('data', onData)
          socket.removeListener('error', onPreDispatchError)
          socket.removeListener('close', onPreDispatchClose)
        }

        socket.on('error', onPreDispatchError)
        socket.once('close', onPreDispatchClose)
        socket.on('data', onData)
      })
      this.server = cleartextServer
    } else {
      log.verbose('PuppetServer', 'onStart() TLS enabled.')
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

    scope.defer(async () => {
      await this.closeServers()
    })

    await new Promise<void>((resolve, reject) => {
      const server = this.server!
      const onAbort = () => {
        server.removeListener('error', onError)
        reject(scope.signal.reason)
      }
      const onError = (err: Error) => {
        scope.signal.removeEventListener('abort', onAbort)
        reject(err)
      }
      scope.signal.addEventListener('abort', onAbort, { once: true })
      server.once('error', onError)
      server.listen(parsedPort, parsedHost, () => {
        server.removeListener('error', onError)
        scope.signal.removeEventListener('abort', onAbort)
        const addr = server.address() as AddressInfo
        if (addr) {
          log.verbose('PuppetServer', 'onStart() listening on %s:%s', addr.address, addr.port)
        }
        resolve()
      })
    })

    log.verbose('PuppetServer', 'onStart() server starting ... done')
  }

  private async closeServers (): Promise<void> {
    for (const session of this.sessions) {
      if (!session.destroyed && !session.closed) {
        session.close()
      }
    }

    const s = this.server
    this.server = undefined
    const h1 = this.h1CleartextServer
    this.h1CleartextServer = undefined
    const h2 = this.h2CleartextServer
    this.h2CleartextServer = undefined

    if (s) {
      const graceMs = Math.min(1000, this.options.stopTimeoutMs ?? 1000)
      const clock = this.options.clock
      await new Promise<void>((resolve) => {
        const forceDestroy = () => {
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
        }

        const timer = clock
          ? clock.setTimeout(forceDestroy, graceMs)
          : setTimeout(forceDestroy, graceMs)

        s.close(() => {
          if (clock) {
            clock.clearTimeout(timer)
          } else {
            clearTimeout(timer as ReturnType<typeof setTimeout>)
          }
          try { h1?.close() } catch {}
          try { h2?.close() } catch {}
          resolve()
        })
      })
      this.sessions.clear()
      this.sockets.clear()
      log.verbose('PuppetServer', 'closeServers() server shutdown ... done')
    }
  }

}
