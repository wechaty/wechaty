/**
 *   Wechaty Open Source Software - https://github.com/wechaty
 *
 *   @copyright 2016 Huan LI (李卓桓) <https://github.com/huan>, and
 *                   Wechaty Contributors <https://github.com/wechaty>.
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */
import util             from 'util'

import {
  Puppet,
  log,
}                               from 'wechaty-puppet'
import {
  grpc,
  puppet as grpcPuppet,
  google as grpcGoogle,
}                               from 'wechaty-grpc'
import {
  UniformResourceNameRegistry,
}                               from 'file-box'

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
  uuidifyFileBoxLocal,
}                             from '../file-box-helper/uuidify-file-box-local.js'

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

  protected grpcServer?  : grpc.Server
  protected urnRegistry? : UniformResourceNameRegistry

  constructor (
    public readonly options: PuppetServerOptions,
  ) {
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

    if (this.grpcServer) {
      throw new Error('grpc server existed!')
    }

    if (!this.urnRegistry) {
      log.verbose('PuppetServer', 'start() initializing FileBox UUID URN Registry ...')
      this.urnRegistry = new UniformResourceNameRegistry()
      await this.urnRegistry.init()
      log.verbose('PuppetServer', 'start() initializing FileBox UUID URN Registry ... done')
    }

    /**
     * Connect FileBox with UUID Manager
     */
    const FileBoxUuid = uuidifyFileBoxLocal(this.urnRegistry)

    log.verbose('PuppetServer', 'start() initializing gRPC Server with options "%s"', JSON.stringify(GRPC_OPTIONS))
    this.grpcServer = new grpc.Server(GRPC_OPTIONS)
    log.verbose('PuppetServer', 'start() initializing gRPC Server ... done', JSON.stringify(GRPC_OPTIONS))

    log.verbose('PuppetServer', 'start() initializing puppet implementation with FileBoxUuid...')
    const puppetImpl = puppetImplementation(
      this.options.puppet,
      FileBoxUuid,
    )
    log.verbose('PuppetServer', 'start() initializing puppet implementation with FileBoxUuid... done')

    log.verbose('PuppetServer', 'start() initializing authorization with token ...')
    const puppetImplAuth = authImplToken(this.options.token)(puppetImpl)
    this.grpcServer.addService(
      grpcPuppet.PuppetService,
      puppetImplAuth,
    )
    log.verbose('PuppetServer', 'start() initializing authorization with token ... done')

    log.verbose('PuppetServer', 'start() initializing gRPC health service ...')
    const healthImpl = healthImplementation(
      this.options.puppet,
    )
    this.grpcServer.addService(
      grpcGoogle.HealthService,
      healthImpl,
    )
    log.verbose('PuppetServer', 'start() initializing gRPC health service ... done')

    log.verbose('PuppetServer', 'start() initializing TLS CA ...')
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
    log.verbose('PuppetServer', 'start() initializing TLS CA ... done')

    const keyCertPairs: grpc.KeyCertPair[] = [{
      cert_chain  : certChain,
      private_key : privateKey,
    }]

    /**
     * Huan(202108): for maximum compatible with the non-tls community servers/clients,
     *  we introduced the WECHATY_PUPPET_SERVICE_NO_TLS_INSECURE_{SERVER,CLIENT} environment variables.
     *  if it has been set, then we will run under HTTP instead of HTTPS
     */
    log.verbose('PuppetServer', 'start() initializing gRPC server credentials ...')
    let credential
    if (envVars.WECHATY_PUPPET_SERVICE_NO_TLS_INSECURE_SERVER(this.options.tls?.disable)) {
      log.warn('PuppetServer', 'start() TLS disabled: INSECURE!')
      credential = grpc.ServerCredentials.createInsecure()
    } else {
      log.verbose('PuppetServer', 'start() TLS enabled.')
      credential = grpc.ServerCredentials.createSsl(caCertBuf, keyCertPairs)
    }
    log.verbose('PuppetServer', 'start() initializing gRPC server credentials ... done')

    /***
     * Start Grpc Server
     */
    log.verbose('PuppetServer', 'start() gRPC server starting ...')
    const port = await util.promisify(
      this.grpcServer.bindAsync
        .bind(this.grpcServer),
    )(
      this.options.endpoint,
      credential,
    )

    if (port === 0) {
      throw new Error('grpc server bind fail!')
    }

    this.grpcServer.start()
    log.verbose('PuppetServer', 'start() gRPC server starting ... done')
  }

  public async stop (): Promise<void> {
    log.verbose('PuppetServer', 'stop()')

    if (this.grpcServer) {
      const grpcServer = this.grpcServer
      this.grpcServer = undefined

      log.verbose('PuppetServer', 'stop() shuting down gRPC server ...')
      // const future = await util.promisify(
      //   grpcServer.tryShutdown
      //     .bind(grpcServer),
      // )()

      try {
        await new Promise(resolve => setImmediate(resolve))
        grpcServer.forceShutdown()
        /**
         * Huan(202110) grpc.tryShutdown() never return if client close the connection. #176
         *  @see https://github.com/wechaty/puppet-service/issues/176
         *
         * FIXME: even after called `forceShutdown()`, the `tryShutdown()` can not resolved.
         *  commented out the `await` for now to make it work temporary.
         */
        // await future

      } catch (e) {
        log.warn('PuppetServer', 'stop() gRPC shutdown rejection: %s', (e as Error).message)
      } finally {
        log.verbose('PuppetServer', 'stop() shuting down gRPC server ... done')
      }

    } else {
      log.warn('PuppetServer', 'stop() no grpcServer exist')
    }

    if (this.urnRegistry) {
      log.verbose('PuppetServer', 'stop() destory URN Registry ...')
      await this.urnRegistry.destroy()
      this.urnRegistry = undefined
      log.verbose('PuppetServer', 'stop() destory URN Registry ... done')
    }

  }

}
