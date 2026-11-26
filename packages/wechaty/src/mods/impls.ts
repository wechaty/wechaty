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
 * @fileoverview Legacy Hungarian export facade (`*Impl`, `*Interface`, `*Constructor`).
 *
 * @deprecated The Hungarian notation export facade (`wechaty/impls`) is retained
 * for backwards compatibility with Wechaty 1.x and will be retired in Wechaty 3.0.
 *
 * Please import domain classes and types directly from canonical entrypoints:
 * - `import { Contact, Message, Room, Wechaty } from 'wechaty'`
 *
 * With TypeScript Declaration Merging, domain entities represent both the instance
 * type and the constructable class value under standard Web Platform naming conventions.
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
}                             from '../user-modules/mod.ts'

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
// }                                         from '../user-modules/mod.ts'

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
}                               from '../user-modules/mod.ts'

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
}                               from '../user-modules/mod.ts'

export {
  WechatyImpl,
  type WechatyState,
  type LegacyStateView,
  legacyStateView,
}                         from '../wechaty/mod.ts'
export type {
  WechatyInterface,
  WechatyConstructor,
}                         from '../wechaty/mod.ts'
