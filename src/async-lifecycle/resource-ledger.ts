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
 * A reverse-order resource ledger for one generation.
 *
 * This is the structured-concurrency / resource-scope half of the kernel
 * (wechaty/wechaty#2905 §4). An implementer registers disposers through the
 * {@link LifecycleScope}; the kernel registers task joins and child stops into
 * the *same* ledger so one ordering rule covers resources, tasks and children.
 *
 * Contract highlights:
 *
 * - Release runs disposers in reverse registration order (LIFO), matching
 *   `AsyncDisposableStack`.
 * - Every disposer runs even after an earlier one throws; collected errors are
 *   reported together (as an `AggregateError` when more than one).
 * - Registration after the ledger has started unwinding releases the resource
 *   immediately; if that late release throws, the debt is remembered so the
 *   generation's `cleanupComplete` is `false` (wechaty/wechaty#2911 §6.2).
 */

/**
 * A single disposer entry. `label` is used only for diagnostics in future work.
 */
type Disposer = () => void | PromiseLike<void>

/**
 * The reverse-order ledger owned by one generation.
 */
class ResourceLedger {

  /**
   * Registered disposers, in registration order. Released back-to-front.
   */
  readonly #disposers: Disposer[] = []

  /**
   * Set once {@link ResourceLedger.unwind} begins. After this, new registrations
   * release immediately instead of being queued.
   */
  #unwinding = false

  /**
   * Errors from late releases that happened after unwinding began. These are
   * folded into the next explicit unwind so a failing late release keeps the
   * generation dirty.
   */
  readonly #lateErrors: unknown[] = []

  /**
   * Whether unwinding has started. Used by the scope to decide if a registration
   * is "late".
   */
  get unwinding (): boolean {
    return this.#unwinding
  }

  /**
   * Register a disposer.
   *
   * Before unwinding: pushes onto the stack. After unwinding has begun: the
   * caller is responsible for releasing the resource immediately (the scope does
   * this and throws the abort reason). We record late failures via
   * {@link ResourceLedger.recordLateError}.
   *
   * @returns `true` if the disposer was queued, `false` if the ledger is already
   *   unwinding and the caller must release immediately.
   */
  register (disposer: Disposer): boolean {
    if (this.#unwinding) {
      return false
    }
    this.#disposers.push(disposer)
    return true
  }

  /**
   * Record an error from a late release that the scope performed directly.
   */
  recordLateError (error: unknown): void {
    this.#lateErrors.push(error)
  }

  /**
   * Release every registered disposer in reverse order.
   *
   * Runs all disposers even if some throw. Returns the collected errors (empty
   * when clean). Idempotent: a second call only drains any disposers registered
   * in between plus remembered late errors.
   */
  async unwind (): Promise<unknown[]> {
    this.#unwinding = true
    const errors: unknown[] = [ ...this.#lateErrors ]
    this.#lateErrors.length = 0

    while (this.#disposers.length > 0) {
      const disposer = this.#disposers.pop()!
      try {
        await disposer()
      } catch (error) {
        errors.push(error)
      }
    }
    return errors
  }

}

export type {
  Disposer,
}
export {
  ResourceLedger,
}
