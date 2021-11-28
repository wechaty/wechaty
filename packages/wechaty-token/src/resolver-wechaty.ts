import {
  log,
  DEFAULT_AUTHORITY,
}                     from './config.js'

import {
  ChannelOptions,
  GrpcStatus,
  GrpcUri,
  Metadata,
  resolverManager,
  TcpSubchannelAddress,
  uriToString,
}                         from './grpc-js.js'

import { WechatyToken } from './wechaty-token.js'

class WechatyResolver implements resolverManager.Resolver {

  private addresses: TcpSubchannelAddress[]

  static getDefaultAuthority (target: GrpcUri): string {
    log.verbose('ResolverWechaty', 'getDefaultAuthority(%s)', JSON.stringify(target))
    return target.authority || DEFAULT_AUTHORITY
  }

  static setup () {
    log.verbose('ResolverWechaty', 'setup()')
    resolverManager.registerResolver('wechaty', WechatyResolver)
  }

  constructor (
    public target: GrpcUri,
    public listener: resolverManager.ResolverListener,
    public channelOptions: ChannelOptions,
  ) {
    log.verbose('WechatyResolver', 'constructor("%s",)', JSON.stringify(target))
    log.silly('WechatyResolver', 'constructor(,,"%s")', JSON.stringify(channelOptions))

    this.addresses = []
  }

  private reportResolutionError (reason: string) {
    this.listener.onError({
      code: GrpcStatus.UNAVAILABLE,
      details: `Wechaty service discovery / resolution failed for target ${uriToString(
        this.target,
      )}: ${reason}`,
      metadata: new Metadata(),
    })
  }

  async updateResolution (): Promise<void> {
    log.verbose('ResolverWechaty', 'updateResolution()')

    let address

    try {
      address = await new WechatyToken({
        authority : this.target.authority,  // `api.chatie.io` in `wechaty://api.chatie.io/__token__`
        token     : this.target.path,       // `__token__` in `wechaty://api.chatie.io/__token__`
      }).discover()
    } catch (e) {
      log.warn('WechatyResolver', 'updateResolution() wechatyToken.discover() error for target ' + uriToString(this.target) + ' due to error ' + (e as Error).message)
      console.error(e)
      this.reportResolutionError((e as Error).message)
    }

    if (!address || !address.port) {
      log.warn('ResolverWechaty', 'updateResolution() address not found target ' + uriToString(this.target) + ': token does not exist')
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
      {},
    )
  }

  destroy () {
    log.verbose('ResolverWechaty', 'destroy()')
  }

}

export {
  WechatyResolver,
}
