import { log }        from 'wechaty-puppet'
import { Io } from '../io.js'
import type { WechatyOptions } from '../wechaty-builder.js'

import type { WechatySkeleton }      from '../wechaty/mod.js'
import type { GErrorMixin } from './gerror-mixin.js'

const ioMixin = <MixinBase extends typeof WechatySkeleton & GErrorMixin> (mixinBase: MixinBase) => {
  log.verbose('WechatyIoMixin', 'ioMixin(%s)', mixinBase.name)

  abstract class IoMixin extends mixinBase {

    _io?: Io
    _ioToken?: string

    constructor (...args: any[]) {
      log.verbose('WechatyIoMixin', 'constructor()')
      super(...args)

      const options = args[0] || {} as WechatyOptions
      if (options.ioToken) {
        this._ioToken = options.ioToken
      }
    }

    override async start (): Promise<void> {
      log.verbose('WechatyIoMixin', 'start()')

      await super.start()

      if (!this._ioToken) {
        return
      }

      if (this._io) {
        log.error('WechatyIoMixin', 'start() found existing io instance: stopping...')
        try {
          await this._io.stop()
        } catch (e) {
          this.emitError(e)
        }
        log.error('WechatyIoMixin', 'start() found existing io instance: stopping... done')
        this._io = undefined
      }

      this._io = new Io({
        token   : this._ioToken,
        wechaty : this as any,  // <- FIXME: remove any, Huan(202111)
      })

      try {
        log.verbose('WechatyIoMixin', 'start() starting io ...')
        await this._io.start()
        log.verbose('WechatyIoMixin', 'start() starting io ... done')
      } catch (e) {
        this.emitError(e)
      }
    }

    override async stop (): Promise<void> {
      log.verbose('WechatyIoMixin', 'stop()')

      try {
        if (this._io) {
          const io = this._io
          this._io = undefined

          log.verbose('WechatyIoMixin', 'stop() starting io ...')
          await io.stop()
          log.verbose('WechatyIoMixin', 'stop() starting io ... done')
        }
      } catch (e) {
        this.emitError(e)
      } finally {
        await super.stop()
      }
    }

  }

  return IoMixin
}

type IoMixin = ReturnType<typeof ioMixin>

type ProtectedPropertyIoMixin = never

export type {
  IoMixin,
  ProtectedPropertyIoMixin,
}
export {
  ioMixin,
}
