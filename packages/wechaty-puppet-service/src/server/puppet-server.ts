import util from 'util'

import {
  Puppet,
}                 from 'wechaty-puppet'

import {
  grpc,
  PuppetService,
}                     from 'wechaty-grpc'

import {
  log,
  VERSION,
  GRPC_OPTIONS,
}                     from '../config'

import {
  puppetImplementation,
}                         from './puppet-implementation'
import {
  authImplToken,
  GET_WECHATY_PUPPET_SERVICE_SSL_SERVER_CERT,
  GET_WECHATY_PUPPET_SERVICE_SSL_SERVER_KEY,
}                                               from '../auth/mod'

export interface PuppetServerOptions {
  endpoint       : string,
  puppet         : Puppet,
  sslServerCert? : string,
  sslServerKey?  : string,
  token          : string,
}

export class PuppetServer {

  private grpcServer?: grpc.Server

  constructor (
    public readonly options: PuppetServerOptions,
  ) {
    log.verbose('PuppetServer',
      'constructor({endpoint: "%s", puppet: "%s", token: "%s"})',
      options.endpoint,
      options.puppet,
      options.token
    )
  }

  public version (): string {
    return VERSION
  }

  public async start (): Promise<void> {
    log.verbose('PuppetServer', 'start()')

    if (this.grpcServer) {
      throw new Error('grpc server existed!')
    }

    const puppetImpl = puppetImplementation(
      this.options.puppet,
    )
    const puppetImplAuth = authImplToken(this.options.token)(puppetImpl)

    this.grpcServer = new grpc.Server(GRPC_OPTIONS)
    this.grpcServer.addService(
      PuppetService,
      puppetImplAuth,
    )

    const keyCertPairs: grpc.KeyCertPair[] = [{
      cert_chain  : Buffer.from(GET_WECHATY_PUPPET_SERVICE_SSL_SERVER_CERT(this.options.sslServerCert)),
      private_key : Buffer.from(GET_WECHATY_PUPPET_SERVICE_SSL_SERVER_KEY(this.options.sslServerKey)),
    }]

    // 127.0.0.1:8788
    const port = await util.promisify(this.grpcServer.bindAsync.bind(this.grpcServer))(
      this.options.endpoint,
      // grpc.ServerCredentials.createInsecure()
      grpc.ServerCredentials.createSsl(null, keyCertPairs),
    )

    if (port === 0) {
      throw new Error('grpc server bind fail!')
    }

    this.grpcServer.start()
  }

  public async stop (): Promise<void> {
    log.verbose('PuppetServer', 'stop()')

    if (!this.grpcServer) {
      throw new Error('no grpc server')
    }

    await util.promisify(
      this.grpcServer.tryShutdown
        .bind(this.grpcServer)
    )()

    const grpcServer = this.grpcServer
    setImmediate(() => grpcServer.forceShutdown())

    this.grpcServer = undefined
  }

}
