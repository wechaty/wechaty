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
 * Public entry point of the async lifecycle module (wechaty/wechaty#2911).
 *
 * One reusable abstraction for asynchronous lifecycle that Wechaty, Puppet,
 * Puppet providers, PuppetService and IO share. Two ergonomic entry points over
 * one private kernel:
 *
 * - {@link createLifecycle} — composition: a class holds a lifecycle.
 * - {@link AsyncLifecycle}  — inheritance: a class extends a lifecycle.
 *
 * See `./README.md` for the full contract of every member.
 */

export {
  AsyncLifecycle,
}                             from './async-lifecycle.ts'
export {
  createLifecycle,
}                             from './create.ts'

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
}                             from './diagnostics.ts'

export type {
  LifecyclePhase,
  LifecycleState,
  LifecycleStateKind,
}                             from './state.ts'

export type {
  Lifecycle,
  LifecycleCallOptions,
  LifecycleCondition,
  LifecycleController,
  LifecycleHooks,
  LifecycleOptions,
  LifecycleScope,
  RecoverResult,
}                             from './types.ts'
