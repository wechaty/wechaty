import {
  log,
}           from '../config.js'
import type { EventLoginPayload } from '../mod.js'

import type { PuppetSkelton } from '../puppet/skelton.js'

const loginMixin = <MixinBase extends typeof PuppetSkelton>(mixinBase: MixinBase) => {

  abstract class LoginMixin extends mixinBase {

    /**
     * @internal used by public API `currentUserId()`
     */
    _currentUserId?: string

    constructor (...args: any[]) {
      super(...args)
      log.verbose('PuppetLoginMixin', 'constructor()')
    }

    override async start (): Promise<void> {
      log.verbose('PuppetLoginMixin', 'start()')
      await super.start()
      this._currentUserId = undefined
    }

    override async stop (): Promise<void> {
      log.verbose('PuppetLoginMixin', 'stop()')
      await this.logout()
      await super.stop()
    }

    /**
     * Need to be called internally when the puppet is logined.
     * this method will emit a `login` event
     * @internal for puppet internal usage
     */
    async login (userId: string): Promise<void> {
      log.verbose('PuppetLoginMixin', 'login(%s)', userId)

      if (this._currentUserId) {
        throw new Error('must logout first before login again!')
      }
      this._currentUserId = userId

      const payload: EventLoginPayload = {
        contactId: userId,
      }

      const future = new Promise(resolve => this.once('login', resolve))

      this.emit('login', payload)
      log.verbose('PuppetLoginMixin', 'login() event "login" has been emitted')

      await future
      // wait all existing tasks from event loop
      await new Promise(setImmediate)

      log.verbose('PuppetLoginMixin', 'login() event "login" listeners have all executed (hopefully)')
    }

    /**
     * Need to be called internally/externally when the puppet need to be logouted
     * this method will emit a `logout` event,
     *
     * Note: must set `this.currentUserId = undefined` in this function.
     */
    async logout (reason = 'logout()'): Promise<void> {
      log.verbose('PuppetLoginMixin', 'logout(%s)', this.currentUserId)

      if (!this._currentUserId) {
        log.verbose('PuppetLoginMixin', 'logout() no currentUserId, do nothing')
        return
      }

      const future = new Promise(resolve => this.once('logout', resolve))

      this.emit('logout', {
        contactId : this._currentUserId,
        data      : reason,
      })
      log.verbose('PuppetLoginMixin', 'logout() event "logout" has been emitted')

      await future
      // wait all existing tasks from event loop
      await new Promise(setImmediate)

      log.verbose('PuppetLoginMixin', 'logout() event "logout" listeners all executed (hopefully)')
      this._currentUserId = undefined
    }

    currentUserId (): string {
      log.verbose('PuppetLoginMixin', 'currentUserId()')

      if (!this._currentUserId) {
        throw new Error('not logged in, no this.currentUserId yet.')
      }

      return this._currentUserId
    }

    /**
     * @deprecated use `currentUserId()` instead. (will be removed after Dec 31, 2022)
     */
    selfId (): string {
      log.warn('PuppetLoginMixin',
        'selfId() is deprecated, use `currentUserId()` instead:\n%s',
        new Error().stack,
      )
      return this.currentUserId()
    }

    logonoff (): boolean {
      if (this._currentUserId) {
        return true
      } else {
        return false
      }
    }

  }

  return LoginMixin
}

type LoginMixin = ReturnType<typeof loginMixin>

type ProtectedPropertyLoginMixin = never
  | 'login'
  | '_currentUserId'

export type {
  LoginMixin,
  ProtectedPropertyLoginMixin,
}
export { loginMixin }
