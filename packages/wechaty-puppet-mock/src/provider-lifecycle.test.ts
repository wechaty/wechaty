/**
 * Shared lifecycle checks for Puppet providers. The mock exercises the real
 * Puppet base, and the blocking fixture drives the two-hook startup contract
 * without a remote server or wall-clock delays.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { PuppetMock } from './puppet-mock.ts'

/** A provider whose startup waits until onStop releases it, as in Padlocal. */
class BlockingStartPuppet extends PuppetMock {

  #gate: {
    readonly entered: PromiseWithResolvers<void>
    readonly unblocked: PromiseWithResolvers<void>
  } | undefined

  stopCalls = 0

  /** Make the next start wait for provider teardown and report when it enters. */
  blockStartup (): Promise<void> {
    this.#gate = {
      entered: Promise.withResolvers<void>(),
      unblocked: Promise.withResolvers<void>(),
    }
    return this.#gate.entered.promise
  }

  /** Await early stop when this start has been gated. */
  override async onStart (signal?: AbortSignal): Promise<void> {
    const gate = this.#gate
    if (gate) {
      gate.entered.resolve()
      await gate.unblocked.promise
      signal?.throwIfAborted()
    }
    await super.onStart(signal)
  }

  /** Unblock the pending start while retiring its resources. */
  override async onStop (): Promise<void> {
    this.stopCalls++
    this.#gate?.unblocked.resolve()
    this.#gate = undefined
    await super.onStop()
  }

}

const providers = [
  { name: 'PuppetMock', create: () => new PuppetMock() },
  { name: 'Padlocal-style fixture', create: () => new BlockingStartPuppet() },
]

for (const { name, create } of providers) {
  test(`${name}: readiness is per generation and restart drains owned operations`, async t => {
    const puppet = create()
    const onStop = puppet.onStop.bind(puppet)
    let stopCalls = 0
    t.mock.method(puppet, 'onStop', async () => {
      stopCalls++
      await onStop()
    })

    const ready = puppet.ready()
    await puppet.start()
    const generation = puppet.state.generation
    puppet.login('first-user')
    puppet.emit('ready')
    await ready
    assert.equal(puppet.readyIndicator.value(), true)

    const work = Promise.withResolvers<void>()
    const interrupted = Promise.withResolvers<void>()
    const operation = puppet.operation(signal => {
      signal.addEventListener('abort', () => interrupted.resolve(), { once: true })
      return work.promise
    })

    const restarting = puppet.restart()
    await interrupted.promise
    assert.equal(stopCalls, 0)
    work.resolve()
    await operation
    await restarting

    assert.equal(stopCalls, 1)
    assert.equal(puppet.state.generation, generation + 1)
    assert.equal(puppet.isLoggedIn, false)
    assert.equal(puppet.readyIndicator.value(), false)
    const abandonedReady = assert.rejects(puppet.ready(), { name: 'LifecycleSupersededError' })
    await puppet.stop()
    await abandonedReady
    assert.equal(puppet.isStopped, true)
  })

  test(`${name}: a partial startup failure retains a failed release for retry`, async t => {
    const puppet = create()
    const startError = new Error('provider startup failed')
    const stopError = new Error('provider teardown failed')
    let allocated = false
    let stopCalls = 0
    t.mock.method(puppet, 'onStart', async () => {
      allocated = true
      throw startError
    })
    t.mock.method(puppet, 'onStop', async () => {
      if (++stopCalls === 1) {
        throw stopError
      }
      allocated = false
    })

    await assert.rejects(puppet.start(), error => error === startError)
    const failed = await puppet.whenState(state => state.kind === 'failed')
    assert.equal(failed.kind, 'failed')
    assert.equal(failed.cleanupComplete, false)
    assert.equal(failed.cleanupError, stopError)
    assert.equal(allocated, true)
    assert.equal(stopCalls, 1)
    await assert.rejects(puppet.executeOperation(() => {
      assert.fail('unreleased provider resources must not be used as idle resources')
    }), { name: 'LifecycleUnsafeStateError' })

    await puppet.stop()
    assert.equal(allocated, false)
    assert.equal(stopCalls, 2)
    assert.equal(puppet.isStopped, true)
  })
}

test('Padlocal-style fixture: stop unblocks startup exactly once', async () => {
  const puppet = new BlockingStartPuppet()
  const entered = puppet.blockStartup()
  const cancelled = assert.rejects(puppet.start(), { name: 'LifecycleSupersededError' })
  await entered

  assert.equal(puppet.isStarting, true)
  await assert.rejects(puppet.operation(async () => {
    assert.fail('public operation must wait for the running state')
  }), { name: 'LifecycleUnsafeStateError' })
  const startupSignal = await puppet.executeOperation(signal => signal)
  assert.equal(startupSignal?.aborted, false)

  await puppet.stop()
  await cancelled
  assert.equal(startupSignal?.aborted, true)
  assert.equal(puppet.stopCalls, 1)
  assert.equal(puppet.isStopped, true)
  await puppet.start()
  await puppet.stop()
})

test('PuppetMock skips deferred environment startup after immediate stop', async () => {
  const puppet = new PuppetMock()
  let environmentStarted = false
  puppet.mocker.use(() => {
    environmentStarted = true
    return () => {}
  })

  await puppet.start()
  await puppet.stop()
  await new Promise<void>(resolve => setTimeout(resolve, 0))
  assert.equal(environmentStarted, false)
})
