import { log }          from 'wechaty-puppet'

import {
  ContactImpl,
  ContactSelfImpl,
  DelayImpl,
  FriendshipImpl,
  ImageImpl,
  LocationImpl,
  MessageImpl,
  MiniProgramImpl,
  PostImpl,
  RoomImpl,
  RoomInvitationImpl,
  TagImpl,
  UrlLinkImpl,

  ContactConstructor,
  ContactSelfConstructor,
  DelayConstructor,
  FriendshipConstructor,
  ImageConstructor,
  LocationConstructor,
  MessageConstructor,
  MiniProgramConstructor,
  PostConstructor,
  RoomConstructor,
  RoomInvitationConstructor,
  TagConstructor,
  UrlLinkConstructor,

  wechatifyUserModule,
}                       from '../user-modules/mod.js'

import type {
  WechatySkeleton,
}                             from '../wechaty/mod.js'

const wechatifyUserModuleMixin = <MixinBase extends typeof WechatySkeleton> (mixinBase: MixinBase) => {
  log.verbose('WechatifyUserModuleMixin', 'wechatifyUserModuleMixin(%s)', mixinBase.name)

  abstract class WechatifyUserModuleMixin extends mixinBase {

    constructor (...args: any[]) {
      log.verbose('WechatifyUserModuleMixin', 'constructor()')
      super(...args)
    }

    __wechatifiedContact?        : ContactConstructor
    __wechatifiedContactSelf?    : ContactSelfConstructor
    __wechatifiedDelay?          : DelayConstructor
    __wechatifiedFriendship?     : FriendshipConstructor
    __wechatifiedImage?          : ImageConstructor
    __wechatifiedLocation?       : LocationConstructor
    __wechatifiedMessage?        : MessageConstructor
    __wechatifiedMiniProgram?    : MiniProgramConstructor
    __wechatifiedPost?           : PostConstructor
    __wechatifiedRoom?           : RoomConstructor
    __wechatifiedRoomInvitation? : RoomInvitationConstructor
    __wechatifiedTag?            : TagConstructor
    __wechatifiedUrlLink?        : UrlLinkConstructor

    get Contact ()        : ContactConstructor        { return guardWechatify(this.__wechatifiedContact)        }
    get ContactSelf ()    : ContactSelfConstructor    { return guardWechatify(this.__wechatifiedContactSelf)    }
    get Delay ()          : DelayConstructor          { return guardWechatify(this.__wechatifiedDelay)          }
    get Friendship ()     : FriendshipConstructor     { return guardWechatify(this.__wechatifiedFriendship)     }
    get Image ()          : ImageConstructor          { return guardWechatify(this.__wechatifiedImage)          }
    get Location ()       : LocationConstructor       { return guardWechatify(this.__wechatifiedLocation)       }
    get Message ()        : MessageConstructor        { return guardWechatify(this.__wechatifiedMessage)        }
    get MiniProgram ()    : MiniProgramConstructor    { return guardWechatify(this.__wechatifiedMiniProgram)    }
    get Post ()           : PostConstructor           { return guardWechatify(this.__wechatifiedPost)           }
    get Room ()           : RoomConstructor           { return guardWechatify(this.__wechatifiedRoom)           }
    get RoomInvitation () : RoomInvitationConstructor { return guardWechatify(this.__wechatifiedRoomInvitation) }
    get Tag ()            : TagConstructor            { return guardWechatify(this.__wechatifiedTag)            }
    get UrlLink ()        : UrlLinkConstructor        { return guardWechatify(this.__wechatifiedUrlLink)        }

    override async init (): Promise<void> {
      log.verbose('WechatifyUserModuleMixin', 'init()')
      await super.init()

      /**
       * Skip if already wechatified
       */
      if (this.__wechatifiedMessage) {
        log.verbose('WechatifyUserModuleMixin', 'init() Wechaty User Module (WUM)s have already wechatified: skip')
        return
      }

      log.verbose('WechatifyUserModuleMixin', 'init() initializing Wechaty User Module (WUM) ...')

      /**
       * Wechatify User Classes
       *  1. Binding the wechaty instance to the class
       *
       * Huan(202110): FIXME: remove any
       */
      this.__wechatifiedContact        = wechatifyUserModule(ContactImpl)(this as any)
      this.__wechatifiedContactSelf    = wechatifyUserModule(ContactSelfImpl)(this as any)
      this.__wechatifiedDelay          = wechatifyUserModule(DelayImpl)(this as any)
      this.__wechatifiedFriendship     = wechatifyUserModule(FriendshipImpl)(this as any)
      this.__wechatifiedImage          = wechatifyUserModule(ImageImpl)(this as any)
      this.__wechatifiedLocation       = wechatifyUserModule(LocationImpl)(this as any)
      this.__wechatifiedMessage        = wechatifyUserModule(MessageImpl)(this as any)
      this.__wechatifiedMiniProgram    = wechatifyUserModule(MiniProgramImpl)(this as any)
      this.__wechatifiedPost           = wechatifyUserModule(PostImpl)(this as any)
      this.__wechatifiedRoom           = wechatifyUserModule(RoomImpl)(this as any)
      this.__wechatifiedRoomInvitation = wechatifyUserModule(RoomInvitationImpl)(this as any)
      this.__wechatifiedTag            = wechatifyUserModule(TagImpl)(this as any)
      this.__wechatifiedUrlLink        = wechatifyUserModule(UrlLinkImpl)(this as any)

      log.verbose('WechatifyUserModuleMixin', 'init() initializing Wechaty User Module (WUM) ... done')
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

type ProtectedPropertyWechatifyUserModuleMixin =
  | '__wechatifiedContact'
  | '__wechatifiedContactSelf'
  | '__wechatifiedDelay'
  | '__wechatifiedFriendship'
  | '__wechatifiedImage'
  | '__wechatifiedLocation'
  | '__wechatifiedMessage'
  | '__wechatifiedMiniProgram'
  | '__wechatifiedRoom'
  | '__wechatifiedRoomInvitation'
  | '__wechatifiedTag'
  | '__wechatifiedUrlLink'

export type {
  WechatifyUserModuleMixin,
  ProtectedPropertyWechatifyUserModuleMixin,
}
export {
  wechatifyUserModuleMixin,
}
