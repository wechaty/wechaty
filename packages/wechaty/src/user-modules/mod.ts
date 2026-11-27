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
  type Contact,
  type ContactInterface,
  type ContactConstructor,
}                           from './contact.ts'
import {
  ContactSelfImpl,
  type ContactSelf,
  type ContactSelfInterface,
  type ContactSelfConstructor,
}                           from './contact-self.ts'
import {
  FavoriteImpl,
  type Favorite,
  type FavoriteInterface,
  type FavoriteConstructor,
}                           from './favorite.ts'
import {
  FriendshipImpl,
  type Friendship,
  type FriendshipInterface,
  type FriendshipConstructor,
}                           from './friendship.ts'
import {
  ImageImpl,
  type Image,
  type ImageInterface,
  type ImageConstructor,
}                           from './image.ts'
import {
  LocationImpl,
  type Location,
  type LocationInterface,
  type LocationConstructor,
}                           from './location.ts'
import {
  MessageImpl,
  type Message,
  type MessageInterface,
  type MessageConstructor,
}                           from './message.ts'
import {
  MiniProgramImpl,
  type MiniProgram,
  type MiniProgramInterface,
  type MiniProgramConstructor,
}                           from './mini-program.ts'
import {
  MomentImpl,
  type Moment,
  type MomentInterface,
  type MomentConstructor,
}                           from './moment.ts'
import {
  MoneyImpl,
  type Money,
  type MoneyInterface,
  type MoneyConstructor,
}                           from './money.ts'
import {
  PostImpl,
  type Post,
  type PostInterface,
  type PostConstructor,
}                           from './post.ts'
import {
  RoomImpl,
  type Room,
  type RoomInterface,
  type RoomConstructor,
}                           from './room.ts'
import {
  RoomInvitationImpl,
  type RoomInvitation,
  type RoomInvitationInterface,
  type RoomInvitationConstructor,
}                           from './room-invitation.ts'
import {
  TagImpl,
  type Tag,
  type TagInterface,
  type TagConstructor,
}                           from './tag.ts'
import {
  UrlLinkImpl,
  type UrlLink,
  type UrlLinkInterface,
  type UrlLinkConstructor,
}                           from './url-link.ts'
import {
  DelayImpl,
  type Delay,
  type DelayInterface,
  type DelayConstructor,
}                           from './delay.ts'

import { bindUserModule } from '../user-mixins/wechatify.ts'

export type {
  Contact,
  ContactSelf,
  Favorite,
  Friendship,
  Image,
  Location,
  Message,
  MiniProgram,
  Moment,
  Money,
  Post,
  Room,
  RoomInvitation,
  Tag,
  Delay,
  UrlLink,

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
  bindUserModule,

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
