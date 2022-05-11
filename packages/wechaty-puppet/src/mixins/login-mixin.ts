import {
  log,
}           from '../config.js'

import type { PuppetScanListener }  from '../puppet/events.js'
import type { PuppetSkeleton }      from '../puppet/puppet-skeleton.js'
import { ScanStatus }               from '../schemas/event.js'

const loginMixin = <MixinBase extends typeof PuppetSkeleton>(mixinBase: MixinBase) => {

  abstract class LoginMixin extends mixinBase {

    /**
     * @internal used by public API `currentUserId`
     */
    __currentUserId?: string

    /**
     * The current logged in user id.
     */
    get currentUserId (): string {
      log.silly('PuppetLoginMixin', 'get currentUserId()')

      if (!this.__currentUserId) {
        throw new Error('not logged in, no this.__currentUserId yet.')
      }

      return this.__currentUserId
    }

    /**
     * Boolean value indicates whether the user is logged in or not.
     */
    get isLoggedIn (): boolean {
      return !!this.__currentUserId
    }

    __authQrCode?: string
    get authQrCode (): undefined | string {
      return this.__authQrCode
    }

    constructor (...args: any[]) {
      super(...args)
      log.verbose('PuppetLoginMixin', 'constructor()')
    }

    override async start (): Promise<void> {
      log.verbose('PuppetLoginMixin', 'start()')

      const cleanAuthQrCode = () => {
        this.__authQrCode = undefined
      }

      const onScan: PuppetScanListener = ({ qrcode, status }) => {
        switch (status) {
          case ScanStatus.Cancel:
          case ScanStatus.Confirmed:
          case ScanStatus.Scanned:
            cleanAuthQrCode()
            break

          case ScanStatus.Timeout:  // TODO: confirm the `Timeout` spec (define it if it is not defined)
          case ScanStatus.Waiting:
            this.__authQrCode = qrcode
            break

          case ScanStatus.Unknown:
          default:
            break
        }
      }

      this.addListener('scan',  onScan)
      this.addListener('login', cleanAuthQrCode)
      this.addListener('stop',  cleanAuthQrCode)

      await super.start()
    }

    /**
     * ref: https://github.com/wechaty/puppet/issues/184
     */
    override async stop (): Promise<void> {
      log.verbose('PuppetLoginMixin', 'stop()')
      // await this.logout()
      if (this.isLoggedIn) {
        this.emit('logout', {
          contactId: this.currentUserId,
          data: 'puppet stop()',
        })
      }

      await super.stop()
    }

    /**
     * Need to be called internally when the puppet is logined.
     * this method will emit a `login` event
     * @internal for puppet internal usage
     */
    login (userId: string): void {
      log.verbose('PuppetLoginMixin', 'login(%s)', userId)

      if (this.__currentUserId) {
        throw new Error('must logout first before login again!')
      }
      this.__currentUserId = userId

      this.emit('login', { contactId: userId })
    }

    /**
     * Need to be called internally/externally when the puppet need to be logouted
     * this method will emit a `logout` event,
     *
     * Note: must set `this.currentUserId = undefined` in this function.
     */
    async logout (reason = 'logout()'): Promise<void> {
      log.verbose('PuppetLoginMixin', 'logout(%s)', reason)

      if (!this.isLoggedIn) {
        log.verbose('PuppetLoginMixin', 'logout() isLoggedIn === false, do nothing')
        return
      }

      this.emit('logout', {
        contactId : this.currentUserId,
        data      : reason,
      })

      /**
       * Huan(202111): We postpone the `this._currentUserId = undefined` to here,
       *  in case of the `logout` event listener need to check the `this.currentUserId`
       */
      await new Promise<void>(resolve => setImmediate(() => {
        this.__currentUserId = undefined
        resolve()
      }))
    }

    /**
     * @deprecated use `currentUserId` instead. (will be removed in v2.0)
     */
    selfId (): string {
      log.warn('PuppetLoginMixin',
        'selfId() is deprecated, use `currentUserId` instead:\n%s',
        new Error().stack,
      )
      return this.currentUserId
    }

    /**
     * @deprecated use isLoggedIn instead. will be removed in v2.0
     */
    logonoff (): boolean {
      log.warn('PuppetLoginMixin',
        'logonoff() is deprecated, use `isLoggedIn` instead:\n%s',
        new Error().stack,
      )
      return this.isLoggedIn
    }

  }

  return LoginMixin
}

type LoginMixin = ReturnType<typeof loginMixin>

type ProtectedPropertyLoginMixin =
  | '__authQrCode'
  | '__currentUserId'
  | 'login'
  | 'logonoff'

export type {
  LoginMixin,
  ProtectedPropertyLoginMixin,
}
export { loginMixin }
