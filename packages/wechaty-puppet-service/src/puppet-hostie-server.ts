import {
  Puppet,
}             from 'wechaty-puppet'

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

  constructor (
    public readonly options: PuppetHostieServerOptions,
  ) {
    log.verbose('PuppetHostieServer', 'constructor(%s)', JSON.stringify(options))
  }

  public version (): string {
    return VERSION
  }

  public async start (): Promise<void> {
    log.verbose('PuppetHostieServer', `start()`)
  }

  public async stop (): Promise<void> {
    log.verbose('PuppetHostieServer', `stop()`)
  }

}
