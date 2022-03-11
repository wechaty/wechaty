import { log }      from 'wechaty-puppet'

import type {
  ContactSelfImpl,
  ContactSelfInterface,
}                               from '../user-modules/mod.js'
import type { WechatySkeleton } from '../wechaty/mod.js'

import type { GErrorMixin }     from './gerror-mixin.js'
import type { PuppetMixin }     from './puppet-mixin.js'

const loginMixin = <MixinBase extends typeof WechatySkeleton & PuppetMixin & GErrorMixin> (mixinBase: MixinBase) => {
  log.verbose('WechatyLoginMixin', 'loginMixin(%s)', mixinBase.name)

  abstract class LoginMixin extends mixinBase {

    get authQrCode (): undefined | string {
      return this.puppet.authQrCode
    }

    /**
     * The current user
     *
     * @returns {ContactSelfInterface}
     * @example
     * const contact = bot.currentUser
     * console.log(`Bot is ${contact.name()}`)
     */
    get currentUser (): ContactSelfInterface {
      return (this.ContactSelf as typeof ContactSelfImpl)
        .load(this.puppet.currentUserId)
    }

    /**
     * Get the logon / logoff state
     *
     * @returns {boolean}
     * @example
     * if (bot.isLoggedin) {
     *   console.log('Bot logged in')
     * } else {
     *   console.log('Bot not logged in')
     * }
     */
    get isLoggedIn (): boolean {
      try {
        // the `this.puppet` might not be initialized yet
        return this.puppet.isLoggedIn
      } catch (e) {
        this.emit('error', e)

        log.warn('WechatyLoginMixin', 'get isLoggedIn puppet instance is not ready yet')
        // https://github.com/wechaty/wechaty/issues/1878
        return false
      }
    }

    __loginMixinInited = false

    constructor (...args: any[]) {
      log.verbose('WechatyLoginMixin', 'constructor()')
      super(...args)
    }

    override async init (): Promise<void> {
      log.verbose('WechatyLoginMixin', 'init()')
      await super.init()

      if (this.__loginMixinInited) {
        return
      }
      this.__loginMixinInited = true
    }

    /**
     * Logout the bot
     *
     * @returns {Promise<void>}
     * @example
     * await bot.logout()
     */
    async logout (): Promise<void>  {
      log.verbose('WechatyLoginMixin', 'logout()')
      await this.puppet.logout()
    }

    /**
     * @deprecated: use `isLoggedIn` property instead. will be removed after Dec 31, 2022
     */
    logonoff (): boolean {
      log.warn('WechatyLoginMixin', 'logonoff() is deprecated: use `isLoggedIn` property instead.\n%s', new Error().stack)
      return this.isLoggedIn
    }

    /**
     * Will be removed after Dec 31, 2022
     * @deprecated use {@link Wechaty#currentUser} instead
     */
    userSelf () {
      log.warn('WechatyLoginMixin', 'userSelf() deprecated: use currentUser instead.\n%s',
        new Error().stack,
      )
      return this.currentUser
    }

  }

  return LoginMixin
}

type LoginMixin = ReturnType<typeof loginMixin>

type ProtectedPropertyLoginMixin =
  | 'userSelf'  // deprecated: use `currentUser` instead. (will be removed after Dec 31, 2022)
  | 'logonoff'  // deprecated: use `isLoggedIn` instead. ((will be removed after Dec 31, 2022)
  | '__loginMixinInited'

export type {
  LoginMixin,
  ProtectedPropertyLoginMixin,
}
export {
  loginMixin,
}
