#!/usr/bin/env ts-node

// tslint:disable:no-shadowed-variable
import * as test  from 'blue-tape'
import * as sinon from 'sinon'
// const sinonTest   = require('sinon-test')(sinon)

import {
  Observable,
  // TestScheduler,
}                 from 'rxjs/Rx'

// import { log }  from './config'
// log.level('silly')

import RxQueue from './rx-queue'

test('delay', async function (t) {
  const spy = sinon.spy()
  const DELAY_TIME = 100
  const delayQueue = new RxQueue('delay', DELAY_TIME)

  delayQueue.init()

  delayQueue.on('o', spy)

  const startTime = Date.now()
  for (let i = 0; i < 2; i++) {
    delayQueue.emit('i', i)
  }

  const END_CHIPER = 'chiper123'
  const wait = new Promise(r => delayQueue.on('o', val => val === END_CHIPER ? r() : ''))
  delayQueue.emit('i', END_CHIPER)
  await wait

  // TODO: use fake timer / TestScheduler to do this
  const duration = Math.round((Date.now() - startTime) / 100) * 100
  const EXPECT_DURATION = DELAY_TIME * 2
  t.equal(duration, EXPECT_DURATION, 'should delayed all message')

  t.ok(spy.calledThrice, 'should received 3 calls')
  t.deepEqual(spy.args[0][0], 0, 'should received 0')
  t.deepEqual(spy.args[1][0], 1, 'should received 1')
  t.deepEqual(spy.args[2][0], END_CHIPER, 'should received CHIPER')
})

test('throttle', async function (t) {
  const spy = sinon.spy()
  const THROTTLE_TIME = 50
  const GENERATED_NUM = 7
  const GENERATED_INTERVAL = 30
  const throttleQueue = new RxQueue('throttle', THROTTLE_TIME)

  throttleQueue.init()

  throttleQueue.on('o', spy)

  const startTime = Date.now()

  const wait = new Promise(resolve => {
    Observable
      .interval(GENERATED_INTERVAL)
      .take(GENERATED_NUM)
      .subscribe(x => {
        // console.log('x', x, Date.now() - startTime)
        throttleQueue.emit('i', x)
        if (x === GENERATED_NUM - 1) {
          resolve()
        }
      })
  })
  await wait

  // TODO: use fake timer / TestScheduler to do this
  const duration = Math.round((Date.now() - startTime) / 100) * 100
  const EXPECT_DURATION = Math.round(GENERATED_NUM * GENERATED_INTERVAL / 100) * 100
  t.equal(duration, EXPECT_DURATION, 'should cost time as expectation')

  const EXPECTED_O_NUM = Math.floor((GENERATED_NUM * GENERATED_INTERVAL) / THROTTLE_TIME)
  t.equal(spy.callCount, EXPECTED_O_NUM, 'should received EXPECTED_O_NUM calls')
  t.equal(spy.args[0][0], 0, 'should received 0')
  t.equal(spy.args[1][0], 2, 'should received 2')
  t.equal(spy.args[2][0], 4, 'should received 4')
})

test('debounce', async function (t) {
  const spy = sinon.spy()
  const DEBOUNCE_TIME = 30
  const GENERATED_NUM = 5
  const GENERATED_INTERVAL = 10
  const debounceQueue = new RxQueue('debounce', DEBOUNCE_TIME)

  debounceQueue.init()

  debounceQueue.on('o', spy)

  const startTime = Date.now()

  const wait = new Promise(resolve => {
    Observable
      .interval(GENERATED_INTERVAL)
      .take(GENERATED_NUM)
      .subscribe(x => {
        // console.log('x', x, Date.now() - startTime)
        debounceQueue.emit('i', x)
        if (x === GENERATED_NUM - 1) {
          setTimeout(resolve, DEBOUNCE_TIME + 1)
        }
      })
  })
  await wait

  // TODO: use fake timer / TestScheduler to do this
  const duration        = Math.round((Date.now() - startTime) / 100) * 100
  const EXPECT_DURATION = Math.round((GENERATED_NUM * GENERATED_INTERVAL + DEBOUNCE_TIME) / 100) * 100
  t.equal(duration, EXPECT_DURATION, 'should cost time as expectation')

  const EXPECTED_O_NUM = 1
  t.equal(spy.callCount, EXPECTED_O_NUM, 'should received EXPECTED_O_NUM calls')
  t.deepEqual(spy.args[0][0], GENERATED_NUM - 1, 'should received GENERATED_NUM - 1')
})
