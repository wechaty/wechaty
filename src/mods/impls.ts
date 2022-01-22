/**
 *   Wechaty Chatbot SDK - https://github.com/wechaty/wechaty
 *
 *   @copyright 2016 Huan LI (李卓桓) <https://github.com/huan>, and
 *                   Wechaty Contributors <https://github.com/wechaty>.
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */

/**
 * Huan(202111): We export all names with specific postfix to make it easier to be recongnized
 *  with less misunderstandings.
 *
 * Postfixes:
 *  - Interface:    type, the `interface
 *  - Constructor:  type, the `Constructor<interface>`
 *  - Impl:         value, the `class`
 *
 *  - no postfix:  value, the `class`
 */

export {
  ContactImpl,
  ContactSelfImpl,
  FavoriteImpl,
  FriendshipImpl,
  ImageImpl,
  LocationImpl,
  MessageImpl,
  MiniProgramImpl,
  MomentImpl,
  MoneyImpl,
  PostImpl,
  RoomImpl,
  RoomInvitationImpl,
  DelayImpl,
  TagImpl,
  UrlLinkImpl,
}                             from '../user-modules/mod.js'

// export {
//   ContactImpl         as Contact,
//   ContactSelfImpl     as ContactSelf,
//   FavoriteImpl        as Favorite,
//   FriendshipImpl      as Friendship,
//   ImageImpl           as Image,
//   LocationImpl        as Location,
//   MessageImpl         as Message,
//   MiniProgramImpl     as MiniProgram,
//   MomentImpl          as Moment,
//   MoneyImpl           as Money,
//   PostImpl            as Post,
//   RoomImpl            as Room,
//   RoomInvitationImpl  as RoomInvitation,
//   DelayImpl           as Delay,
//   TagImpl             as Tag,
//   UrlLinkImpl         as UrlLink,
// }                                         from '../user-modules/mod.js'

export type {
  ContactInterface,
  ContactSelfInterface,
  DelayInterface,
  FavoriteInterface,
  FriendshipInterface,
  ImageInterface,
  LocationInterface,
  MessageInterface,
  MiniProgramInterface,
  MomentInterface,
  MoneyInterface,
  PostInterface,
  RoomInterface,
  RoomInvitationInterface,
  TagInterface,
  UrlLinkInterface,
}                               from '../user-modules/mod.js'

export type {
  ContactConstructor,
  ContactSelfConstructor,
  DelayConstructor,
  FavoriteConstructor,
  FriendshipConstructor,
  ImageConstructor,
  LocationConstructor,
  MessageConstructor,
  MiniProgramConstructor,
  MomentConstructor,
  MoneyConstructor,
  PostConstructor,
  RoomConstructor,
  RoomInvitationConstructor,
  TagConstructor,
  UrlLinkConstructor,
}                               from '../user-modules/mod.js'

export {
  WechatyImpl,
}                         from '../wechaty/mod.js'
export type {
  WechatyInterface,
  WechatyConstructor,
}                         from '../wechaty/mod.js'
