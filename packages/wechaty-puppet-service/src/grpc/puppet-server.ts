/// <reference path="./typings.d.ts" />

import util from 'util'
import grpc from 'grpc'

import {
  Puppet,
}                 from 'wechaty-puppet'

import {
  ContactList,
  ContactPayload,
  Empty,
  Id,

  IPuppetServer,
  PuppetService,
}                     from '@chatie/grpc'

import { StringValue } from 'google-protobuf/google/protobuf/wrappers_pb'

import {
  log,
  VERSION,
}             from './config'

export interface PuppetHostieGrpcServerOptions {
  endpoint : string,
  token    : string,
  puppet   : Puppet,
}

export class PuppetHostieGrpcServer {

  private grpcServer?: grpc.Server

  constructor (
    public readonly options: PuppetHostieGrpcServerOptions,
  ) {
    log.verbose('PuppetHostieGrpcServer', 'constructor(%s)', JSON.stringify(options))
  }

  public version (): string {
    return VERSION
  }

  public async start (): Promise<void> {
    log.verbose('PuppetHostieGrpcServer', `start()`)

    this.grpcServer = new grpc.Server()
    this.grpcServer.addService(
      PuppetService,
      puppetServerImpl,
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
    log.verbose('PuppetHostieGrpcServer', `stop()`)

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
