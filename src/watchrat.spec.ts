#!/usr/bin/env ts-node

// tslint:disable:no-shadowed-variable
import * as test  from 'blue-tape'
import * as sinon from 'sinon'
const sinonTest   = require('sinon-test')(sinon)

// import { log }  from './config'
// log.level('silly')

import WatchRat from './watchrat'

test('starve to death', sinonTest(async function(t) {
  const TIMEOUT = 1 * 1000
  const watchrat = new WatchRat(TIMEOUT)
  watchrat.on('timeout', (timeout, food) => {
    t.equal(timeout, TIMEOUT, 'timeout should equal to the constructor param')
    t.notOk(food, 'should no food when we did not feed watchrat')
  })
  watchrat.feed()

  this.clock.tick(TIMEOUT + 1)

  watchrat.kill()
  await watchrat.death()

  t.end()
}))

test.only('feed in the middle', sinonTest(async function(t) {
  // console.log('this', this)
  const TIMEOUT   = 1 * 1000
  const FEED_TIME = 0.3 * 1000

  const watchrat = new WatchRat(TIMEOUT)
  watchrat.on('timeout', (timeout, food) => {
    t.fail('should not timeout')
  })
  watchrat.feed()

  this.clock.tick(FEED_TIME)
  let timeLeft = watchrat.feed()
  t.equal(timeLeft, TIMEOUT - FEED_TIME, 'should get the time left dependes on the FEED_TIME')

  timeLeft = watchrat.kill()
  await watchrat.death()

  t.end()
}))
