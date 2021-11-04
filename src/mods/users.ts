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
 * Huan(202111): we export all `interface` from this file, as the most convenience class name.
 *
 *  since they are `interface`s, so they are `type`-only.
 */

export type {
  ContactInterface        as Contact,
  ContactSelfInterface    as ContactSelf,
  DelayInterface          as Delay,
  FavoriteInterface       as Favorite,
  FriendshipInterface     as Friendship,
  ImageInterface          as Image,
  LocationInterface       as Location,
  MessageInterface        as Message,
  MiniProgramInterface    as MiniProgram,
  MomentInterface         as Moment,
  MoneyInterface          as Money,
  PostInterface           as Post,
  RoomInterface           as Room,
  RoomInvitationInterface as RoomInvitation,
  TagInterface            as Tag,
  UrlLinkInterface        as UrlLink,
}                                               from '../user-modules/mod.js'
