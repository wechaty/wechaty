/**
 * `PuppetServer`: serves any `wechaty-puppet` puppet over ConnectRPC and standard gRPC.
 * Binds the endpoint with the puppet service (behind token check) and the health service,
 * supporting HTTP/2, HTTP/1.1, Connect, standard gRPC, and gRPC-Web from a single port.
 */
import type { Server as HttpServer } from 'node:http'
import type { Http2Server, Http2SecureServer } from 'node:http2'
import * as http2 from 'node:http2'
import type { AddressInfo } from 'node:net'

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

  protected server?: HttpServer | Http2Server | Http2SecureServer
  protected urnRegistry?: UniformResourceNameRegistry

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
    )
    const healthImpl = healthImplementation(
      this.options.puppet,
    )

    const handler = connectNodeAdapter({
      routes: (router) => {
        router.service(PuppetServiceDefinition, puppetImpl as any, {
          interceptors: [
            authImplToken(this.options.token),
            serverErrorInterceptor(),
          ],
        })
        router.service(HealthServiceDefinition, healthImpl as any, {
          interceptors: [serverErrorInterceptor()],
        })
      },
    })

    const disableTls = envVars.WECHATY_PUPPET_SERVICE_NO_TLS_INSECURE_SERVER(this.options.tls?.disable)

    let parsedHost = '0.0.0.0'
    let parsedPort = 8788
    if (this.options.endpoint.includes(':')) {
      const parts = this.options.endpoint.split(':')
      parsedHost = parts[0] || '0.0.0.0'
      parsedPort = parseInt(parts[1] || '8788', 10)
    } else if (!isNaN(Number(this.options.endpoint))) {
      parsedPort = parseInt(this.options.endpoint, 10)
    }

    if (disableTls) {
      log.warn('PuppetServer', 'start() TLS disabled: INSECURE!')
      this.server = http2.createServer(handler)
    } else {
      log.verbose('PuppetServer', 'start() TLS enabled.')
      const cert = envVars.WECHATY_PUPPET_SERVICE_TLS_SERVER_CERT(this.options.tls?.serverCert) || TLS_INSECURE_SERVER_CERT
      const key = envVars.WECHATY_PUPPET_SERVICE_TLS_SERVER_KEY(this.options.tls?.serverKey) || TLS_INSECURE_SERVER_KEY
      this.server = http2.createSecureServer({ allowHTTP1: true, cert, key }, handler)
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

    log.verbose('PuppetServer', 'start() server starting ... done')
  }

  public async stop (): Promise<void> {
    log.verbose('PuppetServer', 'stop()')

    if (this.server) {
      const s = this.server
      this.server = undefined
      await new Promise<void>((resolve) => {
        s.close(() => resolve())
      })
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
