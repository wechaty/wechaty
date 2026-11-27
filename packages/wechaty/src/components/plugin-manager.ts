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
      const uninstaller = plugin(this.#wechaty)
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

    try {
      for (const plugin of pluginList) {
        log.verbose('PluginManager', 'useScoped(%s)', plugin.name)
        const entry: ScopedEntry = { plugin }
        this.#scopedEntries.add(entry)
        entries.push(entry)
        if (this.#activeScope && !this.#activeScope.signal.aborted) {
          this.#installEntry(entry, this.#activeScope)
        }
      }
    } catch (err) {
      for (const entry of entries.reverse()) {
        this.#scopedEntries.delete(entry)
        if (entry.currentUninstall) {
          this.#invokeUninstaller(entry.currentUninstall, entry.plugin.name, 'rollback')
        }
      }
      throw err
    }

    return () => {
      for (const entry of entries) {
        this.#scopedEntries.delete(entry)
        if (entry.currentUninstall) {
          this.#invokeUninstaller(entry.currentUninstall, entry.plugin.name, 'uninstall')
        }
      }
    }
  }

  /**
   * Clear the active scope synchronously when generation retirement begins
   * so `useScoped()` does not install onto a sealing generation.
   */
  clearActiveScope (): void {
    this.#activeScope = undefined
  }

  /** Install all registered scoped plugins onto `scope` and bind cleanup via `scope.defer`. */
  installScoped (scope: LifecycleScope): void {
    this.#activeScope = scope
    scope.defer(() => {
      if (this.#activeScope === scope) {
        this.#activeScope = undefined
      }
    })
    for (const entry of [...this.#scopedEntries]) {
      if (!this.#scopedEntries.has(entry)) {
        continue
      }
      this.#installEntry(entry, scope)
    }
  }

  /**
   * Install a single scoped plugin onto `scope` and wire idempotent, retryable cleanup.
   *
   * - If the plugin uninstalls itself re-entrantly during setup, its returned cleanup runs
   *   immediately and is not bound to `scope.defer`.
   * - Concurrent cleanup calls coalesce on `inFlight` so the plugin uninstaller runs once.
   * - `uninstalled` is marked only after cleanup resolves; rejected cleanups clear `inFlight`
   *   and rethrow so generation teardown (`scope.defer`) can retry or surface the error.
   */
  #installEntry (entry: ScopedEntry, scope: LifecycleScope): void {
    const ret = entry.plugin(this.#wechaty, scope)
    if (!this.#scopedEntries.has(entry)) {
      if (isWechatyPluginUninstaller(ret)) {
        this.#invokeUninstaller(ret, entry.plugin.name, 're-entrant uninstall')
      }
      return
    }
    let uninstalled = false
    let inFlight: Promise<void> | undefined
    const runUninstall = (): Promise<void> | void => {
      if (uninstalled) {
        return
      }
      if (inFlight) {
        return inFlight
      }
      if (!isWechatyPluginUninstaller(ret)) {
        uninstalled = true
        if (entry.currentUninstall === runUninstall) {
          entry.currentUninstall = undefined
        }
        return
      }
      const p = Promise.resolve(ret()).then(
        () => {
          uninstalled = true
          inFlight = undefined
          if (entry.currentUninstall === runUninstall) {
            entry.currentUninstall = undefined
          }
        },
        (err) => {
          inFlight = undefined
          throw err
        },
      )
      inFlight = p
      return p
    }
    entry.currentUninstall = runUninstall
    scope.defer(runUninstall)
  }

  #invokeUninstaller (
    fn: () => unknown,
    pluginName: string,
    context: string,
  ): void {
    try {
      void Promise.resolve(fn()).catch((err) => {
        log.error('PluginManager', '%s %s failed: %s', context, pluginName, err)
      })
    } catch (err) {
      log.error('PluginManager', '%s %s failed: %s', context, pluginName, err)
    }
  }

}
