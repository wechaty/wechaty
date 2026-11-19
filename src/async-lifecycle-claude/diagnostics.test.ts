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
 * Tests for privacy-safe diagnostics (wechaty/wechaty#2883): records are
 * published after commit and carry no error payloads. A throwing subscriber is
 * not tested here: Node reports it as `uncaughtException` on a later tick, which
 * `node:test` treats as a file failure by design.
 */

import assert from 'node:assert/strict'
import diagnosticsChannel from 'node:diagnostics_channel'
import { test } from 'node:test'

import { createLifecycle } from './create-lifecycle.ts'
import { CHANNEL_NAME, type LifecycleDiagnosticRecord } from './diagnostics.ts'

test('records carry kind, generation and phase, never errors', async () => {
  const records: LifecycleDiagnosticRecord[] = []
  const subscriber = (message: unknown) => { records.push(message as LifecycleDiagnosticRecord) }
  diagnosticsChannel.subscribe(CHANNEL_NAME, subscriber)
  try {
    const secret = new Error('token=secret')
    const lifecycle = createLifecycle({ onStart: () => { throw secret } }, { name: 'diag' })
    await assert.rejects(lifecycle.start(), secret)
    const failed = records.find(record => record.state.kind === 'failed')
    assert.ok(failed)
    assert.equal(failed.name, 'diag')
    assert.deepEqual(failed.state, { kind: 'failed', generation: 1, phase: 'start', cleanupComplete: true })
    assert.ok(!JSON.stringify(records).includes('secret'))
  } finally {
    diagnosticsChannel.unsubscribe(CHANNEL_NAME, subscriber)
  }
})
