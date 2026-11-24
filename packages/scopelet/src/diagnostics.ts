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
 * Privacy-safe, zero-cost-when-unused diagnostics for the async lifecycle engine.
 *
 * Uses `node:diagnostics_channel` so observability never participates in control
 * flow: records are published *after* a snapshot is committed and only when a
 * subscriber is attached (wechaty/wechaty#2883, wechaty/wechaty#2905 invariant
 * 13). Records carry structural metadata only, never `error` / `cleanupError`.
 *
 * A single channel, `scopelet.state` (D44), carries every
 * record; subscribers filter on `state.kind` and `name`. Record types live in
 * `types.ts`, as part of the public contract. The channel is cross-runtime:
 * Deno implements `node:diagnostics_channel` and behaves as Node.js does here
 * (checked by `diagnostics.test.ts` and the C-OBS-04 contract tests), and
 * `hasSubscribers` keeps the publish path free when nobody is listening.
 *
 * No static import (D43): the module is looked up with
 * `process.getBuiltinModule`, which Node.js and Deno provide. Where it is
 * missing, as in a browser, there is no channel and publishing does nothing, so
 * a bundle needs no alias or shim. The module therefore has no runtime import
 * outside its own directory.
 */

import type * as DiagnosticsChannel from 'node:diagnostics_channel'

import type {
  LifecycleDiagnosticRecord,
  LifecycleDiagnosticState,
  LifecycleState,
}                           from './types.ts'

/** The single diagnostics channel for every lifecycle instance (D44, C-OBS-04). */
const CHANNEL_NAME = 'scopelet.state'

/**
 * The runtime's `node:diagnostics_channel`, or `undefined` where the runtime
 * has none (D43). A failing lookup counts as missing: diagnostics must never
 * stop the module from loading.
 */
function builtinDiagnosticsChannel (): typeof DiagnosticsChannel | undefined {
  const process = (globalThis as { process?: { getBuiltinModule?: (id: string) => unknown } }).process
  try {
    return process?.getBuiltinModule?.('node:diagnostics_channel') as typeof DiagnosticsChannel | undefined
  } catch {
    return undefined
  }
}

const channel = builtinDiagnosticsChannel()?.channel(CHANNEL_NAME)

/**
 * Remove exception-bearing fields before publishing a state snapshot.
 */
function diagnosticState (state: LifecycleState): LifecycleDiagnosticState {
  if (state.kind === 'failed') {
    return {
      kind: state.kind,
      generation: state.generation,
      phase: state.phase,
      cleanupComplete: state.cleanupComplete,
    }
  }
  return {
    kind: state.kind,
    generation: state.generation,
  }
}

/**
 * Publish a state-commit record if and only if a subscriber is attached (and
 * the runtime has a channel at all, D43).
 *
 * This is the only diagnostics entry point the engine calls, and it never
 * throws into the commit. Under both Node.js and Deno, `channel.publish`
 * catches a throwing subscriber and reports it on a later tick as
 * `uncaughtException`, so a buggy subscriber is visible at process level but
 * cannot change a lifecycle outcome; `diagnostics.test.ts` checks this in a
 * child process of each runtime. The local `try` only covers another runtime
 * whose `publish` might throw synchronously.
 */
function publishStateChange (record: LifecycleDiagnosticRecord): void {
  if (!channel?.hasSubscribers) {
    return
  }
  try {
    channel.publish(record)
  } catch {
    // A diagnostics failure must never affect a lifecycle outcome (invariant 13).
  }
}

export {
  CHANNEL_NAME,
  diagnosticState,
  publishStateChange,
}
