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
 * Privacy-safe, zero-cost-when-unused diagnostics for the async lifecycle kernel.
 *
 * Uses `node:diagnostics_channel` so observability never participates in control
 * flow: records are published *after* a snapshot is committed, only when a
 * subscriber is attached, and a throwing subscriber can never change a lifecycle
 * outcome (wechaty/wechaty#2883, wechaty/wechaty#2905 invariant 13).
 *
 * A single channel (`wechaty.async-lifecycle`) carries every record. Subscribers
 * filter by the record's `type`. The channel is cross-runtime: Deno implements
 * `node:diagnostics_channel`, and `hasSubscribers` keeps the publish path free
 * when nobody is listening.
 */

import diagnosticsChannel from 'node:diagnostics_channel'

import type { LifecycleState } from './state.ts'

/**
 * The name of the single diagnostics channel for all lifecycle instances.
 */
const CHANNEL_NAME = 'wechaty.async-lifecycle'

/**
 * A diagnostics record published after a state commit.
 */
interface LifecycleDiagnosticRecord {
  /** The instance name from {@link LifecycleOptions.name}, or `undefined`. */
  readonly name: string | undefined
  /** The committed snapshot. */
  readonly state: LifecycleState
  /** The snapshot it replaced. */
  readonly previous: LifecycleState
}

const channel = diagnosticsChannel.channel(CHANNEL_NAME)

/**
 * Publish a state-commit record if and only if a subscriber is attached.
 *
 * This is the only diagnostics entry point the kernel calls. It is a no-op with
 * no allocation when there are no subscribers, and it never throws into the
 * caller: `channel.publish` isolation is the subscriber's responsibility, but we
 * additionally guard so a buggy subscriber cannot break a commit.
 */
function publishStateChange (record: LifecycleDiagnosticRecord): void {
  if (!channel.hasSubscribers) {
    return
  }
  try {
    channel.publish(record)
  } catch {
    /**
     * A diagnostics failure must never affect a lifecycle outcome
     * (invariant 13). We deliberately swallow here; subscribers own their own
     * error handling.
     */
  }
}

export type {
  LifecycleDiagnosticRecord,
}
export {
  CHANNEL_NAME,
  publishStateChange,
}
