import {
  log,
  DEFAULT_AUTHORITY,
}                     from './config'

import {
  ChannelOptions,
  GrpcStatus,
  GrpcUri,
  Metadata,
  resolverManager,
  TcpSubchannelAddress,
  uriToString,
}                         from './grpc-js'

import { WechatyToken } from './wechaty-token'

class WechatyResolver implements resolverManager.Resolver {

  private addresses   : TcpSubchannelAddress[]
  private wechatyToken: WechatyToken

  static getDefaultAuthority (target: GrpcUri): string {
    log.verbose('ResolverWechaty', 'getDefaultAuthority(%s)', target)
    return target.authority || DEFAULT_AUTHORITY
  }

  static setup () {
    log.verbose('ResolverWechaty', 'setup()')
    resolverManager.registerResolver('wechaty', WechatyResolver)
  }

  constructor (
    public target: GrpcUri,
    public listener: resolverManager.ResolverListener,
    public channelOptions: ChannelOptions
  ) {
    log.verbose('WechatyResolver', 'constructor("%s",)', JSON.stringify(target))
    log.silly('WechatyResolver', 'constructor(,,"%s")', JSON.stringify(channelOptions))

    this.addresses    = []
    this.wechatyToken = new WechatyToken(target.authority)
  }

  private reportResolutionError (reason: string) {
    this.listener.onError({
      code: GrpcStatus.UNAVAILABLE,
      details: `Wechaty service discovery / resolution failed for target ${uriToString(
        this.target
      )}: ${reason}`,
      metadata: new Metadata(),
    })
  }

  async updateResolution (): Promise<void> {
    log.verbose('ResolverWechaty', 'updateResolution()')

    let address

    try {
      address = await this.wechatyToken.discover(this.target.path)
    } catch (e) {
      log.warn('WechatyResolver', 'updateResolution() Resolution error for target ' + uriToString(this.target) + ' due to error ' + e.message)
      console.error(e)
      this.reportResolutionError(e.message)
    }

    if (!address || !address.port) {
      log.warn('ResolverWechaty', 'updateResolution() not found target ' + uriToString(this.target) + ': token does not exist')
      this.reportResolutionError(`token "${this.target.path}" does not exist`)
      return
    }

    this.addresses = [address]

    /**
     * See: grpc-js/src/resolver-uds.ts
     */
    process.nextTick(
      this.listener.onSuccessfulResolution,
      this.addresses,
      null,
      null,
      null,
      {}
    )
  }

  destroy () {
    log.verbose('ResolverWechaty', 'destroy()')
  }

}

export {
  WechatyResolver,
}
