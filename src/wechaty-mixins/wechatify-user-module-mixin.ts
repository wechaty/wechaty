import { log }          from 'wechaty-puppet'

import {
  ContactImpl,
  ContactSelfImpl,
  FriendshipImpl,
  ImageImpl,
  MessageImpl,
  MiniProgramImpl,
  RoomImpl,
  RoomInvitationImpl,
  DelayImpl,
  TagImpl,
  UrlLinkImpl,
  LocationImpl,

  ContactConstructor,
  ContactSelfConstructor,
  FriendshipConstructor,
  ImageConstructor,
  MessageConstructor,
  MiniProgramConstructor,
  RoomConstructor,
  RoomInvitationConstructor,
  TagConstructor,
  DelayConstructor,
  UrlLinkConstructor,
  LocationConstructor,

  wechatifyUserModule,
}                       from '../user/mod.js'

import type {
  WechatySkelton,
}                             from './wechaty-skelton.js'

const wechatifyUserModuleMixin = <MixinBase extends typeof WechatySkelton> (mixinBase: MixinBase) => {
  log.verbose('WechatifyUserModuleMixin', 'wechatifyUserModuleMixin(%s)', mixinBase.name)

  abstract class WechatifyUserModuleMixin extends mixinBase {

    constructor (...args: any[]) {
      super(...args)
    }

    _wechatifiedContact?        : ContactConstructor
    _wechatifiedContactSelf?    : ContactSelfConstructor
    _wechatifiedFriendship?     : FriendshipConstructor
    _wechatifiedImage?          : ImageConstructor
    _wechatifiedMessage?        : MessageConstructor
    _wechatifiedMiniProgram?    : MiniProgramConstructor
    _wechatifiedRoom?           : RoomConstructor
    _wechatifiedRoomInvitation? : RoomInvitationConstructor
    _wechatifiedDelay?          : DelayConstructor
    _wechatifiedTag?            : TagConstructor
    _wechatifiedUrlLink?        : UrlLinkConstructor
    _wechatifiedLocation?       : LocationConstructor

    get Contact ()        : ContactConstructor        { return guardWechatify(this._wechatifiedContact)        }
    get ContactSelf ()    : ContactSelfConstructor    { return guardWechatify(this._wechatifiedContactSelf)    }
    get Friendship ()     : FriendshipConstructor     { return guardWechatify(this._wechatifiedFriendship)     }
    get Image ()          : ImageConstructor          { return guardWechatify(this._wechatifiedImage)          }
    get Message ()        : MessageConstructor        { return guardWechatify(this._wechatifiedMessage)        }
    get MiniProgram ()    : MiniProgramConstructor    { return guardWechatify(this._wechatifiedMiniProgram)    }
    get Room ()           : RoomConstructor           { return guardWechatify(this._wechatifiedRoom)           }
    get RoomInvitation () : RoomInvitationConstructor { return guardWechatify(this._wechatifiedRoomInvitation) }
    get Delay ()          : DelayConstructor          { return guardWechatify(this._wechatifiedDelay)          }
    get Tag ()            : TagConstructor            { return guardWechatify(this._wechatifiedTag)            }
    get UrlLink ()        : UrlLinkConstructor        { return guardWechatify(this._wechatifiedUrlLink)        }
    get Location ()       : LocationConstructor       { return guardWechatify(this._wechatifiedLocation)       }

    override async start (): Promise<void> {
      log.verbose('WechatifyUserModuleMixin', 'start()')

      await super.start()
      this._wechatifyUserModules()
    }

    _wechatifyUserModules (): void {
      log.verbose('WechatifyUserModuleMixin', '_wechatifyUserModules()')

      /**
       * Skip if already wechatified
       */
      if (this._wechatifiedMessage) {
        log.verbose('WechatifyUserModuleMixin', '_wechatifyUserModules() Wechaty User Module (WUM)s have already wechatified: skip')
        return
      }

      log.verbose('WechatifyUserModuleMixin', '_wechatifyUserModules() initializing Wechaty User Module (WUM) ...')

      /**
       * Wechatify User Classes
       *  1. Binding the wechaty instance to the class
       *
       * Huan(202110): FIXME: remove any
       */
      this._wechatifiedContact        = wechatifyUserModule(ContactImpl)(this as any)
      this._wechatifiedContactSelf    = wechatifyUserModule(ContactSelfImpl)(this as any)
      this._wechatifiedFriendship     = wechatifyUserModule(FriendshipImpl)(this as any)
      this._wechatifiedImage          = wechatifyUserModule(ImageImpl)(this as any)
      this._wechatifiedMessage        = wechatifyUserModule(MessageImpl)(this as any)
      this._wechatifiedMiniProgram    = wechatifyUserModule(MiniProgramImpl)(this as any)
      this._wechatifiedRoom           = wechatifyUserModule(RoomImpl)(this as any)
      this._wechatifiedRoomInvitation = wechatifyUserModule(RoomInvitationImpl)(this as any)
      this._wechatifiedDelay          = wechatifyUserModule(DelayImpl)(this as any)
      this._wechatifiedTag            = wechatifyUserModule(TagImpl)(this as any)
      this._wechatifiedUrlLink        = wechatifyUserModule(UrlLinkImpl)(this as any)
      this._wechatifiedLocation       = wechatifyUserModule(LocationImpl)(this as any)

      log.verbose('WechatifyUserModuleMixin', '_wechatifyUserModules() initializing Wechaty User Module (WUM) ... done')
    }

  }

  return WechatifyUserModuleMixin
}

/**
 * Huan(202008): we will bind the wechaty puppet with user modules (Contact, Room, etc) together inside the start() method
 */
function guardWechatify<T extends Function> (userModule?: T): T {
  if (userModule) {
    return userModule
  }
  throw new Error('Wechaty User Module (WUM, for example: wechaty.Room) can not be used before wechaty.start()!')
}

type WechatifyUserModuleMixin = ReturnType<typeof wechatifyUserModuleMixin>

export type {
  WechatifyUserModuleMixin,
}
export {
  wechatifyUserModuleMixin,
}
