/**
 * `WechatyResolver`: a gRPC name resolver for `wechaty://<authority>/<token>`
 * targets. `WechatyResolver.setup()` registers it with `@grpc/grpc-js`, after
 * which a gRPC channel to `wechaty:///<token>` asks `WechatyToken.discover()`
 * for the puppet service address.
 *
 * It uses only `@grpc/grpc-js`'s public `experimental` resolver API (1.14 and
 * later: a listener function that receives `StatusOr` endpoints). grpc-js is a
 * peer dependency because the resolver must register with the same grpc-js
 * instance that creates the channel.
 */
import {
  experimental,
  Metadata,
  status as GrpcStatus,
  type ChannelOptions,
}                       from '@grpc/grpc-js'

import {
  log,
  DEFAULT_AUTHORITY,
}                     from './config.ts'

import { WechatyToken } from './wechaty-token.ts'

class WechatyResolver implements experimental.Resolver {

  /**
   * The authority a channel reports for a target: its own, or
   * `api.chatie.io` when the target names none (`wechaty:///<token>`).
   */
  static getDefaultAuthority (target: experimental.GrpcUri): string {
    log.verbose('ResolverWechaty', 'getDefaultAuthority(%s)', JSON.stringify(target))
    return target.authority || DEFAULT_AUTHORITY
  }

  /**
   * Registers this resolver for the `wechaty` scheme. Safe to call more than
   * once: grpc-js keeps the latest registration.
   */
  static setup (): void {
    log.verbose('ResolverWechaty', 'setup()')
    experimental.registerResolver('wechaty', WechatyResolver)
  }

  readonly target: experimental.GrpcUri
  readonly listener: experimental.ResolverListener
  readonly channelOptions: ChannelOptions

  constructor (
    target: experimental.GrpcUri,
    listener: experimental.ResolverListener,
    channelOptions: ChannelOptions,
  ) {
    log.verbose('WechatyResolver', 'constructor("%s",)', JSON.stringify(target))
    log.silly('WechatyResolver', 'constructor(,,"%s")', JSON.stringify(channelOptions))
    this.target = target
    this.listener = listener
    this.channelOptions = channelOptions
  }

  /**
   * Reports the outcome to the listener on a later tick: grpc-js requires that
   * listener calls never happen synchronously with `updateResolution()`.
   */
  private report (endpoints: experimental.StatusOr<experimental.Endpoint[]>): void {
    process.nextTick(() => this.listener(endpoints, {}, null, ''))
  }

  private reportResolutionError (reason: string): void {
    this.report(experimental.statusOrFromError({
      code: GrpcStatus.UNAVAILABLE,
      details: `Wechaty service discovery / resolution failed for target ${experimental.uriToString(
        this.target,
      )}: ${reason}`,
      metadata: new Metadata(),
    }))
  }

  /**
   * Discovers the address of the target's token and reports it as a single
   * endpoint, or reports `UNAVAILABLE` when discovery fails or the token does
   * not exist. Exactly one report per call.
   */
  async updateResolution (): Promise<void> {
    log.verbose('ResolverWechaty', 'updateResolution()')

    let address

    try {
      address = await new WechatyToken({
        authority : this.target.authority,  // `api.chatie.io` in `wechaty://api.chatie.io/__token__`
        token     : this.target.path,       // `__token__` in `wechaty://api.chatie.io/__token__`
      }).discover()
    } catch (e) {
      log.warn('WechatyResolver', 'updateResolution() wechatyToken.discover() error for target ' + experimental.uriToString(this.target) + ' due to error ' + (e as Error).message)
      this.reportResolutionError((e as Error).message)
      return
    }

    if (!address || !address.port) {
      log.warn('ResolverWechaty', 'updateResolution() address not found target ' + experimental.uriToString(this.target) + ': token does not exist')
      this.reportResolutionError(`token "${this.target.path}" does not exist`)
      return
    }

    this.report(experimental.statusOrFromValue([ { addresses: [ address ] } ]))
  }

  destroy (): void {
    log.verbose('ResolverWechaty', 'destroy()')
  }

}

export {
  WechatyResolver,
}
