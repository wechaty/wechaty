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
 * Entry point of `scopelet`, the async lifecycle package (wechaty/wechaty#2968).
 *
 * Exports the public contract (types and errors, wechaty/wechaty#2969), the two
 * entry points `createLifecycle` and `AsyncLifecycle`, the `listen`,
 * `operation` and `watchdog` companions (README §15), and the diagnostics
 * channel name and the package `VERSION`. The kernel behind them is built in S4
 * (wechaty/wechaty#2972). README §18 describes the internal components.
 *
 * Boundary: the bottom layer of the monorepo (D20, wechaty/wechaty#3021). The
 * package has no runtime dependency and never imports a package that uses it.
 * It gets `node:diagnostics_channel` at runtime through `process.getBuiltinModule`, and
 * runs without it where it is missing, as in a browser (D43). The
 * contract suite in `contract/` is test code: its one adapter (`final.ts`) runs it
 * against this module, and nothing here imports `contract/`. The S2 comparison
 * implementations it once also ran against were deleted in
 * wechaty/wechaty#2974.
 *
 * Globals: the only one it touches is the child-ownership registry that every
 * installed copy shares (`generation.ts`, D21).
 */

export {
  AsyncLifecycle,
}                             from './async-lifecycle.ts'
export {
  listen,
}                             from './companions/listen.ts'
export type {
  EmitterLike,
  EventTargetLike,
  ListenTarget,
}                             from './companions/listen.ts'
export {
  operation,
}                             from './companions/operation.ts'
export {
  watchdog,
}                             from './companions/watchdog.ts'
export type {
  Watchdog,
  WatchdogOptions,
}                             from './companions/watchdog.ts'
export {
  createLifecycle,
}                             from './create-lifecycle.ts'
export {
  CHANNEL_NAME as LIFECYCLE_DIAGNOSTICS_CHANNEL,
}                             from './diagnostics.ts'
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
export {
  sleep,
}                             from './clock.ts'
export {
  VERSION,
}                             from './version.ts'
export type {
  Lifecycle,
  LifecycleAcquireOptions,
  LifecycleClock,
  LifecycleCondition,
  LifecycleConditionHandle,
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
