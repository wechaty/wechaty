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
 * Unit tests of the generation scope (`generation.ts`) for what the contract
 * suite cannot see through the public API: the ledger a scope fills in.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'

import { createScope, Generation, type ScopeHost } from './generation.ts'

/** A host that records nothing: these tests never fail, recover or set conditions. */
const host: ScopeHost = {
  fail: () => {},
  recover: () => Promise.resolve('superseded'),
  lateRelease: (_generation, start) => { start().catch(() => {}) },
  setCondition: () => {},
}

async function flush (turns = 50): Promise<void> {
  for (let i = 0; i < turns; i++) {
    await Promise.resolve()
  }
}

test('a rejected acquire() creation leaves no ledger entry, so a retry loop does not grow the ledger (C-SCOPE-04)', async () => {
  const generation = new Generation(1)
  const scope = createScope(generation, host)
  for (let attempt = 0; attempt < 100; attempt++) {
    await scope.acquire(() => Promise.reject(new Error('offline')), () => {}).catch(() => {})
  }
  await flush()
  assert.equal(generation.ledger.clean, true, 'no failed attempt left an entry')

  await scope.acquire(() => 'socket', () => {})
  assert.equal(generation.ledger.clean, false, 'a successful acquisition stays owned')
})
