import util from 'util'
import grpc from 'grpc'

import {
  Puppet,
}                 from 'wechaty-puppet'

import {
  PuppetService,
}                     from '@chatie/grpc'

import {
  log,
  VERSION,
}                     from '../config'

import {
  puppetImplementation,
}                         from './puppet-implementation'

export interface PuppetServerOptions {
  endpoint : string,
  token    : string,
  puppet   : Puppet,
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
    log.verbose('PuppetServer', `start()`)

    if (this.grpcServer) {
      throw new Error('grpc server existed!')
    }

    const puppetImpl = puppetImplementation(
      this.options.puppet,
    )

    this.grpcServer = new grpc.Server()
    this.grpcServer.addService(
      PuppetService,
      puppetImpl,
    )

    // 127.0.0.1:8788
    const port = this.grpcServer.bind(
      this.options.endpoint,
      grpc.ServerCredentials.createInsecure()
    )

    if (port === 0) {
      throw new Error('grpc server bind fail!')
    }

    this.grpcServer.start()
  }

  public async stop (): Promise<void> {
    log.verbose('PuppetServer', `stop()`)

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
