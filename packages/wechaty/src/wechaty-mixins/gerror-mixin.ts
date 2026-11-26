import { log, WechatyEvent }        from 'wechaty-puppet'
import {
  GError,
  type WrapAsync,
  wrapAsyncError,
}                     from 'gerror'

import type { WechatySkeleton }      from '../wechaty/mod.ts'

const gErrorMixin = <MixinBase extends typeof WechatySkeleton> (mixinBase: MixinBase) => {
  log.verbose('WechatyGErrorMixin', 'gErrorMixin(%s)', mixinBase.name)

  abstract class GErrorMixin extends mixinBase {

    constructor (...args: any[]) {
      super(...args)
    }

    /**
     * Wrap promise in sync way (catch error by emitting it)
     *  1. convert a async callback function to be sync function
     *    by catcing any errors and emit them to error event
     *  2. wrap a Promise by catcing any errors and emit them to error event
     */
    wrapAsync: WrapAsync = wrapAsyncError((e: any) => this.emitError(e))

    /**
     * Dispatches a normalized GError event via EventTarget.
     */
    emitError (e: any): void {
      const gerror = e instanceof GError ? e : GError.from(e)
      this.dispatchEvent(new WechatyEvent('error', { detail: gerror }))
    }

  }

  return GErrorMixin
}

type GErrorMixin = ReturnType<typeof gErrorMixin>

type ProtectedPropertyGErrorMixin = never

export type {
  GErrorMixin,
  ProtectedPropertyGErrorMixin,
}
export {
  gErrorMixin,
}
