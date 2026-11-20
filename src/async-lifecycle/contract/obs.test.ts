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
import diagnosticsChannel from 'node:diagnostics_channel'

import type { Lifecycle, LifecycleScope, LifecycleState } from '../types.ts'
import { errorName, flush, observe, shutdown, stateTrace } from './harness.ts'
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

contract('C-OBS-03.b', 'a stop() from the starting observer supersedes the start with one reconciler, and onStart is never called (D34)', {}, async ({ make }) => {
  let lifecycle!: Lifecycle
  let stop: ReturnType<typeof observe<void>> | undefined
  let entered = 0
  ;({ lifecycle } = make({
    onStart () { entered++ },
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
  assert.equal(entered, 0, 'C-RET-07: onStart is not called for a generation that is already retiring')
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

contract('C-OBS-04.a', 'diagnostics are published after commit, structural, and never carry error text', {}, async ({ make, impl }) => {
  // Merges the Codex and Claude diagnostics tests; each implementation publishes
  // on its own channel name (D23 fixes the final one).
  const secret = new Error('token=secret')
  const cleanupSecret = new Error('cleanup token=secret')
  const records: unknown[] = []
  const committed: LifecycleState[] = []
  let lifecycle!: Lifecycle
  const subscriber = (message: unknown) => {
    records.push(message)
    committed.push(lifecycle.state)
  }
  diagnosticsChannel.subscribe(impl.diagnosticsChannel, subscriber)
  try {
    ;({ lifecycle } = make({
      onStart (scope) {
        scope.defer(() => { throw cleanupSecret })
        throw secret
      },
      onStateChange () { throw new Error('observer errors are isolated') },
    }, { name: 'diag' }))
    const started = observe(lifecycle.start())
    await flush()
    assert.equal(started.error, secret)
    assert.deepEqual(committed.map(state => state.kind), [ 'starting', 'stopping', 'failed' ], 'each record follows its commit')
    assert.deepEqual(records.at(-1), {
      name     : 'diag',
      previous : { kind: 'stopping', generation: 1 },
      state    : { kind: 'failed', generation: 1, phase: 'start', cleanupComplete: false },
    })
    assert.ok(!JSON.stringify(records).includes('secret'), 'no error text in any record')
  } finally {
    diagnosticsChannel.unsubscribe(impl.diagnosticsChannel, subscriber)
  }
})

// ---------------------------------------------------------------------------
// Ported from the Claude suite (src/async-lifecycle-claude/engine.test.ts)
// ---------------------------------------------------------------------------

contract('C-OBS-01.a', 'a stop() from the failed observer resolves only once `stopped` is committed', {}, async ({ make }) => {
  let lifecycle!: Lifecycle
  let seen: string | undefined
  ;({ lifecycle } = make({
    onStart () { throw new Error('boom') },
    onStateChange (state) {
      if (state.kind === 'failed') {
        void lifecycle.stop().then(() => { seen = lifecycle.state.kind })
      }
    },
  }))
  observe(lifecycle.start())
  await flush()
  assert.equal(seen, 'stopped')
})

contract('C-OBS-03.d', 'a stop() from the observer of a dirty failure gets its own outcome and finishes the cleanup', {}, async ({ make }) => {
  let lifecycle!: Lifecycle
  let calls = 0
  let retry: ReturnType<typeof observe<void>> | undefined
  ;({ lifecycle } = make({
    onStart: scope => scope.defer(() => { if (++calls === 1) { throw new Error('once') } }),
    onStateChange (state) {
      if (state.kind === 'failed' && !state.cleanupComplete && !retry) {
        retry = observe(lifecycle.stop())
      }
    },
  }))
  await lifecycle.start()
  const first = observe(lifecycle.stop())
  await flush()
  assert.match(String((first.error as Error).message), /once/)
  assert.equal(retry?.status, 'resolved')
  assert.equal(calls, 2)
  assert.equal(lifecycle.state.kind, 'stopped')
})

contract('C-OBS-03.e', 'a start() accepted while a run failure retires commits `failed`, then starts the replacement', {}, async ({ make }) => {
  const trace = stateTrace()
  const gate = Promise.withResolvers<void>()
  let saved: LifecycleScope | undefined
  const { lifecycle } = make({ onStart (scope) { saved = scope }, onStop: () => gate.promise, onStateChange: trace.onStateChange })
  await lifecycle.start()
  saved!.fail(new Error('crash'))
  await flush()
  const started = observe(lifecycle.start())
  gate.resolve()
  await flush()
  assert.equal(started.status, 'resolved')
  assert.deepEqual(trace.kinds, [ 'starting:1', 'running:1', 'stopping:1', 'failed:1', 'starting:2', 'running:2' ])
  await shutdown(lifecycle)
})

contract('C-OBS-03.f', 'an onStart that calls stop() synchronously is superseded, with one reconciler and one onStart', {}, async ({ make }) => {
  let lifecycle!: Lifecycle
  let starts = 0
  ;({ lifecycle } = make({ onStart () { starts++; void lifecycle.stop() } }))
  const started = observe(lifecycle.start())
  await flush()
  assert.equal(errorName(started.error), 'LifecycleSupersededError')
  assert.equal(starts, 1)
  assert.equal(lifecycle.state.kind, 'stopped')
})
