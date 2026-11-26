/**
 * Wechaty Chatbot SDK - https://github.com/wechaty/wechaty
 *
 * @copyright 2016 Huan LI (李卓桓) <https://github.com/huan>, and
 *                   Wechaty Contributors <https://github.com/wechaty>.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Manages the binding of the Wechaty bot instance to user-facing entity constructors.
 *
 * Why this module exists:
 * Encapsulates the dynamic injection of the Wechaty bot instance into user-module
 * constructors (`Contact`, `Room`, `Message`, etc.) via `wechatifyUserModule`,
 * avoiding circular prototype inheritance and eliminating mixin state leaks.
 *
 * Architectural boundaries:
 * Owned by `Wechaty`. Internal to `packages/wechaty/src/components/`.
 */
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
  wechatifyUserModule,
  type ContactConstructor,
  type ContactSelfConstructor,
  type DelayConstructor,
  type FriendshipConstructor,
  type ImageConstructor,
  type LocationConstructor,
  type MessageConstructor,
  type MiniProgramConstructor,
  type PostConstructor,
  type RoomConstructor,
  type RoomInvitationConstructor,
  type TagConstructor,
  type UrlLinkConstructor,
} from '../user-modules/mod.ts'
import type { Wechaty } from '../wechaty/wechaty.ts'

export class UserModuleManager {

  readonly #wechaty: Wechaty

  #Contact?: ContactConstructor
  #ContactSelf?: ContactSelfConstructor
  #Delay?: DelayConstructor
  #Friendship?: FriendshipConstructor
  #Image?: ImageConstructor
  #Location?: LocationConstructor
  #Message?: MessageConstructor
  #MiniProgram?: MiniProgramConstructor
  #Post?: PostConstructor
  #Room?: RoomConstructor
  #RoomInvitation?: RoomInvitationConstructor
  #Tag?: TagConstructor
  #UrlLink?: UrlLinkConstructor

  constructor (wechaty: Wechaty) {
    this.#wechaty = wechaty
  }

  get Contact (): ContactConstructor {
    return this.#Contact ??= wechatifyUserModule(ContactImpl)(this.#wechaty)
  }

  get ContactSelf (): ContactSelfConstructor {
    return this.#ContactSelf ??= wechatifyUserModule(ContactSelfImpl)(this.#wechaty)
  }

  get Delay (): DelayConstructor {
    return this.#Delay ??= wechatifyUserModule(DelayImpl)(this.#wechaty)
  }

  get Friendship (): FriendshipConstructor {
    return this.#Friendship ??= wechatifyUserModule(FriendshipImpl)(this.#wechaty)
  }

  get Image (): ImageConstructor {
    return this.#Image ??= wechatifyUserModule(ImageImpl)(this.#wechaty)
  }

  get Location (): LocationConstructor {
    return this.#Location ??= wechatifyUserModule(LocationImpl)(this.#wechaty)
  }

  get Message (): MessageConstructor {
    return this.#Message ??= wechatifyUserModule(MessageImpl)(this.#wechaty)
  }

  get MiniProgram (): MiniProgramConstructor {
    return this.#MiniProgram ??= wechatifyUserModule(MiniProgramImpl)(this.#wechaty)
  }

  get Post (): PostConstructor {
    return this.#Post ??= wechatifyUserModule(PostImpl)(this.#wechaty)
  }

  get Room (): RoomConstructor {
    return this.#Room ??= wechatifyUserModule(RoomImpl)(this.#wechaty)
  }

  get RoomInvitation (): RoomInvitationConstructor {
    return this.#RoomInvitation ??= wechatifyUserModule(RoomInvitationImpl)(this.#wechaty)
  }

  get Tag (): TagConstructor {
    return this.#Tag ??= wechatifyUserModule(TagImpl)(this.#wechaty)
  }

  get UrlLink (): UrlLinkConstructor {
    return this.#UrlLink ??= wechatifyUserModule(UrlLinkImpl)(this.#wechaty)
  }

}
