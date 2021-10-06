import util             from 'util'
import {
  Puppet,
  log,
}                       from 'wechaty-puppet'
import {
  grpc,
  puppet as grpcPuppet,
}                       from 'wechaty-grpc'

import {
  envVars,
  VERSION,
  GRPC_OPTIONS,
}                             from '../config.js'

import {
  authImplToken,
}                             from '../auth/mod.js'
import {
  TLS_INSECURE_SERVER_CERT,
  TLS_INSECURE_SERVER_KEY,
}                             from '../auth/ca.js'

import {
  puppetImplementation,
}                             from './puppet-implementation.js'
import {
  healthImplementation,
}                             from './health-implementation.js'
import {
  UuidFileManager,
}                             from '../file-box-helper/uuid-file-manager.js'
import {
  uuidifyFileBoxLocal,
}                             from '../file-box-helper/local-uuidify-file-box.js'

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

  protected grpcServer?      : grpc.Server
  protected uuidFileManager? : UuidFileManager

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

    if (!this.uuidFileManager) {
      this.uuidFileManager = new UuidFileManager()
      await this.uuidFileManager.init()
    }

    this.grpcServer = new grpc.Server(GRPC_OPTIONS)

    /**
     * Connect FileBox with UUID Manager
     */
    const FileBoxUuid = uuidifyFileBoxLocal(this.uuidFileManager)

    const puppetImpl = puppetImplementation(
      this.options.puppet,
      FileBoxUuid,
    )
    const puppetImplAuth = authImplToken(this.options.token)(puppetImpl)
    this.grpcServer.addService(
      grpcPuppet.PuppetService,
      puppetImplAuth,
    )

    const healthImpl = healthImplementation(
      this.options.puppet,
    )
    this.grpcServer.addService(
      grpcPuppet.HealthService,
      healthImpl,
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
      this.grpcServer.bindAsync
        .bind(this.grpcServer)
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

    if (this.uuidFileManager) {
      await this.uuidFileManager.destroy()
      this.uuidFileManager = undefined
    }
  }

}
