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
 * Test support for the async lifecycle module: a manual clock and a microtask
 * flush. Lets every unit test run deadlines and races deterministically, with no
 * real timers or sleeps (AGENTS.md, v1 design §6). Not exported from `mod.ts`.
 */

import type { LifecycleClock } from './types.ts'

/**
 * Let pending promise chains run. Uses only microtask turns, so it never waits
 * for real time; the count comfortably exceeds the engine's deepest chain.
 */
async function flush (turns = 200): Promise<void> {
  for (let i = 0; i < turns; i++) {
    await Promise.resolve()
  }
}

/** A {@link LifecycleClock} whose time moves only when {@link ManualClock.advance} is called. */
class ManualClock implements LifecycleClock {

  #now = 0
  #nextId = 0
  readonly #timers = new Map<number, { readonly at: number, readonly callback: () => void }>()

  /** The number of armed timers. */
  get pending (): number {
    return this.#timers.size
  }

  setTimeout (callback: () => void, ms: number): unknown {
    const id = ++this.#nextId
    this.#timers.set(id, { at: this.#now + ms, callback })
    return id
  }

  clearTimeout (handle: unknown): void {
    this.#timers.delete(handle as number)
  }

  /**
   * Move time forward, firing due timers in order and flushing after each. Work
   * already queued is flushed first, so timers it arms count from "now".
   */
  async advance (ms: number): Promise<void> {
    await flush()
    const target = this.#now + ms
    for (;;) {
      let next: [ number, { at: number, callback: () => void } ] | undefined
      for (const entry of this.#timers) {
        if (entry[1].at <= target && (!next || entry[1].at < next[1].at)) {
          next = entry
        }
      }
      if (!next) {
        break
      }
      this.#timers.delete(next[0])
      this.#now = next[1].at
      next[1].callback()
      await flush()
    }
    this.#now = target
    await flush()
  }

}

export {
  flush,
  ManualClock,
}
