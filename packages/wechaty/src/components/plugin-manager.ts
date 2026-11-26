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
 * Plugin lifecycle and uninstaller manager for Wechaty bot instances.
 *
 * Why this module exists:
 * Encapsulates `bot.use(...plugins)` registration, error isolation, and composite
 * uninstaller handling, replacing the legacy `pluginMixin`.
 *
 * Architectural boundaries:
 * Owned by `Wechaty`. Internal to `packages/wechaty/src/components/`.
 */
import { log } from 'wechaty-puppet'
import type {
  WechatyPlugin,
  WechatyPluginUninstaller,
} from '../plugin.ts'
import { isWechatyPluginUninstaller } from '../plugin.ts'
import type { Wechaty } from '../wechaty/wechaty.ts'

export class PluginManager {

  readonly #wechaty: Wechaty

  constructor (wechaty: Wechaty) {
    this.#wechaty = wechaty
  }

  use (
    ...plugins: (
      | WechatyPlugin
      | WechatyPlugin[]
    )[]
  ): WechatyPluginUninstaller {
    const pluginList = plugins.flat()
    const uninstallerList: WechatyPluginUninstaller[] = []

    for (const plugin of pluginList) {
      log.verbose('PluginManager', 'use(%s)', plugin.name)
      try {
        const uninstaller = plugin(this.#wechaty)
        if (isWechatyPluginUninstaller(uninstaller)) {
          uninstallerList.push(uninstaller)
        }
      } catch (e) {
        this.#wechaty.emitError(e)
      }
    }

    return () => {
      uninstallerList.forEach(u => u())
    }
  }

}
