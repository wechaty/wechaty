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
 * Unit tests for the ownership ledger: order, retry, join, late entries and
 * interrupts, independent of the engine.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'

import { Ledger } from './ledger.ts'

test('unwind releases newest first and empties the ledger', async () => {
  const ledger = new Ledger()
  const log: number[] = []
  for (const n of [ 1, 2, 3 ]) {
    ledger.add({ release: () => { log.push(n) } })
  }
  assert.deepEqual(await ledger.unwind(), [])
  assert.deepEqual(log, [ 3, 2, 1 ])
  assert.equal(ledger.clean, true)
  assert.equal(ledger.sealed, true)
})

test('a failed release is kept and retried by the next unwind only', async () => {
  const ledger = new Ledger()
  let calls = 0
  ledger.add({ release: () => { if (++calls === 1) { throw new Error('once') } } })
  ledger.add({ release: () => {} })
  const errors = await ledger.unwind()
  assert.equal(errors.length, 1)
  assert.equal(ledger.clean, false)
  assert.deepEqual(ledger.failures.map(e => (e as Error).message), [ 'once' ])
  assert.deepEqual(await ledger.unwind(), [])
  assert.equal(calls, 2)
  assert.equal(ledger.clean, true)
})

test('a non-retryable failure is reported once and dropped', async () => {
  const ledger = new Ledger()
  let calls = 0
  ledger.add({ release: () => { calls++; throw new Error('join') }, retryable: false })
  assert.equal((await ledger.unwind()).length, 1)
  assert.equal(ledger.clean, true)
  assert.deepEqual(await ledger.unwind(), [])
  assert.equal(calls, 1)
})

test('a sealed ledger refuses add() but tracks late releases', async () => {
  const ledger = new Ledger()
  ledger.seal()
  assert.equal(ledger.add({ release: () => {} }), false)
  const gate = Promise.withResolvers<void>()
  const late = ledger.addLate(() => gate.promise)
  assert.equal(ledger.clean, false)
  const unwinding = ledger.unwind()
  gate.resolve()
  await late
  assert.deepEqual(await unwinding, [])
  assert.equal(ledger.clean, true)
})

test('a running release is joined, not started twice', async () => {
  const ledger = new Ledger()
  const gate = Promise.withResolvers<void>()
  let calls = 0
  ledger.add({ release: () => { calls++; return gate.promise } })
  const first = ledger.unwind()
  const second = ledger.unwind()
  assert.equal(first, second, 'concurrent unwinds share one pass')
  gate.resolve()
  await first
  assert.equal(calls, 1)
})

test('interrupts run newest first, once, and their errors do not keep entries', async () => {
  const ledger = new Ledger()
  const log: string[] = []
  ledger.add({ release: () => {}, interrupt: () => { log.push('a') } })
  ledger.add({ release: () => {}, interrupt: () => { log.push('b'); throw new Error('b') } })
  assert.equal(ledger.interrupt().length, 1)
  assert.deepEqual(ledger.interrupt(), [])
  assert.deepEqual(log, [ 'b', 'a' ])
  await ledger.unwind()
  assert.equal(ledger.clean, true)
})

test('an unwind applies its retry and join policy to entries added while it waits', async () => {
  const ledger = new Ledger()
  const blocking = Promise.withResolvers<void>()
  const lateGate = Promise.withResolvers<void>()
  ledger.add({ release: () => blocking.promise })
  let unwound = false
  const pass = ledger.unwind({ retry: new Set(), joinRunning: false }).then(errors => { unwound = true; return errors })
  await Promise.resolve()
  let failedCalls = 0
  ledger.addLate(() => { failedCalls++; throw new Error('late failure') }).catch(() => {})
  ledger.addLate(() => lateGate.promise).catch(() => {})
  blocking.resolve()
  for (let i = 0; i < 20; i++) {
    await Promise.resolve()
  }
  assert.equal(unwound, true, 'a running entry added meanwhile is not joined (joinRunning: false)')
  assert.equal(failedCalls, 1, 'a failed entry added meanwhile is not retried (retry: none)')
  assert.deepEqual(await pass, [])
  lateGate.resolve()
})
