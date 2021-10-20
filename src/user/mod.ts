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
  interfaceOfContact,
  instanceOfContact,
  validContact,
}                           from './contact.js'
import {
  ContactSelfImpl,
  ContactSelf,
  ContactSelfConstructor,
  interfaceOfContactSelf,
  instanceOfContactSelf,
  validContactSelf,
}                           from './contact-self.js'
import {
  FavoriteImpl,
  Favorite,
  FavoriteConstructor,
  interfaceOfFavorite,
  instanceOfFavorite,
  validFavorite,
}                           from './favorite.js'
import {
  FriendshipImpl,
  Friendship,
  FriendshipConstructor,
  interfaceOfFriendship,
  instanceOfFriendship,
  validFriendship,
}                           from './friendship.js'
import {
  ImageImpl,
  Image,
  ImageConstructor,
  interfaceOfImage,
  instanceOfImage,
  validImage,
}                           from './image.js'
import {
  LocationImpl,
  Location,
  LocationConstructor,
  interfaceOfLocation,
  instanceOfLocation,
  validLocation,
}                           from './location.js'
import {
  MessageImpl,
  Message,
  MessageConstructor,
  interfaceOfMessage,
  instanceOfMessage,
  validMessage,
}                           from './message.js'
import {
  MiniProgramImpl,
  MiniProgram,
  MiniProgramConstructor,
  interfaceOfMiniProgram,
  instanceOfMiniProgram,
  validMiniProgram,
}                           from './mini-program.js'
import {
  MomentImpl,
  Moment,
  MomentConstructor,
  interfaceOfMoment,
  instanceOfMoment,
  validMoment,
}                           from './moment.js'
import {
  MoneyImpl,
  Money,
  MoneyConstructor,
  interfaceOfMoney,
  instanceOfMoney,
  validMoney,
}                           from './money.js'
import {
  RoomImpl,
  Room,
  RoomConstructor,
  interfaceOfRoom,
  instanceOfRoom,
  validRoom,
}                           from './room.js'
import {
  RoomInvitationImpl,
  RoomInvitation,
  RoomInvitationConstructor,
  interfaceOfRoomInvitation,
  instanceOfRoomInvitation,
  validRoomInvitation,
}                           from './room-invitation.js'
import {
  TagImpl,
  Tag,
  TagConstructor,
  interfaceOfTag,
  instanceOfTag,
  validTag,
}                           from './tag.js'
import {
  UrlLinkImpl,
  UrlLink,
  UrlLinkConstructor,
  interfaceOfUrlLink,
  instanceOfUrlLink,
  validUrlLink,
}                           from './url-link.js'

import { wechatifyUserClass } from './mixins/wechatify.js'

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
  Room,
  RoomInvitation,
  Tag,
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
  ImageImpl,
  LocationImpl,
  MessageImpl,
  MiniProgramImpl,
  MomentImpl,
  MoneyImpl,
  RoomImpl,
  RoomInvitationImpl,
  TagImpl,
  UrlLinkImpl,
}

export {
  interfaceOfContact,
  interfaceOfContactSelf,
  interfaceOfFavorite,
  interfaceOfFriendship,
  interfaceOfImage,
  interfaceOfLocation,
  interfaceOfMessage,
  interfaceOfMiniProgram,
  interfaceOfMoment,
  interfaceOfMoney,
  interfaceOfRoom,
  interfaceOfRoomInvitation,
  interfaceOfTag,
  interfaceOfUrlLink,
}

export {
  instanceOfContact,
  instanceOfContactSelf,
  instanceOfFavorite,
  instanceOfFriendship,
  instanceOfImage,
  instanceOfLocation,
  instanceOfMessage,
  instanceOfMiniProgram,
  instanceOfMoment,
  instanceOfMoney,
  instanceOfRoom,
  instanceOfRoomInvitation,
  instanceOfTag,
  instanceOfUrlLink,
}

export {
  validContact,
  validContactSelf,
  validFavorite,
  validFriendship,
  validImage,
  validLocation,
  validMessage,
  validMiniProgram,
  validMoment,
  validMoney,
  validRoom,
  validRoomInvitation,
  validTag,
  validUrlLink,
}
