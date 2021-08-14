import util from 'util'

import {
  Puppet,
}                 from 'wechaty-puppet'

import {
  grpc,
  PuppetService,
}                     from 'wechaty-grpc'

import {
  envVars,
  log,
  VERSION,
  GRPC_OPTIONS,
}                     from '../config'

import {
  puppetImplementation,
}                         from './puppet-implementation'
import {
  authImplToken,
}                         from '../auth/mod'

export interface PuppetServerOptions {
  endpoint               : string,
  puppet                 : Puppet,
  sslServerCert?         : string,
  sslServerKey?          : string,
  token                  : string,
  deprecatedNoSslUnsafe? : boolean,
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

    const rootCertsData = envVars.WECHATY_PUPPET_SERVICE_SSL_ROOT_CERT()
    const rootCerts = rootCertsData
      ? Buffer.from(rootCertsData)
      : null

    const keyCertPairs: grpc.KeyCertPair[] = [{
      cert_chain  : Buffer.from(envVars.WECHATY_PUPPET_SERVICE_SSL_SERVER_CERT(this.options.sslServerCert)),
      private_key : Buffer.from(envVars.WECHATY_PUPPET_SERVICE_SSL_SERVER_KEY(this.options.sslServerKey)),
    }]

    /**
     * Huan(202108): for maximum compatible with the non-ssl community servers/clients,
     *  we introduced the WECHATY_PUPPET_SERVICE_DEPRECATED_NO_SSL_UNSAFE environment.
     *  if it has been set, then we will run under HTTP instead of HTTPS
     */
    let credential
    if (envVars.WECHATY_PUPPET_SERVICE_SSL_DEPRECATED_NO_SSL_UNSAFE_SERVER(this.options.deprecatedNoSslUnsafe)) {
      log.warn('PuppetServer', 'start() WECHATY_PUPPET_SERVICE_SSL_DEPRECATED_NO_SSL_UNSAFE_SERVER should not be set in production!')
      credential = grpc.ServerCredentials.createInsecure()
    } else {
      credential = grpc.ServerCredentials.createSsl(rootCerts, keyCertPairs)
    }

    const port = await util.promisify(
      this.grpcServer.bindAsync.bind(this.grpcServer)
    )(
      this.options.endpoint,
      credential,
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
