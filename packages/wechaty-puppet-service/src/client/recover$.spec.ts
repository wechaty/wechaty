#!/usr/bin/env ts-node

import { test }  from 'tstest'

// import {
//   TestScheduler,
//   hot, expectObservable, expectSubscriptions, cold

// }                     from 'rxjs/testing'

import {
  switchSuccess,
}                     from './recover$'

test('switchSuccess()', async t => {
  t.equal(switchSuccess(true), true, 'should get expected result for boolean `true`')
  t.equal(switchSuccess('pending'), false, 'should get expected result for `pending`')
})

// test('switchSuccess()', async t => {
//   const SOURCE_MARBLES   = '-a-'
//   const EXPECTED_MARBLES = '-a-'

//   const scheduler = new TestScheduler((actual, expected) => {
//     t.deepEqual(actual, expected)
//     console.info('actual', actual)
//     console.info('expected', expected)
//   })

//   scheduler.expectObservable(observable).toBe(expectedMarbles);
//   scheduler.flush();
// })
