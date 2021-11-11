import { log }        from 'wechaty-puppet'
import {
  GError,
  WrapAsync,
  wrapAsyncError,
}                     from 'gerror'

import { wechatyCaptureException }  from '../raven.js'

import type { WechatySkeleton }      from '../wechaty/mod.js'

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
    wrapAsync: WrapAsync = wrapAsyncError((e: any) => this.emit('error', e))

    /**
     * Wechaty internally can use `emit('error' whatever)` to emit any error
     * But the external call can only emit GError.
     * That's the reason why we need the below `emitError(e: any)
     */
    emitError (e: any): void {
      this.emit('error', e)
    }

    /**
     * Convert any error to GError,
     *  and emit `error` event with GError
     */
    override emit (event: any, ...args: any) {
      if (event !== 'error') {
        return super.emit(event, ...args)
      }

      /**
       * Dealing with the `error` event
       */
      const arg0 = args[0]
      let gerror: GError

      if (arg0 instanceof GError) {
        gerror = arg0
      } else {
        gerror = GError.from(arg0)
      }

      wechatyCaptureException(gerror)
      return super.emit('error', gerror)
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
