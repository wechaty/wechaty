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
  ImageImpl,
  Image,
  ImageConstructor,
}                           from './image.js'
import {
  LocationImpl,
  Location,
  LocationConstructor,
}                           from './location.js'
import {
  MessageImpl,
  Message,
  MessageConstructor,
}                           from './message.js'
import {
  MiniProgramImpl,
  MiniProgram,
  MiniProgramConstructor,
}                           from './mini-program.js'
import {
  MomentImpl,
  Moment,
  MomentConstructor,
}                           from './moment.js'
import {
  MoneyImpl,
  Money,
  MoneyConstructor,
}                           from './money.js'
import {
  PostImpl,
  Post,
  PostConstructor,
}                           from './post.js'
import {
  RoomImpl,
  Room,
  RoomConstructor,
}                           from './room.js'
import {
  RoomInvitationImpl,
  RoomInvitation,
  RoomInvitationConstructor,
}                           from './room-invitation.js'
import {
  TagImpl,
  Tag,
  TagConstructor,
}                           from './tag.js'
import {
  UrlLinkImpl,
  UrlLink,
  UrlLinkConstructor,
}                           from './url-link.js'
import {
  DelayImpl,
  Delay,
  DelayConstructor,
}                           from './delay.js'

import { wechatifyUserModule } from '../user-mixins/wechatify.js'

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
