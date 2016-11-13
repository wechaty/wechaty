/**
 *
 * Wechaty: Wechat for Bot. and for human who talk to bot/robot
 *
 * Class Io
 * http://www.wechaty.io
 *
 * Licenst: ISC
 * https://github.com/zixia/wechaty
 *
 * Helper Class for Manage State Change
 */
import test from 'ava'

import { StateMonitor } from './state-monitor'

test('StateMonitor target/current & stable', t => {
  const CLIENT_NAME = 'StateMonitorTest'
  const sm = new StateMonitor<'A', 'B'>(CLIENT_NAME, 'A')

  t.is(sm.current(), 'A', 'current should be A')
  t.is(sm.target(), 'A', 'target should be A')
  t.true(sm.stable(), 'should be stable')

  sm.current('B')
  t.is(sm.current(), 'B', 'current should be B')
  t.is(sm.target(), 'A', 'target should still be A')
  t.true(sm.stable(), 'should be stable')

  sm.current('B', false)
  t.is(sm.current(), 'B', 'current should be B')
  t.is(sm.target(), 'A', 'target should still be A')
  t.false(sm.stable(), 'should be not stable')

  sm.target('B')
  sm.current('B')
  t.is(sm.target(), 'B', 'target should still be B')
  t.is(sm.current(), 'B', 'current should be B')
  t.true(sm.stable(), 'should be stable')

  sm.target('A')
  sm.current('A', false)
  t.is(sm.target(), 'A', 'target should still be A')
  t.is(sm.current(), 'A', 'current should be A')
  t.false(sm.stable(), 'should not be stable')
})

test('StateMonitor client & stable/inprocess', t => {
  const CLIENT_NAME = 'StateMonitorTest'
  const sm = new StateMonitor<'A', 'B'>(CLIENT_NAME, 'A')

  t.is(sm.client(), CLIENT_NAME, 'should get the same client name as init')

  sm.current('B')
  t.true(sm.stable(), 'should be stable')
  t.false(sm.inprocess(), 'should be not inprocess')

  sm.current('B', false)
  t.false(sm.stable(), 'should not be stable')
  t.true(sm.inprocess(), 'should be inprocess')

  sm.current('B', true)
  t.true(sm.stable(), 'should be stable')
  t.false(sm.inprocess(), 'should be not inprocess')
})

test('current() strict check with target', t => {
  const CLIENT_NAME = 'StateMonitorTest'
  const sm = new StateMonitor<'A', 'B'>(CLIENT_NAME, 'A')

  t.throws(() => sm.current('B'), Error, 'should thorw for unmatch current & target')

  sm.target('B')
  t.notThrows(() => sm.current('B'), 'should not throws for matched current & target')
})
