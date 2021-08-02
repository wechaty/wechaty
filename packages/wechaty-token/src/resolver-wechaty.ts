import {
  log,
  DEFAULT_AUTHORITY,
}                     from './config'

import {
  GrpcStatus,
  ChannelOptions,
  Metadata,
  GrpcUri,
  uriToString,
  TcpSubchannelAddress,
  resolverManager,
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

  updateResolution (): void {
    log.verbose('ResolverWechaty', 'updateResolution()')

    this.wechatyToken.discover(this.target.path).then(address => {
      if (address.port) {
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

      } else {
        log.warn('ResolverWechaty', 'updateResolution() Resolution error for target ' + uriToString(this.target) + ': token does not exist')
        this.reportResolutionError(`token "${this.target.path}" does not exist`)
      }

      return undefined  // Huan(202108): make linter happy

    }).catch(e => {
      log.warn('WechatyResolver', 'updateResolution() Resolution error for target ' + uriToString(this.target) + ' due to error ' + e.message)
      console.error(e)
      this.reportResolutionError(e.message)
    })

  }

  destroy () {
    log.verbose('ResolverWechaty', 'destroy()')
  }

}

export {
  WechatyResolver,
}
