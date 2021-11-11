import { log }        from 'wechaty-puppet'

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

    constructor (...args: any[]) {
      super(...args)
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

      try {
        await this.puppet.logout()
      } catch (e) {
        this.emit('error', e)
      }
    }

    /**
     * Get the logon / logoff state
     *
     * @returns {boolean}
     * @example
     * if (bot.logonoff()) {
     *   console.log('Bot logged in')
     * } else {
     *   console.log('Bot not logged in')
     * }
     */
    logonoff (): boolean {
      try {
        return this.puppet.logonoff()
      } catch (e) {
        this.emit('error', e)
        // https://github.com/wechaty/wechaty/issues/1878
        return false
      }
    }

    /**
     * Get current user
     *
     * @returns {ContactSelfInterface}
     * @example
     * const contact = bot.currentUser()
     * console.log(`Bot is ${contact.name()}`)
     */
    currentUser (): ContactSelfInterface {
      const userId = this.puppet.currentUserId
      const user = (this.ContactSelf as typeof ContactSelfImpl).load(userId)
      return user
    }

    /**
     * Will be removed after Dec 31, 2022
     * @deprecated use {@link Wechaty#currentUser} instead
     */
    userSelf () {
      log.warn('WechatyLoginMixin', 'userSelf() deprecated: use currentUser() instead.\n%s',
        new Error().stack,
      )
      return this.currentUser()
    }

  }

  return LoginMixin
}

type LoginMixin = ReturnType<typeof loginMixin>

type ProtectedPropertyLoginMixin =
  | 'userSelf'  // deprecated: use `currentUser()` instead. (will be removed after Dec 31, 2022)

export type {
  LoginMixin,
  ProtectedPropertyLoginMixin,
}
export {
  loginMixin,
}
