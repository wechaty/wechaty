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
 * Generic async lifecycle controller for Wechaty 2.0, replacing `state-switch`.
 *
 * This barrel re-exports the public surface of the lifecycle module. The design
 * rationale and invariants live in the individual files and in RFC
 * wechaty/wechaty#2905.
 */
export {
  LifecycleController,
}                         from './lifecycle.ts'
export type {
  Lifecycle,
  LifecycleOptions,
}                         from './lifecycle.ts'
export type {
  LifecycleHooks,
}                         from './lifecycle-hooks.ts'
export type {
  LifecycleState,
  LifecycleStateKind,
}                         from './lifecycle-state.ts'
export {
  LifecycleStartError,
  LifecycleStopError,
  LifecycleSupersededError,
}                         from './lifecycle-errors.ts'
