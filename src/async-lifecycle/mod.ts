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
 * Entry point of the final async lifecycle module (wechaty/wechaty#2968).
 *
 * Stage S1 (wechaty/wechaty#2969) exports only the public contract: types and
 * errors. The two entry points `createLifecycle` and `AsyncLifecycle`, and the
 * `listen` / `watchdog` companions, are added here when the kernel lands
 * (wechaty/wechaty#2972). Nothing outside this directory imports it yet, and it
 * is not part of the package exports map until wechaty/wechaty#2974.
 *
 * Boundary: this directory imports nothing outside itself except
 * `node:diagnostics_channel`, so it can move to its own package unchanged.
 */

export {
  isLifecycleError,
  LifecycleChildFailureError,
  LifecycleError,
  LifecycleOverrideError,
  LifecycleSupersededError,
  LifecycleTimeoutError,
  LifecycleUnsafeStateError,
}                             from './errors.ts'
export type {
  LifecycleErrorCode,
  LifecycleErrorLike,
}                             from './errors.ts'
export type {
  Lifecycle,
  LifecycleAcquireOptions,
  LifecycleClock,
  LifecycleCondition,
  LifecycleController,
  LifecycleDiagnosticRecord,
  LifecycleDiagnosticState,
  LifecycleFailurePhase,
  LifecycleHooks,
  LifecycleOptions,
  LifecycleRecoverResult,
  LifecycleScope,
  LifecycleState,
  LifecycleStateKind,
  LifecycleStop,
  LifecycleStopReason,
  LifecycleWaitOptions,
}                             from './types.ts'
