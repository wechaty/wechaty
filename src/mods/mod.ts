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
 * We need to put `Wechaty` at the beginning of this file for import
 * because we have circular dependencies between `Puppet` & `Wechaty`
 */
export type {
  WechatyOptions,
  WechatyInterface as Wechaty,
}                               from '../wechaty/mod.js'
export {
  WechatyBuilder,
}                               from '../wechaty-builder.js'

export type {
  SayableSayer,
  Sayable,
}                   from '../sayable/mod.js'
export {
  messageToSayable,
}                   from '../sayable/mod.js'

export * as type        from 'wechaty-puppet/type'
export * as payload     from 'wechaty-puppet/payload'
export * as helper      from 'wechaty-puppet/helper'

export *                from './user.js'
/**
 * Huan(202111): `users` need to be put before `impls`
 *  because of they have overlap interfaces and
 *  the VSCode will use the first see name in the IDE intelligence.
 */
export * as user        from './user.js'
export * as impl        from './impl.js'

export {
  ScanStatus,
}                       from 'wechaty-puppet/types'
export {
  log,
  config,
  qrcodeValueToImageUrl,
  VERSION,
}                         from '../config.js'

export type {
  WechatyPlugin,
  WechatyPluginUninstaller,
}                             from '../plugin.js'

export type {
  PuppetModuleName,
}                             from '../puppet-management/puppet-config.js'

export type {
  IoClientOptions,
}                         from '../io-client.js'
export {
  IoClient,
}                         from '../io-client.js'
export type {
  WechatyEventName,
}                             from '../events/wechaty-events.js'
