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
 * Public, read-only state model for the async lifecycle module.
 *
 * This module owns the discriminated-union snapshot that callers observe through
 * `Lifecycle.state` and `Lifecycle.whenState`. It intentionally carries no
 * operation handles (no Promises, no AbortController): operation ownership stays
 * private to the kernel so that a snapshot can never be used to mutate a run.
 *
 * See wechaty/wechaty#2905 §5 (state representation) and §7 invariant 9
 * (stale completions are fenced): only the kernel may change a snapshot, and a
 * snapshot is a frozen value object.
 */

/**
 * The phase in which a `failed` state was entered.
 *
 * - `'start'` — `onStart` threw, was aborted, or timed out.
 * - `'run'`   — a running generation reported `scope.fail()` (watchdog timeout,
 *               dropped connection, unrequested child exit). This extends the
 *               wechaty/wechaty#2905 proposal (`'start' | 'stop'`) so a runtime
 *               failure is distinguishable from a startup failure.
 * - `'stop'`  — cleanup (the stop hook or the ledger unwind) failed.
 */
type LifecyclePhase = 'start' | 'run' | 'stop'

/**
 * A frozen snapshot of a lifecycle's observable state.
 *
 * Every snapshot carries a `generation`: a monotonically increasing number that
 * identifies the run it belongs to. A new generation is allocated for every
 * start attempt, successful or not, so a late completion from generation N can
 * be recognised and discarded when the current snapshot is N+1.
 *
 * The `failed` kind additionally records the failing `phase`, the original
 * `error`, whether cleanup finished (`cleanupComplete`), and any `cleanupError`.
 * `failed` never implies "safely stopped": `cleanupComplete: false` means owned
 * resources may still be live, which blocks a new generation until a `stop()`
 * finishes the remaining cleanup (wechaty/wechaty#2905 §3.6, invariant 7).
 */
type LifecycleState =
  | { readonly kind: 'stopped';  readonly generation: number }
  | { readonly kind: 'starting'; readonly generation: number }
  | { readonly kind: 'running';  readonly generation: number }
  | { readonly kind: 'stopping'; readonly generation: number }
  | {
      readonly kind: 'failed'
      readonly generation: number
      readonly phase: LifecyclePhase
      readonly error: unknown
      readonly cleanupComplete: boolean
      readonly cleanupError?: unknown
    }

/**
 * The discriminator values of {@link LifecycleState}.
 */
type LifecycleStateKind = LifecycleState['kind']

export type {
  LifecyclePhase,
  LifecycleState,
  LifecycleStateKind,
}
