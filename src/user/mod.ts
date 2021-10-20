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
import {
  ContactImpl,
  Contact,
  ContactConstructor,
}                           from './contact.js'
import {
  ContactSelfImpl,
  ContactSelf,
  ContactSelfConstructor,
}                           from './contact-self.js'
import {
  FavoriteImpl,
  Favorite,
  FavoriteConstructor,
}                           from './favorite.js'
import {
  FriendshipImpl,
  Friendship,
  FriendshipConstructor,
}                           from './friendship.js'
import {
  Image,
  ImageInterface,
  ImageConstructor,
}                           from './image.js'
import {
  Location,
  LocationInterface,
  LocationConstructor,
}                           from './location.js'
import {
  Message,
  MessageInterface,
  MessageConstructor,
}                           from './message.js'
import {
  MiniProgram,
  MiniProgramInterface,
  MiniProgramConstructor,
}                           from './mini-program.js'
import {
  Moment,
  MomentInterface,
  MomentConstructor,
}                           from './moment.js'
import {
  Money,
  MoneyInterface,
  MoneyConstructor,
}                           from './money.js'
import {
  Room,
  RoomInterface,
  RoomConstructor,
}                           from './room.js'
import {
  RoomInvitation,
  RoomInvitationInterface,
  RoomInvitationConstructor,
}                           from './room-invitation.js'
import {
  Tag,
  TagInterface,
  TagConstructor,
}                           from './tag.js'
import {
  UrlLink,
  UrlLinkInterface,
  UrlLinkConstructor,
}                           from './url-link.js'

import { wechatifyUserClass } from './mixins/wechatify.js'

export type {
  Contact,
  ContactSelf,
  Favorite,
  Friendship,
  ImageInterface,
  LocationInterface,
  MessageInterface,
  MiniProgramInterface,
  MomentInterface,
  MoneyInterface,
  RoomInterface,
  RoomInvitationInterface,
  TagInterface,
  UrlLinkInterface,

  ContactConstructor,
  ContactSelfConstructor,
  FavoriteConstructor,
  FriendshipConstructor,
  ImageConstructor,
  LocationConstructor,
  MessageConstructor,
  MiniProgramConstructor,
  MomentConstructor,
  MoneyConstructor,
  RoomConstructor,
  RoomInvitationConstructor,
  TagConstructor,
  UrlLinkConstructor,
}
export {
  wechatifyUserClass,
  ContactImpl,
  ContactSelfImpl,
  FavoriteImpl,
  FriendshipImpl,
  Image,
  Location,
  Message,
  MiniProgram,
  Moment,
  Money,
  Room,
  RoomInvitation,
  Tag,
  UrlLink,
}
