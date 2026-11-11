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
  type ContactInterface,
  type ContactConstructor,
}                           from './contact.js'
import {
  ContactSelfImpl,
  type ContactSelfInterface,
  type ContactSelfConstructor,
}                           from './contact-self.js'
import {
  FavoriteImpl,
  type FavoriteInterface,
  type FavoriteConstructor,
}                           from './favorite.js'
import {
  FriendshipImpl,
  type FriendshipInterface,
  type FriendshipConstructor,
}                           from './friendship.js'
import {
  ImageImpl,
  type ImageInterface,
  type ImageConstructor,
}                           from './image.js'
import {
  LocationImpl,
  type LocationInterface,
  type LocationConstructor,
}                           from './location.js'
import {
  MessageImpl,
  type MessageInterface,
  type MessageConstructor,
}                           from './message.js'
import {
  MiniProgramImpl,
  type MiniProgramInterface,
  type MiniProgramConstructor,
}                           from './mini-program.js'
import {
  MomentImpl,
  type MomentInterface,
  type MomentConstructor,
}                           from './moment.js'
import {
  MoneyImpl,
  type MoneyInterface,
  type MoneyConstructor,
}                           from './money.js'
import {
  PostImpl,
  type PostInterface,
  type PostConstructor,
}                           from './post.js'
import {
  RoomImpl,
  type RoomInterface,
  type RoomConstructor,
}                           from './room.js'
import {
  RoomInvitationImpl,
  type RoomInvitationInterface,
  type RoomInvitationConstructor,
}                           from './room-invitation.js'
import {
  TagImpl,
  type TagInterface,
  type TagConstructor,
}                           from './tag.js'
import {
  UrlLinkImpl,
  type UrlLinkInterface,
  type UrlLinkConstructor,
}                           from './url-link.js'
import {
  DelayImpl,
  type DelayInterface,
  type DelayConstructor,
}                           from './delay.js'

import { wechatifyUserModule } from '../user-mixins/wechatify.js'

export type {
  ContactInterface,
  ContactSelfInterface,
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
  DelayInterface,
  UrlLinkInterface,
}

export type {
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
  PostConstructor,
  RoomConstructor,
  RoomInvitationConstructor,
  DelayConstructor,
  TagConstructor,
  UrlLinkConstructor,
}

export {
  wechatifyUserModule,

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
}
