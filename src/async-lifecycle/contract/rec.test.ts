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
 * Contract tests for failure and recovery (README §9, C-REC-*).
 *
 * The Codex comparison implementation recovers through an owner-level
 * `recover(observedState)` instead of `scope.recover()` (not adopted in S1), so
 * its recovery tests are ported here as the `scope.recover()` behavior they
 * protect, and Codex is skipped for lack of `scope.recover`.
 */

import assert from 'node:assert/strict'

import type { LifecycleRecoverResult, LifecycleScope } from '../types.ts'
import { flush, observe, shutdown } from './harness.ts'
import { contract } from './suite.ts'

contract('C-REC-02.a', 'a running generation can recover into a fresh one, again and again', { needs: [ 'scope.recover' ] }, async ({ make }) => {
  let scope: LifecycleScope | undefined
  const { lifecycle } = make({ onStart (current) { scope = current } })
  await lifecycle.start()
  for (let generation = 1; generation <= 2; generation++) {
    const recovered = observe(scope!.recover(new Error(`stale ${generation}`)))
    await flush()
    assert.equal(recovered.status, 'resolved')
    assert.equal(recovered.value, 'recovered')
    assert.deepEqual(lifecycle.state, { kind: 'running', generation: generation + 1 })
  }
  await shutdown(lifecycle)
})

contract('C-REC-03.a', 'stop() during the replacement\'s startup supersedes the recovery, and it is never reported as failed', { needs: [ 'scope.recover' ] }, async ({ make }) => {
  let first: LifecycleScope | undefined
  const replacementEntered = Promise.withResolvers<void>()
  const { lifecycle } = make({
    async onStart (scope) {
      if (!first) {
        first = scope
        return
      }
      // The replacement is still `starting`, like an offline Io retrying (C-REC-06).
      replacementEntered.resolve()
      await new Promise<void>(resolve => scope.signal.addEventListener('abort', () => resolve(), { once: true }))
    },
  })
  await lifecycle.start()
  const recovered = observe(first!.recover(new Error('needs recovery')))
  await replacementEntered.promise
  assert.equal(lifecycle.state.kind, 'starting')

  const stopped = observe(lifecycle.stop())
  await flush()
  assert.equal(stopped.status, 'resolved')
  assert.equal(recovered.status, 'resolved')
  assert.equal(recovered.value, 'superseded')
  assert.equal(lifecycle.state.kind, 'stopped')
})

contract('C-REC-03.b', 'recover() before `running` acts like fail(): the first boot fails fast and the result is `failed`', { needs: [ 'scope.recover' ] }, async ({ make }) => {
  const reason = new Error('bad credentials')
  let result: ReturnType<typeof observe<LifecycleRecoverResult>> | undefined
  const { lifecycle } = make({
    onStart (scope) {
      result = observe(scope.recover(reason))
    },
  })
  const started = observe(lifecycle.start())
  await flush()
  assert.equal(result!.status, 'resolved', 'D10: recover() never rejects')
  assert.equal(result!.value, 'failed')
  assert.equal(started.error, reason)
  assert.ok(lifecycle.state.kind === 'failed')
  assert.equal(lifecycle.state.phase, 'start')
  await shutdown(lifecycle)
})

contract('C-REC-03.c', 'recover() from a retired scope resolves `superseded` and changes nothing', { needs: [ 'scope.recover' ] }, async ({ make }) => {
  let first: LifecycleScope | undefined
  const { lifecycle } = make({ onStart (scope) { first ??= scope } })
  await lifecycle.start()
  await lifecycle.restart()
  const snapshot = lifecycle.state
  const stale = observe(first!.recover(new Error('stale')))
  await flush()
  assert.equal(stale.value, 'superseded')
  assert.equal(lifecycle.state, snapshot)
  await shutdown(lifecycle)
})
