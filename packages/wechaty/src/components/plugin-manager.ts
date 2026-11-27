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
import type { LifecycleScope } from 'scopelet'
import { log } from 'wechaty-puppet'
import type {
  WechatyPlugin,
  WechatyPluginUninstaller,
  WechatyScopedPlugin,
} from '../plugin.ts'
import { isWechatyPluginUninstaller } from '../plugin.ts'
import type { Wechaty } from '../wechaty/wechaty.ts'

interface ScopedEntry {
  readonly plugin: WechatyScopedPlugin
  currentUninstall?: () => void
}

export class PluginManager {

  readonly #wechaty: Wechaty
  readonly #scopedEntries = new Set<ScopedEntry>()
  #activeScope?: LifecycleScope

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
      const uninstaller = plugin(this.#wechaty, this.#activeScope)
      if (isWechatyPluginUninstaller(uninstaller)) {
        uninstallerList.push(uninstaller)
      }
    }

    return () => {
      uninstallerList.forEach(u => u())
    }
  }

  /**
   * Register plugins bound to each {@link Wechaty} lifecycle generation.
   *
   * Plugins are installed with `(bot, scope)` during `#lifecycleStart` (or immediately
   * if a generation is already active) and automatically uninstalled in LIFO order
   * when that generation retires on `stop()` or `restart()`.
   */
  useScoped (
    ...plugins: (
      | WechatyScopedPlugin
      | WechatyScopedPlugin[]
    )[]
  ): WechatyPluginUninstaller {
    const pluginList = plugins.flat()
    const entries: ScopedEntry[] = []

    for (const plugin of pluginList) {
      log.verbose('PluginManager', 'useScoped(%s)', plugin.name)
      const entry: ScopedEntry = { plugin }
      this.#scopedEntries.add(entry)
      entries.push(entry)
      if (this.#activeScope && !this.#activeScope.signal.aborted) {
        this.#installEntry(entry, this.#activeScope)
      }
    }

    return () => {
      for (const entry of entries) {
        this.#scopedEntries.delete(entry)
        entry.currentUninstall?.()
      }
    }
  }

  /** Install all registered scoped plugins onto `scope` and bind cleanup via `scope.defer`. */
  installScoped (scope: LifecycleScope): void {
    this.#activeScope = scope
    scope.defer(() => {
      if (this.#activeScope === scope) {
        this.#activeScope = undefined
      }
    })
    for (const entry of this.#scopedEntries) {
      this.#installEntry(entry, scope)
    }
  }

  #installEntry (entry: ScopedEntry, scope: LifecycleScope): void {
    const ret = entry.plugin(this.#wechaty, scope)
    let uninstalled = false
    const runUninstall = () => {
      if (uninstalled) {
        return
      }
      uninstalled = true
      if (entry.currentUninstall === runUninstall) {
        entry.currentUninstall = undefined
      }
      if (isWechatyPluginUninstaller(ret)) {
        ret()
      }
    }
    entry.currentUninstall = runUninstall
    scope.defer(runUninstall)
  }

}
