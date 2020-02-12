import * as grpc from 'grpc'

import {
  Puppet,
}             from 'wechaty-puppet'

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

export enum PuppetHostieServerType {
  Unknown = 0,
  Grpc,
  JsonRpc,
  OpenApi,
}

export interface PuppetHostieServerOptions {
  endpoint : string,
  puppet   : Puppet,
  token    : string,
  type     : PuppetHostieServerType,
}

export class PuppetHostieServer {
  private puppetServer: GrpcPuppetServer

  constructor (
    public readonly options: PuppetHostieServerOptions,
  ) {
    log.verbose('PuppetHostieServer', 'constructor(%s)', JSON.stringify(options))
    this.puppetServer = new GrpcPuppetServer()
  }

  public version (): string {
    return VERSION
  }

  public async start (): Promise<void> {
    log.verbose('PuppetHostieServer', `start()`)

    const server = new grpc.Server()
    server.addService(
      PuppetService,
      puppetServerExample,
    )
    server.bind('127.0.0.1:8788', grpc.ServerCredentials.createInsecure())
    server.start()


    this.puppetServer.start()
    log("Server started, listening: 127.0.0.1:50051")
  }

  public async stop (): Promise<void> {
    log.verbose('PuppetHostieServer', `stop()`)
    this.puppetServer.stop()
  }
}
