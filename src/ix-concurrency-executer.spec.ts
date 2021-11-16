#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import {
  test,
  sinon,
}             from 'tstest'

import { concurrencyTaskExecuter } from './ix-concurrency-executer.js'

test('concurrencyTaskExecuter() smoke testing', async t => {
  const sandbox = sinon.createSandbox({
    useFakeTimers: true,
  })

  const INPUT_LIST  = [1, 2, 3, 4, 5, 6, 7, 8, 9]
  const CONCURRENCY = 2
  const SLEEP_MS    = 10

  const task = async (v: number) => {
    await new Promise(resolve => setTimeout(resolve, SLEEP_MS))
    return v * 10
  }

  const iterator = concurrencyTaskExecuter(
    CONCURRENCY,
  )(
    task,
  )(
    INPUT_LIST,
  )

  const outputList: number[] = []

  ;(async () => {
    for await (const item of iterator) {
      outputList.push(item)
    }
  })().catch(e => t.fail(e))

  for (let i = 0; i < 3; i++) {
    t.equal(outputList.length, i * CONCURRENCY, 'should has ' + i * CONCURRENCY + ' output item(s) after ' + i + ' iteration(s)')
    await sandbox.clock.tickAsync(SLEEP_MS + 1)
  }

  t.pass('smoke testing passed')

  sandbox.restore()
})
