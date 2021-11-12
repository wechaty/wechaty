import { log } from 'wechaty-puppet'
import type { WechatyConstructor } from '../interface/wechaty-interface.js'
import type { WechatySkelton } from './wechaty-skelton.js'

import type {
  WechatyMiddleWareDong,
  WechatyMiddleWareError,
  WechatyMiddleWareFriendship,
  WechatyMiddleWareHeartbeat,
  WechatyMiddleWareLogin,
  WechatyMiddleWareLogout,
  WechatyMiddleWareMessage,
  WechatyMiddleWarePuppet,
  WechatyMiddleWareReady,
  WechatyMiddleWareRoomInvite,
  WechatyMiddleWareRoomJoin,
  WechatyMiddleWareRoomLeave,
  WechatyMiddleWareRoomTopic,
  WechatyMiddleWares,
  WechatyMiddleWareScan,
  WechatyMiddleWareStartStop,
} from '../middlewares/wechaty-middlewares.js'

type TOrArrayT<T> = T | T[]

interface WechatyGlobalMiddleWares {
  'room-invite'? : TOrArrayT<WechatyMiddleWareRoomInvite>
  'room-join'?   : TOrArrayT<WechatyMiddleWareRoomJoin>
  'room-leave'?  : TOrArrayT<WechatyMiddleWareRoomLeave>
  'room-topic'?  : TOrArrayT<WechatyMiddleWareRoomTopic>
  dong?          : TOrArrayT<WechatyMiddleWareDong>
  error?         : TOrArrayT<WechatyMiddleWareError>
  friendship?    : TOrArrayT<WechatyMiddleWareFriendship>
  heartbeat?     : TOrArrayT<WechatyMiddleWareHeartbeat>
  login?         : TOrArrayT<WechatyMiddleWareLogin>
  logout?        : TOrArrayT<WechatyMiddleWareLogout>
  message?       : TOrArrayT<WechatyMiddleWareMessage>
  puppet?        : TOrArrayT<WechatyMiddleWarePuppet>
  ready?         : TOrArrayT<WechatyMiddleWareReady>
  scan?          : TOrArrayT<WechatyMiddleWareScan>
  start?         : TOrArrayT<WechatyMiddleWareStartStop>
  stop?          : TOrArrayT<WechatyMiddleWareStartStop>
}

const middleWareMixin = <MixinBase extends typeof WechatySkelton> (mixinBase: MixinBase) => {
  log.verbose('WechatyMiddleWareMixin', 'middlewareMixin(%s)', mixinBase.name)

  abstract class MiddleWareMixin extends mixinBase {

    static _globalMiddleWares: WechatyGlobalMiddleWares = {}

    /**
     * @param   {WechatyGlobalMiddleWare[]} middlewares      - The global middlewares you want to use
     *
     * @return  {WechatyInterface}                           - this for chaining,
     *
     * @desc
     * For wechaty ecosystem, allow user to define a 3rd party middleware for the all wechaty instances
     *
     * @example
     *
     * // Random catch all chat message.
     *
     * function RandomMessageMiddleWare(options: { rate: number}) {
     *   return function (this: Wechaty, message: Message, next: async () => void | Promise<void>) {
     *     if (Math.random() > options.rate) {
     *       await next();
     *     }
     *   }
     * }
     *
     * wechaty.middleware({
     *   message: RandomMessageMiddleWare({ rate: 0.5 }),
     * })
     *
     * bot.on('message', async (message: Message) => {
     *   await message.say('Bingo');
     * })
     */

    // TODO: I prefer `use` for middlewares, and `install` for plugins. But it's an incompatible API change. so that we can use middleware instead.
    static middleware (
      middleware: WechatyGlobalMiddleWares | WechatyMiddleWares[keyof WechatyMiddleWares],
    ): WechatyConstructor {
      if (typeof middleware === 'function') {
        middleware = middleware as WechatyMiddleWares[keyof WechatyMiddleWares]
        if (!middleware.eventType) {
          throw new Error('middleware eventType is not defined')
        }
        this._globalMiddleWares[middleware.eventType] = middleware
      } else {
        Object.keys(middleware).forEach(item => {
          this._globalMiddleWares[item] = middleware[item]
        })
      }
      // Huan(202110): TODO: remove any
      return this as any
    }

  }

  return MiddleWareMixin
}

type MiddleWareMixin = ReturnType<typeof middleWareMixin>

export type {
  WechatyGlobalMiddleWares,
  MiddleWareMixin,
}
export {
  middleWareMixin,
}
