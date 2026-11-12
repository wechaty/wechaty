/**
 * Optional `Io` child lifecycle adapter for `Wechaty`.
 *
 * Exposes explicit `__startIo` / `__stopIo` operations so `WechatyBase` can
 * acquire `Io` *after* `Puppet` starts and dispose `Io` *before* `Puppet` stops
 * via `ResourceScope`, while retaining standalone `start()`/`stop()` delegation
 * for isolated mixin composition tests.
 */
import { log }                 from 'wechaty-puppet'
import { Io }                  from '../io.ts'
import type { ResourceScope }  from '../lifecycle/mod.ts'
import type { WechatyOptions } from '../wechaty-builder.ts'

import type { WechatySkeleton } from '../wechaty/mod.ts'
import type { GErrorMixin }     from './gerror-mixin.ts'

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

    async __acquireIo (scope: ResourceScope): Promise<void> {
      if (!this.__ioToken) {
        return
      }
      await scope.acquire({
        create: ({ signal }) => this.__startIo(signal),
        dispose: () => this.__stopIo(),
        name: 'io',
      })
    }

    async __startIo (signal?: AbortSignal): Promise<void> {
      if (!this.__ioToken) {
        return
      }

      if (this.__io) {
        log.error('WechatyIoMixin', '__startIo() found existing io instance: stopping...')
        await this.__stopIo()
      }

      const io = new Io({
        token   : this.__ioToken,
        wechaty : this as any,
      })
      this.__io = io

      try {
        log.verbose('WechatyIoMixin', '__startIo() starting io ...')
        await io.start({ signal })
        log.verbose('WechatyIoMixin', '__startIo() starting io ... done')
      } catch (e) {
        this.__io = undefined
        throw e
      }
    }

    async __stopIo (): Promise<void> {
      if (!this.__io) {
        return
      }

      const io = this.__io
      this.__io = undefined

      log.verbose('WechatyIoMixin', '__stopIo() stopping io ...')
      await io.stop()
      log.verbose('WechatyIoMixin', '__stopIo() stopping io ... done')
    }

    override async start (): Promise<void> {
      log.verbose('WechatyIoMixin', 'start()')
      await super.start()
      await this.__startIo()
    }

    override async stop (): Promise<void> {
      log.verbose('WechatyIoMixin', 'stop()')
      try {
        await this.__stopIo()
      } finally {
        await super.stop()
      }
    }

  }

  return IoMixin
}

type IoMixin = ReturnType<typeof ioMixin>

type ProtectedPropertyIoMixin =
  | '__acquireIo'
  | '__io'
  | '__ioToken'
  | '__startIo'
  | '__stopIo'
  | 'io'

export type {
  IoMixin,
  ProtectedPropertyIoMixin,
}
export {
  ioMixin,
}
