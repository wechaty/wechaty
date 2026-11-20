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
 * Tests for the contract-suite harness itself: every contract test relies on
 * the manual clock, the promise observer and the expected-failure runner
 * behaving exactly as documented in `./harness.ts`.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { expectFailure, flush, ManualClock, observe } from './harness.ts'

test('ManualClock fires due timers in time order, ties in creation order, and nothing early', async () => {
  const clock = new ManualClock()
  const fired: string[] = []
  clock.setTimeout(() => fired.push('b@20'), 20)
  clock.setTimeout(() => fired.push('a@10'), 10)
  clock.setTimeout(() => fired.push('c@20'), 20)

  await clock.advance(9)
  assert.deepEqual(fired, [])
  assert.equal(clock.now(), 9)

  await clock.advance(11)
  assert.deepEqual(fired, [ 'a@10', 'b@20', 'c@20' ])
  assert.equal(clock.now(), 20)
  assert.equal(clock.pending, 0)
})

test('ManualClock fires a timer scheduled by a callback within the same advance, at its own time', async () => {
  const clock = new ManualClock()
  const fired: number[] = []
  clock.setTimeout(() => {
    fired.push(clock.now())
    clock.setTimeout(() => fired.push(clock.now()), 5)
  }, 10)
  await clock.advance(20)
  assert.deepEqual(fired, [ 10, 15 ])
})

test('ManualClock arms a timer queued in a microtask before advance() at the current time', async () => {
  // Like `lifecycle.start(); await clock.advance(100)`: the kernel arms its
  // deadline in a microtask after the command returns.
  const clock = new ManualClock()
  let fired = false
  queueMicrotask(() => { clock.setTimeout(() => { fired = true }, 100) })
  await clock.advance(100)
  assert.equal(fired, true)
  assert.equal(clock.now(), 100)
})

test('ManualClock.jump moves time without firing timers; the next advance fires them', async () => {
  const clock = new ManualClock()
  let fired = false
  clock.setTimeout(() => { fired = true }, 10)
  clock.jump(30)
  assert.equal(clock.now(), 30)
  assert.equal(fired, false, 'a blocked thread lets no timer run')
  await clock.advance(0)
  assert.equal(fired, true)
})

test('ManualClock clearTimeout cancels a timer', async () => {
  const clock = new ManualClock()
  let fired = false
  const handle = clock.setTimeout(() => { fired = true }, 1)
  clock.clearTimeout(handle)
  await clock.advance(10)
  assert.equal(fired, false)
  assert.equal(clock.pending, 0)
})

test('ManualClock lets the code under test react between timers', async () => {
  const clock = new ManualClock()
  const order: string[] = []
  clock.setTimeout(() => { void Promise.resolve().then(() => order.push('reaction to first')) }, 1)
  clock.setTimeout(() => order.push('second'), 2)
  await clock.advance(2)
  assert.deepEqual(order, [ 'reaction to first', 'second' ])
})

test('observe reports pending, resolved and rejected without awaiting, and handles the rejection', async () => {
  const pending = observe(new Promise(() => {}))
  const resolved = observe(Promise.resolve(42))
  const failure = new Error('no')
  const rejected = observe(Promise.reject(failure))
  await flush()
  assert.equal(pending.status, 'pending')
  assert.equal(resolved.status, 'resolved')
  assert.equal(resolved.value, 42)
  assert.equal(rejected.status, 'rejected')
  assert.equal(rejected.error, failure)
})

test('observe keeps a falsy rejection value distinguishable from success', async () => {
  const rejected = observe(Promise.reject(undefined))
  await flush()
  assert.equal(rejected.status, 'rejected')
  assert.equal(rejected.error, undefined)
})

test('expectFailure passes when the body fails, and fails when it unexpectedly passes', async () => {
  await expectFailure(async () => { assert.equal(1, 2) }, 'B0 example')
  await assert.rejects(
    expectFailure(async () => {}, 'B0 example'),
    /expected this test to fail \(B0 example\), but it passed/,
  )
})
