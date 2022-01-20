import { log }  from 'wechaty-puppet'

import { VERSION }  from '../config.js'

import type { WechatySkeleton }   from '../wechaty/mod.js'

import type { GErrorMixin }       from './gerror-mixin.js'
import type { PuppetMixin }       from './puppet-mixin.js'

const miscMixin = <MixinBase extends typeof WechatySkeleton & PuppetMixin & GErrorMixin> (mixinBase: MixinBase) => {
  log.verbose('WechatyMiscMixin', 'miscMixin(%s)', mixinBase.name)

  abstract class MiscMixin extends mixinBase {

    constructor (...args: any[]) {
      super(...args)
    }

    /**
     * @ignore
     */
    override toString () {
      if (Object.keys(this.__options).length <= 0) {
        return this.constructor.name
      }

      return [
        'Wechaty#',
        this.id,
        `<${(this.__options.puppet) || ''}>`,
        `(${(this.__memory && this.__memory.name) || ''})`,
      ].join('')
    }

    /**
     * Wechaty bot name set by `options.name`
     * default: `wechaty`
     */
    name () {
      return this.__options.name || 'wechaty'
    }

    /**
     * @ignore
     * Return version of Wechaty
     *
     * @returns {string}                  - the version number
     * @example
     * console.log(Wechaty.instance().version())       // return '#git[af39df]'
     * console.log(Wechaty.instance().version(true))   // return '0.7.9'
     */
    version (): string {
      return VERSION
    }

    /**
     * @ignore
     */
    async sleep (milliseconds: number): Promise<void> {
      await new Promise<void>(resolve =>
        setTimeout(resolve, milliseconds),
      )
    }

    /**
     * @private
     */
    ding (data?: string): void {
      log.silly('WechatyMiscMixin', 'ding(%s)', data || '')

      try {
        this.puppet.ding(data)
      } catch (e) {
        this.emitError(e)
      }
    }

  }

  return MiscMixin
}

type MiscMixin = ReturnType<typeof miscMixin>

type ProtectedPropertyMiscMixin = never

export type {
  MiscMixin,
  ProtectedPropertyMiscMixin,
}
export {
  miscMixin,
}
