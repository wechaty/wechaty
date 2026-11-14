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
 * Behavioral contract a concrete service plugs into the generic
 * {@link Lifecycle} controller. The controller owns *when* and *whether* these
 * run (serialization, generation, cancellation); the hooks own *how* the
 * underlying resources are acquired and released.
 *
 * Contract requirements enforced/relied upon by the controller:
 *
 *   - `start()` receives an {@link AbortSignal} that aborts when a later
 *     desired-state change (e.g. a `stop()`) supersedes this run. Hooks should
 *     observe it cooperatively and acquire resources that `stop()` can release.
 *   - `stop()` MUST actually release everything `start()` acquired. If it
 *     rejects, the controller treats cleanup as *not* complete and refuses to
 *     masquerade the failure as a clean `stopped` state.
 *   - A `start()` that rejects is a failure; the controller will invoke `stop()`
 *     to roll back any partially-acquired resources before settling.
 *
 * See RFC wechaty/wechaty#2905 §4 (AbortSignal / structured concurrency),
 * §7 (invariants 7, 8).
 */
interface LifecycleHooks {
  /**
   * Acquire resources and bring the service to a running state.
   * @param context.signal aborts when this run is superseded; honor it promptly.
   */
  start (context: { readonly signal: AbortSignal }): Promise<void>
  /**
   * Release everything {@link LifecycleHooks.start} acquired, in reverse order.
   * Reject only if cleanup could not be verified complete.
   */
  stop (): Promise<void>
}

export type {
  LifecycleHooks,
}
