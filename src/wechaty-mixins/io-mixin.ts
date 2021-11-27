import { log }        from 'wechaty-puppet'
import { Io } from '../io.js'
import type { WechatyOptions } from '../wechaty-builder.js'

import type { WechatySkeleton }      from '../wechaty/mod.js'
import type { GErrorMixin } from './gerror-mixin.js'

/**
 * Huan(202111): we should not include the IO logic internally
 *
 * TODO: remove all IO related logics from Wechaty internal
 */
const ioMixin = <MixinBase extends typeof WechatySkeleton & GErrorMixin> (mixinBase: MixinBase) => {
  log.verbose('WechatyIoMixin', 'ioMixin(%s)', mixinBase.name)

  abstract class IoMixin extends mixinBase {

    __io?: Io
    get io (): Io {
      if (!this.__io) {
        throw new Error('NO IO')
      }
      return this.__io
    }

    __ioToken?: string

    constructor (...args: any[]) {
      log.verbose('WechatyIoMixin', 'constructor()')
      super(...args)

      const options = args[0] || {} as WechatyOptions
      if (options.ioToken) {
        this.__ioToken = options.ioToken
      }
    }

    override async start (): Promise<void> {
      log.verbose('WechatyIoMixin', 'start()')

      await super.start()

      if (!this.__ioToken) {
        return
      }

      /**
       * Clean the memory leak-ed io (?)
       */
      if (this.__io) {
        log.error('WechatyIoMixin', 'start() found existing io instance: stopping...')
        try {
          await this.__io.stop()
        } catch (e) {
          this.emitError(e)
        }
        log.error('WechatyIoMixin', 'start() found existing io instance: stopping... done')
        this.__io = undefined
      }

      /**
       * Initialize IO instance
       */
      this.__io = new Io({
        token   : this.__ioToken,
        wechaty : this as any,  // <- FIXME: remove any, Huan(202111)
      })

      log.verbose('WechatyIoMixin', 'start() starting io ...')
      await this.__io.start()
      log.verbose('WechatyIoMixin', 'start() starting io ... done')
    }

    override async stop (): Promise<void> {
      log.verbose('WechatyIoMixin', 'stop()')

      try {
        if (!this.__io) {
          return
        }

        const io = this.__io
        this.__io = undefined

        try {
          log.verbose('WechatyIoMixin', 'stop() starting io ...')
          await io.stop()
          log.verbose('WechatyIoMixin', 'stop() starting io ... done')
        } catch (e) {
          this.emitError(e)
        }

      } finally {
        await super.stop()
      }

    }

  }

  return IoMixin
}

type IoMixin = ReturnType<typeof ioMixin>

type ProtectedPropertyIoMixin =
  | '__io'
  | '__ioToken'
  | 'io'

export type {
  IoMixin,
  ProtectedPropertyIoMixin,
}
export {
  ioMixin,
}
