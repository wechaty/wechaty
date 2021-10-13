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
import { Contact }          from './contact.js'
import { ContactSelf }      from './contact-self.js'
import { Favorite }         from './favorite.js'
import { Friendship }       from './friendship.js'
import { Image }            from './image.js'
import { Location }         from './location.js'
import { Message }          from './message.js'
import { MiniProgram }      from './mini-program.js'
import { Moment }           from './moment.js'
import { Money }            from './money.js'
import { Room }             from './room.js'
import { RoomInvitation }   from './room-invitation.js'
import { Tag }              from './tag.js'
import { UrlLink }          from './url-link.js'

import { wechatifyUserClass } from './mixins/wechatify.js'

export {
  wechatifyUserClass,

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
