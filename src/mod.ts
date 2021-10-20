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
  ScanStatus,
  UrlLinkPayload,
  FileBox,
  MemoryCard,
  log,
}                 from 'wechaty-puppet'

import {
  config,
  qrcodeValueToImageUrl,
  VERSION,
}                         from './config.js'

import {
  createWechaty,
  singletonWechaty,
}                        from './factory.js'

/**
 * We need to put `Wechaty` at the beginning of this file for import
 * because we have circular dependencies between `Puppet` & `Wechaty`
 */
import {
  WechatyImpl,
  WechatyOptions,
}                             from './wechaty.js'
import type {
  WechatyPlugin,
  WechatyPluginUninstaller,
}                             from './plugin.js'

import type {
  PuppetModuleName,
}                             from './puppet-config.js'

import {
  Contact,
  ContactImpl,
  ContactSelfImpl,
  FavoriteImpl,
  Friendship,
  FriendshipImpl,
  Image,
  Message,
  MiniProgram,
  Moment,
  Money,
  Room,
  RoomInvitation,
  Tag,
  UrlLink,
  Location,
}                         from './user/mod.js'
import {
  IoClient,
  IoClientOptions,
}                         from './io-client.js'
import type {
  WechatyEventName,
}                             from './events/wechaty-events.js'

import type {
  Sayable,
  SayableMessage,
  Wechaty,
}                   from './interface/mod.js'
export type {
  Contact,
  Friendship,
  IoClientOptions,
  PuppetModuleName,
  Sayable,
  SayableMessage,
  UrlLinkPayload,
  WechatyEventName,
  Wechaty,
  WechatyOptions,
  WechatyPlugin,
  WechatyPluginUninstaller,
}
export {
  createWechaty,
  singletonWechaty,
  config,
  ContactImpl,
  ContactSelfImpl,
  FavoriteImpl,
  FileBox,
  FriendshipImpl,
  Image,
  Location,
  IoClient,
  log,
  MemoryCard,
  Message,
  MiniProgram,
  Moment,
  Money,
  qrcodeValueToImageUrl,
  Room,
  RoomInvitation,
  ScanStatus,
  Tag,
  UrlLink,
  VERSION,
  WechatyImpl,
}
