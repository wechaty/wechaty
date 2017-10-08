#!/usr/bin/env ts-node

// tslint:disable:no-shadowed-variable
import * as test  from 'blue-tape'
import * as sinon from 'sinon'
const sinonTest   = require('sinon-test')(sinon)

// import { log }  from './config'
// log.level('silly')

import {
  Watchrat,
  WatchratFood,
}             from './watchrat'

test('starve to death', sinonTest(async function(t) {
  const TIMEOUT = 1 * 1000
  const EXPECTED_FOOD = {
    data    : 'dummy',
    timeout : TIMEOUT,
  } as WatchratFood

  const watchrat = new Watchrat('TestWatchrat', TIMEOUT)
  watchrat.on('reset', (food, left) => {
    t.equal(left, 0, 'timeLeft should equal to 0 when reset')
    t.deepEqual(food, EXPECTED_FOOD, 'should get food back when reset')
  })
  watchrat.feed(EXPECTED_FOOD)

  this.clock.tick(TIMEOUT + 1)

  t.end()
}))

test('feed in the middle', sinonTest(async function(t) {
  // console.log('this', this)
  const TIMEOUT   = 1 * 1000
  const FEED_TIME = 0.3 * 1000

  const watchrat = new Watchrat('TestWatchrat', TIMEOUT)
  watchrat.on('reset', () => {
    t.fail('should not be reset')
  })
  watchrat.feed({ data: 'dummy' })

  this.clock.tick(FEED_TIME)
  const left = watchrat.feed({ data: 'dummy' })
  t.equal(left, TIMEOUT - FEED_TIME, 'should get the time left dependes on the FEED_TIME')

  t.end()
}))

test('sleep()', sinonTest(async function(t) {
  const TIMEOUT   = 1 * 1000
  const FEED_TIME = 0.3 * 1000

  const watchrat = new Watchrat('TestWatchrat', TIMEOUT)
  watchrat.on('reset', () => {
    t.fail('should not be reset')
  })
  watchrat.feed({ data: 'dummy' })

  this.clock.tick(FEED_TIME)
  watchrat.sleep()

  this.clock.tick(TIMEOUT * 2)

  const left = watchrat.left()
  t.ok(left < 0, 'time should already passed by...')

  t.end()
}))
