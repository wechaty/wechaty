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
import {
  TLS_INSECURE_SERVER_CERT, TLS_INSECURE_SERVER_KEY,
}                             from '../auth/ca'

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

    const caCerts = envVars.WECHATY_PUPPET_SERVICE_TLS_CA_CERT()
    const caCertBuf = caCerts
      ? Buffer.from(caCerts)
      : null

    const certChain = Buffer.from(
      envVars.WECHATY_PUPPET_SERVICE_TLS_SERVER_CERT(this.options.tls?.serverCert)
      || TLS_INSECURE_SERVER_CERT,
    )
    const privateKey = Buffer.from(
      envVars.WECHATY_PUPPET_SERVICE_TLS_SERVER_KEY(this.options.tls?.serverKey)
      || TLS_INSECURE_SERVER_KEY,
    )

    const keyCertPairs: grpc.KeyCertPair[] = [{
      cert_chain  : certChain,
      private_key : privateKey,
    }]

    /**
     * Huan(202108): for maximum compatible with the non-tls community servers/clients,
     *  we introduced the WECHATY_PUPPET_SERVICE_NO_TLS_INSECURE_{SERVER,CLIENT} environment variables.
     *  if it has been set, then we will run under HTTP instead of HTTPS
     */
    let credential
    if (envVars.WECHATY_PUPPET_SERVICE_NO_TLS_INSECURE_SERVER(this.options.tls?.disable)) {
      log.warn('PuppetServer', 'start() TLS disabled: INSECURE!')
      credential = grpc.ServerCredentials.createInsecure()
    } else {
      log.verbose('PuppetServer', 'start() TLS enabled.')
      credential = grpc.ServerCredentials.createSsl(caCertBuf, keyCertPairs)
    }

    /***
     * Start Grpc Server
     */
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
