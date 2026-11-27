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
 * Encapsulates generation-scoped `bot.useScoped(...plugins)` / `installScoped(scope)`
 * lifecycle management (`#scopedEntries`, `#activeScope`), replacing the
 * legacy `pluginMixin` and bot-lifetime `bot.use()`. Cleanup errors are isolated
 * via `#invokeUninstaller` while install errors propagate (with `useScoped` rolling
 * back its batch).
 *
 * Architectural boundaries:
 * Owned by `Wechaty`. Internal to `packages/wechaty/src/components/`.
 */
import type { LifecycleScope } from 'scopelet'
import { log } from 'wechaty-puppet'
import type {
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

  /**
   * Register plugins bound to each {@link Wechaty} lifecycle generation.
   *
   * Plugins are installed with `(bot, scope)` during `#lifecycleStart` (or immediately
   * if a generation is active and not retiring) and automatically uninstalled in LIFO
   * order when that generation retires on `stop()`, `restart()`, or `recover()`.
   *
   * If any plugin throws during immediate installation, already-installed entries in
   * the batch are rolled back in LIFO order and removed from future generations.
   * The returned composite uninstaller removes all batch entries and runs their
   * active cleanups in LIFO order, isolating per-plugin cleanup errors.
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
        if (this.#activeScope && !this.#activeScope.isSealed) {
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
      for (const entry of [...entries].reverse()) {
        this.#scopedEntries.delete(entry)
        if (entry.currentUninstall) {
          this.#invokeUninstaller(entry.currentUninstall, entry.plugin.name, 'uninstall')
        }
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
   * - Checks `scope.isSealed` first so a sealed scope (`stop`, `restart`, `recover`,
   *   `fail`) is detected before `entry.plugin()` runs; in that case `#activeScope`
   *   is cleared and installation waits for the next generation.
   * - Registers `runUninstall` via `scope.defer` after `entry.plugin()` so any
   *   `scope.defer` calls made inside the plugin unwind after `runUninstall` (LIFO).
   * - If the plugin uninstalls itself re-entrantly during setup, its returned cleanup runs
   *   immediately and is not bound to `scope.defer`.
   * - Concurrent and re-entrant cleanup calls coalesce via `running` / `inFlight` so the
   *   plugin uninstaller executes once per attempt.
   * - Synchronous throws from `ret()` are normalized to a rejected promise so callers
   *   observe uniform async failure semantics, and `uninstalled` is marked only on resolve
   *   so failed cleanups remain retryable.
   */
  #installEntry (entry: ScopedEntry, scope: LifecycleScope): void {
    if (scope.isSealed) {
      if (this.#activeScope === scope) {
        this.#activeScope = undefined
      }
      return
    }

    const ret = entry.plugin(this.#wechaty, scope)
    if (!this.#scopedEntries.has(entry)) {
      if (isWechatyPluginUninstaller(ret)) {
        this.#invokeUninstaller(ret, entry.plugin.name, 're-entrant uninstall')
      }
      return
    }

    let uninstalled = false
    let running = false
    let inFlight: Promise<void> | undefined
    const runUninstall = (): Promise<void> | void => {
      if (uninstalled || running) {
        return inFlight
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
      running = true
      let result: unknown
      try {
        result = ret()
      } catch (err) {
        running = false
        return Promise.reject(err)
      }
      const p = Promise.resolve(result).then(
        () => {
          running = false
          uninstalled = true
          inFlight = undefined
          if (entry.currentUninstall === runUninstall) {
            entry.currentUninstall = undefined
          }
        },
        (err) => {
          running = false
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

  /**
   * Invoke a plugin uninstaller while isolating both synchronous throws and async rejections
   * via `log.error` so batch uninstallation and rollback loops always complete.
   */
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
