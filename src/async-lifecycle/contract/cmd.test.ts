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
 * Contract tests for commands and intent (README §4, C-CMD-*). Each test key
 * starts with the clause it checks; `INVENTORY.md` maps every source test here.
 */

import assert from 'node:assert/strict'

import type { LifecycleScope } from '../types.ts'
import { errorName, flush, observe, shutdown } from './harness.ts'
import { contract } from './suite.ts'

contract('C-CMD-01.a', 'a pre-aborted caller signal rejects with its reason and starts nothing', {}, async ({ make }) => {
  let starts = 0
  const { lifecycle } = make({ onStart () { starts++ } })
  const started = observe(lifecycle.start({ signal: AbortSignal.abort('pre-aborted') }))
  await flush()
  assert.equal(started.status, 'rejected')
  assert.equal(started.error, 'pre-aborted')
  assert.equal(starts, 0)
  assert.deepEqual(lifecycle.state, { kind: 'stopped', generation: 0 })
})

contract('C-CMD-02.a', 'a caller abort cancels only that wait, with its exact reason, and not the shared start', {}, async ({ make }) => {
  const gate = Promise.withResolvers<void>()
  let starts = 0
  let aborted: boolean | undefined
  const { lifecycle } = make({
    async onStart (scope) {
      starts++
      await gate.promise
      aborted = scope.signal.aborted
    },
  })
  const caller = new AbortController()
  const first = observe(lifecycle.start({ signal: caller.signal }))
  const second = observe(lifecycle.start())
  await flush()
  caller.abort(0) // a falsy reason must survive as itself
  await flush()
  assert.equal(first.status, 'rejected')
  assert.equal(first.error, 0)
  assert.equal(second.status, 'pending')

  gate.resolve()
  await flush()
  assert.equal(second.status, 'resolved')
  assert.equal(aborted, false, 'a caller abort must not abort the generation')
  assert.equal(starts, 1)
  await shutdown(lifecycle)
})

contract('C-CMD-03.a', 'concurrent start() calls share one attempt', {}, async ({ make }) => {
  const gate = Promise.withResolvers<void>()
  let starts = 0
  const { lifecycle } = make({ async onStart () { starts++; await gate.promise } })
  const first = observe(lifecycle.start())
  const second = observe(lifecycle.start())
  await flush()
  gate.resolve()
  await flush()
  assert.equal(first.status, 'resolved')
  assert.equal(second.status, 'resolved')
  assert.equal(starts, 1)
  assert.equal(lifecycle.state.kind, 'running')
  await shutdown(lifecycle)
})

contract('C-CMD-06.a', 'a start() issued while the starting generation aborts waits for it to retire, then starts the next', {}, async ({ make }) => {
  const entered = Promise.withResolvers<void>()
  const release = Promise.withResolvers<void>()
  const scopes: LifecycleScope[] = []
  let replacement: ReturnType<typeof observe<void>> | undefined
  const { lifecycle } = make({
    async onStart (scope) {
      scopes.push(scope)
      if (scopes.length === 1) {
        scope.signal.addEventListener('abort', () => { replacement = observe(lifecycle.start()) }, { once: true })
        entered.resolve()
        await release.promise
      }
    },
  })
  const first = observe(lifecycle.start())
  await entered.promise
  const stopped = observe(lifecycle.stop())
  await flush()
  assert.ok(replacement, 'the abort listener issued start()')
  assert.equal(scopes.length, 1, 'no replacement while the first generation is still retiring')

  release.resolve()
  await flush()
  assert.equal(errorName(first.error), 'LifecycleSupersededError')
  assert.equal(stopped.status, 'resolved')
  assert.equal(replacement.status, 'resolved')
  assert.equal(scopes.length, 2)
  assert.equal(scopes[0]!.signal.aborted, true)
  assert.equal(scopes[1]!.signal.aborted, false)
  assert.deepEqual(lifecycle.state, { kind: 'running', generation: 2 })
  await shutdown(lifecycle)
})

contract('C-CMD-07.a', 'stop() supersedes a pending start, and the late onStart completion never publishes running', {}, async ({ make }) => {
  const gate = Promise.withResolvers<void>()
  const kinds: string[] = []
  const { lifecycle } = make({
    async onStart () { await gate.promise },
    onStateChange (state) { kinds.push(state.kind) },
  })
  const started = observe(lifecycle.start())
  await flush()
  const stopped = observe(lifecycle.stop())
  gate.resolve()
  await flush()
  assert.equal(started.status, 'rejected')
  assert.equal(errorName(started.error), 'LifecycleSupersededError')
  assert.equal(stopped.status, 'resolved')
  assert.equal(lifecycle.state.kind, 'stopped')
  assert.equal(kinds.includes('running'), false)
})

