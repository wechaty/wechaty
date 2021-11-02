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
 */

export type {
  Contact as ContactInterface,
  ContactConstructor,
  ContactSelf as ContactSelfInterface,
  ContactSelfConstructor,
  Delay as DelayInterface,
  DelayConstructor,
  Favorite as FavoriteInterface,
  FavoriteConstructor,
  Friendship as FriendshipInterface,
  FriendshipConstructor,
  Image as ImageInterface,
  ImageConstructor,
  Location as LocationInterface,
  LocationConstructor,
  Message as MessageInterface,
  MessageConstructor,
  MiniProgram as MiniProgramInterface,
  MiniProgramConstructor,
  Moment as MomentInterface,
  MomentConstructor,
  Money as MoneyInterface,
  MoneyConstructor,
  Post as PostInterface,
  PostConstructor,
  Room as RoomInterface,
  RoomConstructor,
  RoomInvitation as RoomInvitationInterface,
  RoomInvitationConstructor,
  Tag as TagInterface,
  TagConstructor,
  UrlLink as UrlLinkInterface,
  UrlLinkConstructor,
}                               from '../user-modules/mod.js'

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

export {
  WechatyImpl,
}                         from '../wechaty.js'
export type {
  Wechaty as WechatyInterface,
  WechatyConstructor,
}                         from '../interface/mod.js'
