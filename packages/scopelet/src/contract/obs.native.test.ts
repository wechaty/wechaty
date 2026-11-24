/** Lifecycle contracts that subscribe to the native diagnostics channel. */
import assert from 'node:assert/strict'
import diagnosticsChannel from 'node:diagnostics_channel'

import type { Lifecycle, LifecycleState } from '../types.ts'
import { flush, observe } from './harness.ts'
import { contract } from './suite.ts'

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

contract('C-OBS-01.b', 'each commit publishes its diagnostics record before calling onStateChange', {}, async ({ make, impl }) => {
  const order: string[] = []
  let lifecycle!: Lifecycle
  const subscriber = () => { order.push(`diagnostic:${lifecycle.state.kind}`) }
  diagnosticsChannel.subscribe(impl.diagnosticsChannel, subscriber)
  try {
    ;({ lifecycle } = make({ onStart () {}, onStateChange (state) { order.push(`observer:${state.kind}`) } }))
    await lifecycle.start()
    await lifecycle.stop()
    assert.deepEqual(order, [ 'starting', 'running', 'stopping', 'stopped' ].flatMap(kind => [ `diagnostic:${kind}`, `observer:${kind}` ]))
  } finally {
    diagnosticsChannel.unsubscribe(impl.diagnosticsChannel, subscriber)
  }
})
