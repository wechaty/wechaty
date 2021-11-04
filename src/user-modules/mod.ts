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
  ContactInterface,
  ContactConstructor,
}                           from './contact.js'
import {
  ContactSelfImpl,
  ContactSelfInterface,
  ContactSelfConstructor,
}                           from './contact-self.js'
import {
  FavoriteImpl,
  FavoriteInterface,
  FavoriteConstructor,
}                           from './favorite.js'
import {
  FriendshipImpl,
  FriendshipInterface,
  FriendshipConstructor,
}                           from './friendship.js'
import {
  ImageImpl,
  ImageInterface,
  ImageConstructor,
}                           from './image.js'
import {
  LocationImpl,
  LocationInterface,
  LocationConstructor,
}                           from './location.js'
import {
  MessageImpl,
  MessageInterface,
  MessageConstructor,
}                           from './message.js'
import {
  MiniProgramImpl,
  MiniProgramInterface,
  MiniProgramConstructor,
}                           from './mini-program.js'
import {
  MomentImpl,
  MomentInterface,
  MomentConstructor,
}                           from './moment.js'
import {
  MoneyImpl,
  MoneyInterface,
  MoneyConstructor,
}                           from './money.js'
import {
  PostImpl,
  PostInterface,
  PostConstructor,
}                           from './post.js'
import {
  RoomImpl,
  RoomInterface,
  RoomConstructor,
}                           from './room.js'
import {
  RoomInvitationImpl,
  RoomInvitationInterface,
  RoomInvitationConstructor,
}                           from './room-invitation.js'
import {
  TagImpl,
  TagInterface,
  TagConstructor,
}                           from './tag.js'
import {
  UrlLinkImpl,
  UrlLinkInterface,
  UrlLinkConstructor,
}                           from './url-link.js'
import {
  DelayImpl,
  DelayInterface,
  DelayConstructor,
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
