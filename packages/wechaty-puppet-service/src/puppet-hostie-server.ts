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

import {
  log,
  VERSION,
}             from './config'

import {
  GrpcPuppetServer,
}                     from './grpc/puppet-server'

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
    options: PuppetHostieServerOptions,
  ) {
    log.verbose('PuppetHostieServer', 'constructor()')
    this.puppetServer = new GrpcPuppetServer()
  }

  public async start (): Promise<void> {
    this.puppetServer.start()
    log("Server started, listening: 127.0.0.1:50051")
  }

  public async stop (): Promise<void> {
    this.puppetServer.stop()
  }
}
