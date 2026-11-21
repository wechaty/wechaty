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
 * Exports the public contract (types and errors, wechaty/wechaty#2969), the two
 * entry points `createLifecycle` and `AsyncLifecycle`, the `listen`,
 * `operation` and `watchdog` companions (README §15), and the diagnostics
 * channel name. The kernel behind them is built in S4 (wechaty/wechaty#2972).
 * It is published as `wechaty/async-lifecycle` (D20, wechaty/wechaty#2974);
 * nothing else in `wechaty` imports it yet. README §18 describes the internal
 * components.
 *
 * Boundary: the module's own files have no runtime import outside this
 * directory, so it can move to its own package unchanged (D20). It gets
 * `node:diagnostics_channel` at runtime through `process.getBuiltinModule`, and
 * runs without it where it is missing, as in a browser (D43). The
 * one exception is test code in `contract/`: its `adapters/` import the three
 * comparison implementations in `src/async-lifecycle-{codex,claude,copilot}/`
 * so the shared suite can run against them (wechaty/wechaty#2970). Nothing here
 * imports `contract/`, and the adapters are deleted with those directories in
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
