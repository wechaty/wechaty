#!/usr/bin/env node
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { AsyncLifecycleController } from './async-lifecycle.ts'

test('coalesces conflicting start/stop requests without duplicate startup', async () => {
  let startCount = 0
  let stopCount = 0
  let releaseStop = () => {}

  const stopGate = new Promise<void>(resolve => {
    releaseStop = resolve
  })

  const lifecycle = new AsyncLifecycleController({
    name: 'test-lifecycle',
    hooks: {
      start: async () => {
        startCount += 1
      },
      stop: async () => {
        stopCount += 1
        await stopGate
      },
    },
  })

  await lifecycle.start()

  const stopping = lifecycle.stop().then(
    () => undefined,
    error => error,
  )
  const start1 = lifecycle.start()
  const start2 = lifecycle.start()

  await new Promise(resolve => setImmediate(resolve))
  assert.equal(startCount, 1, 'should keep a single active generation before reconciliation')

  releaseStop()
  const stopError = await stopping
  assert.match(
    String((stopError as Error).message),
    /superseded/i,
    'older stop intent is superseded by newer start intent',
  )
  await Promise.all([ start1, start2 ])

  assert.equal(startCount, 1, 'should avoid redundant restart when newer intent remains running')
  assert.equal(stopCount, 0, 'should skip stop when it is superseded before execution')
  assert.equal(lifecycle.state.kind, 'running', 'should converge to the latest running intent')
})

test('explicit stop supersedes an older restart request', async () => {
  let startCount = 0
  let stopCount = 0
  let releaseStop = () => {}

  const stopGate = new Promise<void>(resolve => {
    releaseStop = resolve
  })

  const lifecycle = new AsyncLifecycleController({
    name: 'test-lifecycle',
    hooks: {
      start: async () => {
        startCount += 1
      },
      stop: async () => {
        stopCount += 1
        await stopGate
      },
    },
  })

  await lifecycle.start()

  const restarting = lifecycle.restart()
  await new Promise(resolve => setImmediate(resolve))
  const stopping = lifecycle.stop()

  releaseStop()
  await stopping
  await assert.rejects(restarting, /superseded/i, 'restart should not overrule a later explicit stop')

  assert.equal(startCount, 1, 'should not launch a replacement start after explicit stop')
  assert.equal(stopCount, 1, 'should stop exactly once')
  assert.equal(lifecycle.state.kind, 'stopped', 'should remain stopped after superseding restart')
})

test('stop during starting cancels startup and never publishes running', async () => {
  let startCount = 0
  let stopCount = 0

  const lifecycle = new AsyncLifecycleController({
    name: 'test-lifecycle',
    hooks: {
      start: async ({ signal }) => {
        startCount += 1
        await new Promise<void>((_resolve, reject) => {
          signal.addEventListener('abort', () => {
            const error = new Error('aborted')
            error.name = 'AbortError'
            reject(error)
          }, { once: true })
        })
      },
      stop: async () => {
        stopCount += 1
      },
    },
  })

  const starting = lifecycle.start()
  await new Promise(resolve => setImmediate(resolve))
  await lifecycle.stop()

  await assert.rejects(starting, /aborted|superseded/i, 'the canceled start request should reject')
  assert.equal(startCount, 1, 'should perform a single start attempt')
  assert.equal(stopCount, 1, 'should run cleanup once')
  assert.equal(lifecycle.state.kind, 'stopped', 'should not publish running after cancellation')
})

test('legacy active stable wait rejects after startup failure', async () => {
  const lifecycle = new AsyncLifecycleController({
    name: 'test-lifecycle',
    hooks: {
      start: async () => {
        throw new Error('boom')
      },
      stop: async () => {},
    },
  })

  await assert.rejects(lifecycle.start(), /boom/, 'start should reject with the startup error')
  await assert.rejects(
    lifecycle.legacyState.stable('active'),
    /boom/,
    'legacy active stable waits should reject after terminal startup failure',
  )
})
