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
 * Entry point of the Claude implementation of the async lifecycle module
 * (wechaty/wechaty#2911, consolidated v1 design).
 *
 * One private engine behind two shells:
 *
 * - {@link createLifecycle}: composition, for a class that already has a base.
 * - {@link AsyncLifecycle}: inheritance, for a class with no other base.
 *
 * plus the `listen` / `watchdog` companions built on the public scope. This
 * module is deliberately not re-exported from the package root or `exports`
 * map: it lands beside `src/async-lifecycle-copilot/` for comparison until the
 * API is frozen. See `./README.md` for every contract.
 */

export {
  AsyncLifecycle,
}                             from './async-lifecycle.ts'
export {
  createLifecycle,
}                             from './create-lifecycle.ts'
export {
  listen,
}                             from './companions/listen.ts'
export type {
  EmitterLike,
  EventTargetLike,
  ListenTarget,
}                             from './companions/listen.ts'
export {
  watchdog,
}                             from './companions/watchdog.ts'
export type {
  Watchdog,
  WatchdogOptions,
}                             from './companions/watchdog.ts'
export {
  LifecycleSupersededError,
  LifecycleTimeoutError,
  LifecycleUnsafeStateError,
}                             from './errors.ts'
export {
  CHANNEL_NAME as LIFECYCLE_DIAGNOSTICS_CHANNEL,
}                             from './diagnostics.ts'
export type {
  LifecycleDiagnosticRecord,
  LifecycleDiagnosticState,
}                             from './diagnostics.ts'
export type {
  Lifecycle,
  LifecycleAcquireOptions,
  LifecycleClock,
  LifecycleCondition,
  LifecycleController,
  LifecycleHooks,
  LifecycleOptions,
  LifecyclePhase,
  LifecycleScope,
  LifecycleState,
  LifecycleStateKind,
  LifecycleStop,
  LifecycleStopReason,
  LifecycleWaitOptions,
  RecoverResult,
}                             from './types.ts'
