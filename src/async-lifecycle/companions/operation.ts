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
 * Companion: an in-flight operation that a generation's retirement waits for
 * (README §15, C-COMP-03, D24).
 *
 * Built only on the public {@link LifecycleScope} (D17): the operation runs as a
 * spawned task, so retirement joins it before releasing anything, under the stop
 * deadline (C-RET-01), and a sealed scope refuses a new one. Unlike a plain task,
 * its result and its error go back to its caller: a failed operation, such as a
 * `messageSend` the server rejected, never fails the run. The owner keeps the
 * scope it got in `onStart` and runs its public operations through it, which
 * closes the race between an operation and `stop()` without a kernel change.
 */

import type { LifecycleScope } from '../types.ts'

/**
 * Run `work` as an operation of this generation and return its result
 * (C-COMP-03).
 *
 * - `stop()`, `restart()` and a recovery wait for it: retirement joins it with
 *   the tasks, before any resource is released, under the stop deadline.
 * - `work` gets `scope.signal`, which aborts when the generation starts
 *   retiring. An operation that should finish anyway, such as a send already on
 *   the wire, may ignore it; retirement still waits for it.
 * - Its result resolves, and its error (a synchronous throw included) rejects,
 *   only the returned promise: the generation keeps running.
 * - On a sealed (retiring or retired) scope it rejects at once with the
 *   retirement reason, without calling `work` (C-SCOPE-02).
 */
function operation<T> (
  scope: LifecycleScope,
  work: (signal: AbortSignal) => T | PromiseLike<T>,
): Promise<T> {
  const { promise, resolve, reject } = Promise.withResolvers<T>()
  try {
    scope.spawn(async signal => {
      try {
        resolve(await work(signal))
      } catch (error) {
        // The caller's error, not the task's: a task that rejects fails the run.
        reject(error)
      }
    })
  } catch (error) {
    // spawn() throws the retirement reason on a sealed scope.
    reject(error)
  }
  return promise
}

export {
  operation,
}
