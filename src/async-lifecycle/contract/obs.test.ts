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
 * Contract tests for observers (README §12, C-OBS-*): commit ordering, isolation
 * and reentrant commands from observers.
 */

import assert from 'node:assert/strict'

import type { Lifecycle } from '../types.ts'
import { errorName, flush, observe, shutdown } from './harness.ts'
import { contract } from './suite.ts'

contract('C-OBS-03.a', 'a stop() from the running observer does not turn the finished start into a rejection', {}, async ({ make }) => {
  let lifecycle!: Lifecycle
  let started = false
  ;({ lifecycle } = make({
    onStart () { started = true },
    onStateChange (state) {
      if (state.kind === 'running') {
        void lifecycle.stop()
      }
    },
  }))
  const start = observe(lifecycle.start())
  await flush()
  assert.equal(start.status, 'resolved', 'running was committed, so the start succeeded')
  assert.equal(started, true)
  assert.equal(lifecycle.state.kind, 'stopped')
})

contract('C-OBS-03.b', 'a stop() from the starting observer supersedes the start, with one reconciler', {}, async ({ make }) => {
  let lifecycle!: Lifecycle
  let stop: ReturnType<typeof observe<void>> | undefined
  ;({ lifecycle } = make({
    onStart () {},
    onStateChange (state) {
      if (state.kind === 'starting') {
        stop = observe(lifecycle.stop())
      }
    },
  }))
  const start = observe(lifecycle.start())
  await flush()
  assert.equal(errorName(start.error), 'LifecycleSupersededError')
  assert.ok(stop)
  assert.equal(stop.status, 'resolved')
  assert.equal(lifecycle.state.kind, 'stopped')
})

contract('C-OBS-03.c', 'a restart() from the failed observer starts fresh, without inheriting the old failure', {}, async ({ make }) => {
  const reason = new Error('first attempt')
  let lifecycle!: Lifecycle
  let starts = 0
  let restart: ReturnType<typeof observe<void>> | undefined
  ;({ lifecycle } = make({
    onStart () {
      if (++starts === 1) {
        throw reason
      }
    },
    onStateChange (state) {
      if (state.kind === 'failed' && !restart) {
        restart = observe(lifecycle.restart())
      }
    },
  }))
  const start = observe(lifecycle.start())
  await flush()
  assert.equal(start.error, reason)
  assert.ok(restart)
  assert.equal(restart.status, 'resolved')
  assert.deepEqual(lifecycle.state, { kind: 'running', generation: 2 })
  await shutdown(lifecycle)
})

contract('C-OBS-02.a', 'a throwing onStateChange never changes an outcome', {}, async ({ make }) => {
  const { lifecycle } = make({
    onStart () {},
    onStateChange () { throw new Error('observer errors are isolated') },
  })
  const start = observe(lifecycle.start())
  await flush()
  assert.equal(start.status, 'resolved')
  assert.equal(lifecycle.state.kind, 'running')
  const stop = await shutdown(lifecycle)
  assert.equal(stop.status, 'resolved')
  assert.equal(lifecycle.state.kind, 'stopped')
})
