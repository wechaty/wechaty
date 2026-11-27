/**
 * Wechaty Chatbot SDK - https://github.com/wechaty/wechaty
 *
 * @copyright 2016 Huan LI (李卓桓) <https://github.com/huan>, and
 *                   Wechaty Contributors <https://github.com/wechaty>.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Plugin type contracts for {@link Wechaty.use} and {@link Wechaty.useScoped}.
 *
 * Why this module exists:
 * Defines the legacy bot-lifetime {@link WechatyPlugin} contract alongside the
 * generation-scoped {@link WechatyScopedPlugin} contract bound to `scopelet`'s
 * {@link LifecycleScope}.
 */
import type { LifecycleScope } from 'scopelet'
import type { Wechaty } from './wechaty/mod.ts'

/** Cleanup callback returned by a plugin to tear down its registrations. */
export type WechatyPluginUninstaller = () => void

/** Return type of a plugin installer: either nothing or an uninstaller callback. */
export type WechatyPluginReturn = void | WechatyPluginUninstaller

/** Legacy plugin installed once for the bot instance via {@link Wechaty.use}. */
export interface WechatyPlugin {
  (bot: Wechaty): WechatyPluginReturn
}

/** A plugin bound to a {@link Wechaty} generation's {@link LifecycleScope}. */
export interface WechatyScopedPlugin {
  (bot: Wechaty, scope: LifecycleScope): WechatyPluginReturn
}

/** Type guard checking whether a plugin return value is an uninstaller function. */
function isWechatyPluginUninstaller (
  pluginReturn: WechatyPluginReturn,
): pluginReturn is WechatyPluginUninstaller {
  return typeof pluginReturn === 'function'
}

export {
  isWechatyPluginUninstaller,
}
