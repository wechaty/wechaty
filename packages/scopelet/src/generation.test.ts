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
 * suite cannot see through the public API: the ledger a scope fills in, and
 * child ownership shared across two installed copies of the module (D21).
 */

import assert from 'node:assert/strict'
import { cpSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'

import { createLifecycle } from './create-lifecycle.ts'
import { defaultClock } from './clock.ts'
import type { LifecycleScope } from './types.ts'
import { LifecycleUnsafeStateError } from './errors.ts'

import { createScope, Generation, OWNED_CHILDREN_KEY, ownedChildren, type ScopeHost } from './generation.ts'

/** A host that records nothing: these tests never fail, recover or set conditions. */
const host: ScopeHost = {
  fail: () => {},
  recover: () => 'superseded',
  lateRelease: (_generation, start) => { start().catch(() => {}) },
  setCondition: () => {},
  condition: (_generation, name) => ({
    name,
    isSet: false,
    wait: () => Promise.resolve(),
    when: () => Promise.resolve(),
    whenClear: () => Promise.resolve(),
    set: () => {},
    clear: () => {},
  }),
  clock: defaultClock,
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

test('two installed copies share one child-ownership registry, so only one parent can own a child (C-CHILD-02, D21)', async () => {
  // A second copy of the module's source files is a second module instance,
  // as when `wechaty` and `wechaty-puppet` each install their own copy.
  const dir = mkdtempSync(join(tmpdir(), 'scopelet-copy-'))
  try {
    cpSync(import.meta.dirname!, dir, {
      recursive : true,
      // Relative to the module, so a checkout path that happens to contain
      // these words does not filter out everything.
      filter    : source => {
        const path = relative(import.meta.dirname!, source)
        return !path.startsWith('contract') && !path.startsWith('examples') && !path.endsWith('.test.ts')
      },
    })
    const copy = await import(pathToFileURL(join(dir, 'mod.ts')).href) as typeof import('./mod.ts')
    assert.notEqual(copy.createLifecycle, createLifecycle, 'a separate module instance')

    const child = createLifecycle({ onStart () {} })
    // Read through a call: an assertion would narrow `child.state` statically.
    const kind = () => child.state.kind
    let ownerScope: LifecycleScope | undefined
    let otherScope: import('./mod.ts').LifecycleScope | undefined
    const owner = createLifecycle({ onStart (scope) { ownerScope = scope } })
    const other = copy.createLifecycle({ onStart (scope) { otherScope = scope } })
    await owner.start()
    await other.start()

    // Both claims in one synchronous block: the child still reads `stopped`
    // for the second one, so only the shared registry can refuse it.
    const claimed = ownerScope!.start(child)
    const refused = otherScope!.start(child).then(() => undefined, (error: unknown) => error)
    await claimed
    const error = await refused
    assert.ok(error instanceof copy.LifecycleUnsafeStateError, 'the other copy sees the child as owned')
    assert.ok(!(error instanceof LifecycleUnsafeStateError), 'each copy has its own error classes')
    assert.match((error as Error).message, /already owned/)
    assert.equal(kind(), 'running')

    // Released by its owner's stop, the child can be claimed through the other copy.
    await owner.stop()
    assert.equal(kind(), 'stopped')
    await otherScope!.start(child)
    assert.equal(kind(), 'running')
    await other.stop()
    assert.equal(kind(), 'stopped')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('the ownership registry is created once, hidden, and never replaced by a foreign value (D21)', () => {
  const realm: Record<symbol, unknown> = {}
  const registry = ownedChildren(realm)
  assert.equal(ownedChildren(realm), registry, 'the second copy gets the first copy\'s registry')
  const property = Object.getOwnPropertyDescriptor(realm, OWNED_CHILDREN_KEY)
  assert.deepEqual([ property?.enumerable, property?.writable, property?.configurable ], [ false, false, false ])

  const foreign = { has: () => true }
  const other: Record<symbol, unknown> = { [OWNED_CHILDREN_KEY]: foreign }
  const kept = ownedChildren(other)
  assert.ok(kept instanceof WeakSet, 'a private registry instead of the foreign value')
  assert.notEqual(kept as unknown, foreign)
  assert.equal(other[OWNED_CHILDREN_KEY], foreign, 'the foreign value is left alone')
})

test('a frozen global gets a private ownership registry instead of failing to load (D21)', () => {
  const frozen: Record<symbol, unknown> = Object.freeze({})
  const registry = ownedChildren(frozen)
  assert.ok(registry instanceof WeakSet)
  assert.equal(Object.hasOwn(frozen, OWNED_CHILDREN_KEY), false)
})

test('a task that ends cleanly drops its join entry, so many short tasks do not grow the ledger (C-COMP-03)', async () => {
  const generation = new Generation(1)
  const scope = createScope(generation, host)
  for (let i = 0; i < 1_000; i++) {
    scope.spawn(async () => {})
  }
  await flush()
  assert.equal(generation.ledger.clean, true, 'no entry is left for 1,000 finished tasks')
  const failing = new Error('task failed')
  scope.spawn(async () => { throw failing })
  await flush()
  assert.equal(generation.ledger.clean, false, 'the failed task keeps its entry')
  generation.sealed = true
  assert.deepEqual(await generation.ledger.unwind(), [], 'a live failure goes to the host, not the unwind')
  assert.equal(generation.ledger.clean, true)
})