contract('C-CMD-09.a', 'a cleanly failed start can be stopped, then started again', {}, async ({ make }) => {
  let fail = true
  const { lifecycle } = make({ onStart () { if (fail) throw new Error('boom') } })
  // Read through a call: assert.equal() narrows `lifecycle.state` in TypeScript,
  // but this test checks it changing from one assertion to the next.
  const kind = () => lifecycle.state.kind
  const first = observe(lifecycle.start())
  await flush()
  assert.equal(first.status, 'rejected')
  assert.equal(kind(), 'failed')

  const stopped = observe(lifecycle.stop())
  await flush()
  assert.equal(stopped.status, 'resolved')
  assert.equal(kind(), 'stopped')

  fail = false
  const second = observe(lifecycle.start())
  await flush()
  assert.equal(second.status, 'resolved')
  assert.equal(kind(), 'running')
  await shutdown(lifecycle)
})

contract('C-CMD-11.a', 'restart() superseded by a later stop() rejects, and the lifecycle ends stopped', {}, async ({ make }) => {
  const { lifecycle } = make({ onStart () {} })
  await lifecycle.start()
  const restarted = observe(lifecycle.restart())
  const stopped = observe(lifecycle.stop())
  await flush()
  assert.equal(errorName(restarted.error), 'LifecycleSupersededError')
  assert.equal(stopped.status, 'resolved')
  assert.equal(lifecycle.state.kind, 'stopped')
})

contract('C-CMD-11.b', 'restart() during startup retires the interrupted hook before the replacement starts, with no onStop', {}, async ({ make }) => {
  // Codex source test expected an onStop here; D8 says no onStop for a run that never reached running.
  const entered = Promise.withResolvers<void>()
  const trace: string[] = []
  let starts = 0
  const { lifecycle } = make({
    async onStart (scope) {
      trace.push(`start ${++starts}`)
      if (starts === 1) {
        entered.resolve()
        await new Promise<void>(resolve => scope.signal.addEventListener('abort', () => resolve(), { once: true }))
        trace.push('first start interrupted')
      }
    },
    onStop () { trace.push('stop') },
  })
  const first = observe(lifecycle.start())
  await entered.promise
  const restarted = observe(lifecycle.restart())
  await flush()
  assert.equal(errorName(first.error), 'LifecycleSupersededError', 'C-CMD-11: restart during starting supersedes start() callers')
  assert.equal(restarted.status, 'resolved')
  assert.deepEqual(trace, [ 'start 1', 'first start interrupted', 'start 2' ])
  await shutdown(lifecycle)
})

contract('C-CMD-11.c', 'restart() retires the running generation gracefully before a start() that joins the replacement', {}, async ({ make }) => {
  const trace: string[] = []
  let current: LifecycleScope | undefined
  const { lifecycle } = make({
    onStart (scope) {
      current = scope
      trace.push('start')
      scope.defer(() => { trace.push('release') })
    },
    onStop () {
      trace.push(`stop (signal aborted: ${current!.signal.aborted})`)
    },
  })
  await lifecycle.start()
  const generation = lifecycle.state.generation
  const restarted = observe(lifecycle.restart())
  const joined = observe(lifecycle.start())
  await flush()
  assert.equal(restarted.status, 'resolved')
  assert.equal(joined.status, 'resolved')
  assert.deepEqual(trace, [ 'start', 'stop (signal aborted: false)', 'release', 'start' ])
  assert.equal(lifecycle.state.generation, generation + 1)
  await shutdown(lifecycle)
})

contract('C-CMD-16.a', 'a throwing whenState predicate rejects only its own wait', {}, async ({ make }) => {
  const { lifecycle } = make({ onStart () {} })
  const bad = observe(lifecycle.whenState(() => { throw new Error('predicate failed') }))
  const good = observe(lifecycle.whenState(state => state.kind === 'running'))
  await flush()
  assert.equal(bad.status, 'rejected')
  assert.match(String((bad.error as Error).message), /predicate failed/)

  await lifecycle.start()
  await flush()
  assert.equal(good.status, 'resolved')
  await shutdown(lifecycle)
})
