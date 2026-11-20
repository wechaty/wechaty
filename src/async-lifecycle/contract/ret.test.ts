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
 * Contract tests for retirement (README §7, C-RET-*).
 */

import assert from 'node:assert/strict'

import type { LifecycleScope } from '../types.ts'
import { flush, observe, shutdown } from './harness.ts'
import { contract } from './suite.ts'

contract('C-RET-01.a', 'retirement order: onStop, abort, the task finishes with live resources, then releases newest first', {}, async ({ make }) => {
  const taskEntered = Promise.withResolvers<void>()
  const order: string[] = []
  const { lifecycle } = make({
    onStart (scope) {
      scope.defer(() => { order.push('close transport') })
      scope.defer(() => { order.push('release subscription') })
      const ioCanceled = Promise.withResolvers<void>()
      scope.signal.addEventListener('abort', () => {
        order.push('interrupt I/O')
        ioCanceled.resolve()
      }, { once: true })
      scope.spawn(async () => {
        taskEntered.resolve()
        await ioCanceled.promise
        await Promise.resolve()
        order.push('finish task using transport')
      })
    },
    onStop () { order.push('graceful goodbye') },
  })
  await lifecycle.start()
  await taskEntered.promise
  const disposed = observe(lifecycle[Symbol.asyncDispose]())
  await flush()
  assert.equal(disposed.status, 'resolved')
  assert.deepEqual(order, [
    'graceful goodbye', 'interrupt I/O', 'finish task using transport', 'release subscription', 'close transport',
  ])
})

contract('C-RET-02.a', 'a throwing onStop is a cleanup error: other releases still run, and the value is kept as given', {}, async ({ make }) => {
  let released = false
  const { lifecycle } = make({
    onStart (scope) { scope.defer(() => { released = true }) },
    onStop () { throw null }, // falsy failures must survive as themselves
  })
  await lifecycle.start()
  const stopped = observe(lifecycle.stop())
  await flush()
  assert.equal(stopped.status, 'rejected')
  assert.equal(stopped.error, null)
  assert.equal(released, true)
  assert.ok(lifecycle.state.kind === 'failed')
  assert.equal(lifecycle.state.phase, 'stop')
  assert.equal(lifecycle.state.error, null)
  assert.equal(lifecycle.state.cleanupComplete, true, 'onStop is never retried, so nothing stays owned')
  const retried = await shutdown(lifecycle)
  assert.equal(retried.status, 'resolved')
  assert.equal(lifecycle.state.kind, 'stopped')
})

contract('C-RET-04.a', 'a release that fails during a runtime failure stays owned and the next stop() retries it', {}, async ({ make }) => {
  const reason = new Error('release failed')
  let tries = 0
  let current: LifecycleScope | undefined
  const { lifecycle } = make({
    onStart (scope) {
      current = scope
      scope.defer(() => {
        if (++tries === 1) {
          throw reason
        }
      })
    },
  })
  await lifecycle.start()
  current!.fail(new Error('runtime failure'))
  await flush()
  const failed = lifecycle.state
  assert.ok(failed.kind === 'failed')
  assert.equal(failed.phase, 'run')
  assert.equal(failed.cleanupError, reason, 'C-RET-04: a single cleanup error is reported as itself')
  assert.equal(failed.cleanupComplete, false)

  const stopped = observe(lifecycle.stop())
  await flush()
  assert.equal(stopped.status, 'resolved')
  assert.equal(tries, 2)
  assert.equal(lifecycle.state.kind, 'stopped')
})
