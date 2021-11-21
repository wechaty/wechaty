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

/**
 * @deprecated use `types` instead
 */
export * as type        from 'wechaty-puppet/types'
/**
 * @deprecated use `payloads` instead
 */
export * as payload     from 'wechaty-puppet/payloads'

export * as types        from 'wechaty-puppet/types'
export * as payloads     from 'wechaty-puppet/payloads'

/**
 * Huan(202111) We should not re-export other NPM modules
 *  because this will cause problems by adding more couple between them.
 */
// export * as helper      from 'wechaty-puppet/helper'

export *                from './users.js'
/**
 * Huan(202111): `users` need to be put before `impls`
 *  because of they have overlap interfaces and
 *  the VSCode will use the first see name in the IDE intelligence.\
 * @deprecated use `users` instead
 */
export * as user        from './users.js'
/**
 * @deprecated use `impls` instead
 */
export * as impl        from './impls.js'

export * as users        from './users.js'
export * as impls        from './impls.js'

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
  PuppetModuleName,
}                             from '../puppet-management/mod.js'
export type {
  WechatyEventName,
}                             from '../schemas/mod.js'

export type {
  WechatyPlugin,
  WechatyPluginUninstaller,
}                             from '../plugin.js'
export type {
  IoClientOptions,
}                             from '../io-client.js'
export {
  IoClient,
}                             from '../io-client.js'
