#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/* eslint-disable func-call-spacing */

import { test }  from 'tstest'

import {
  TestScheduler,
}                     from 'rxjs/testing'
import {
  throttleTime,
}                     from 'rxjs/operators'
import PuppetMock     from 'wechaty-puppet-mock'

import {
  Duck as PuppetDuck,
}                     from 'wechaty-redux'

import {
  epicRecoverReset$,
  epicRecoverDing$,
  monitorHeartbeat$,
}                     from './epic-recover.js'

/**
 * RxJS Marble Testing
 *
 *  - https://rxjs.dev/guide/testing/marble-testing
 *  - https://github.com/ReactiveX/rxjs/blob/master/docs_app/content/guide/testing/marble-testing.md
 *
 */
test('Example: marble testing', async t => {
  const testScheduler = new TestScheduler(t.same)

  testScheduler.run(helpers => {
    const { cold, time, expectObservable, expectSubscriptions } = helpers
    const e1       = cold('-a--b--c---|')
    const e1subs   = '     ^----------!'
    const t        = time('---|        ')  // t = 3
    const expected = '     -a-----c---|'

    expectObservable(e1.pipe(throttleTime(t))).toBe(expected)
    expectSubscriptions(e1.subscriptions).toBe(e1subs)
  })
})

test('Example 2: marble subscribe time frame testing', async t => {
  const testScheduler = new TestScheduler(t.same)

  testScheduler.run(helpers => {
    const { hot, expectObservable, expectSubscriptions } = helpers
    const source = hot('  --a--b--c--d--e--f')
    const subscription = '-----^------!-'
    const expected = '    -----b--c--d--'
    expectObservable(source, subscription).toBe(expected)
    void expectSubscriptions
    // expectSubscriptions(source.subscriptions).toBe(subscription)
  })
})

test('Example 3: subscribe with unsubscribe / complete', async t => {
  const testScheduler = new TestScheduler(t.same)

  testScheduler.run(({ hot, expectObservable }) => {
    const values = {
      a: 0,
      b: 1,
      c: 2,
    }
    const source = hot('   10ms a 9ms  b 9ms  c-|', values)
    const subscription1 = '       20ms ^ 9ms  -!-'
    const subscription2 = '              30ms ^--'
    const expected1 = '           20ms b 9ms  c--'
    const expected2 = '                  30ms c-|'
    expectObservable(source, subscription1).toBe(expected1, values)
    expectObservable(source, subscription2).toBe(expected2, values)
  })
})

test('Example 4: play ground', async t => {
  const testScheduler = new TestScheduler(t.same)

  testScheduler.run(helpers => {
    const { hot, cold, expectObservable } = helpers
    void hot
    void cold
    const TIMEOUT = 15
    const source    = hot(`-----a-----h------h ${TIMEOUT}ms --`)
    const sub       = `    ------^-------!---- ${TIMEOUT}ms --`
    const expected  = `    -----------h------- ${TIMEOUT}ms --`

    expectObservable(source, sub).toBe(expected)
  })
})

test('monitorHeartbeat$() emit once after lost heartbeat', async t => {
  const testScheduler = new TestScheduler(t.same)

  const puppet = new PuppetMock()

  const TIMEOUT = 15

  testScheduler.run(helpers => {
    const { hot, expectObservable, expectSubscriptions } = helpers

    const marble = {
      a: PuppetDuck.actions.STATE_ACTIVATED_EVENT   (puppet.id, true),
      d: PuppetDuck.actions.DONG_RECEIVED_EVENT     (puppet.id, { data: 'dong' }),
      e: PuppetDuck.actions.ERROR_RECEIVED_EVENT    (puppet.id, { gerror: `monitorHeartbeat$() TIMEOUT(${TIMEOUT})` }),
      h: PuppetDuck.actions.HEARTBEAT_RECEIVED_EVENT(puppet.id, { data: 'heartbeat' }),
    }

    const puppet$ = hot(` -a----h----h ${TIMEOUT}ms       ${TIMEOUT}ms ${TIMEOUT}ms ${TIMEOUT - 1}ms h ${TIMEOUT}ms       ${TIMEOUT - 1}ms d ${TIMEOUT}ms       ------`, marble)
    const subscription = `^----------- ${TIMEOUT}ms       ${TIMEOUT}ms ${TIMEOUT}ms ${TIMEOUT}ms       ${TIMEOUT}ms       ${TIMEOUT}ms       ${TIMEOUT}ms       -----!`
    const expected  = `   ------------ ${TIMEOUT - 1}ms e ${TIMEOUT}ms ${TIMEOUT}ms ${TIMEOUT}ms       ${TIMEOUT - 1}ms e ${TIMEOUT}ms       ${TIMEOUT - 1}ms e ------`

    expectObservable(
      monitorHeartbeat$(TIMEOUT)(puppet$),
      subscription,
    ).toBe(expected, marble)

    void expectSubscriptions
    // expectSubscriptions(puppet$.subscriptions).toBe(sub)
  })
})

test('epicRecoverDing$() emit periodly', async t => {
  const testScheduler = new TestScheduler(t.same)

  const puppet = new PuppetMock()

  const TIMEOUT = 15

  testScheduler.run(helpers => {
    const { hot, expectObservable } = helpers

    const marble = {
      a: PuppetDuck.actions.STATE_ACTIVATED_EVENT   (puppet.id, true),
      d: PuppetDuck.actions.DONG_RECEIVED_EVENT     (puppet.id, { data: 'dong' }),
      h: PuppetDuck.actions.HEARTBEAT_RECEIVED_EVENT(puppet.id, { data: 'heartbeat' }),
      i: PuppetDuck.actions.DING_COMMAND           (puppet.id, 'epicRecoverDing$'),
    }

    const puppet$ = hot(` -a----h----h ${TIMEOUT}ms       ${TIMEOUT}ms       ${TIMEOUT}ms       ${TIMEOUT - 1}ms h ${TIMEOUT - 1}ms h ${TIMEOUT - 1}ms d ${TIMEOUT - 1}ms d ------`, marble)
    const subscription = `^----------- ${TIMEOUT}ms       ${TIMEOUT}ms       ${TIMEOUT}ms       ${TIMEOUT}ms       ${TIMEOUT}ms       ${TIMEOUT}ms       ${TIMEOUT}ms       -----!`
    const expected  = `   ------------ ${TIMEOUT - 1}ms i ${TIMEOUT - 1}ms i ${TIMEOUT - 1}ms i ${TIMEOUT}ms       ${TIMEOUT}ms       ${TIMEOUT}ms       ${TIMEOUT}ms       ------`

    expectObservable(
      epicRecoverDing$(TIMEOUT)(puppet$),
      subscription,
    ).toBe(expected, marble)
  })
})

test('epicRecoverReset$() emit periodly', async t => {
  const testScheduler = new TestScheduler(t.same)

  const puppet = new PuppetMock()

  const TIMEOUT = 60

  testScheduler.run(helpers => {
    const { hot, expectObservable } = helpers

    const marble = {
      a: PuppetDuck.actions.STATE_ACTIVATED_EVENT   (puppet.id, true),
      d: PuppetDuck.actions.DONG_RECEIVED_EVENT     (puppet.id, { data: 'dong' }),
      h: PuppetDuck.actions.HEARTBEAT_RECEIVED_EVENT(puppet.id, { data: 'heartbeat' }),
      r: PuppetDuck.actions.RESET_COMMAND          (puppet.id, 'epicRecoverReset$'),
    }

    const puppet$ = hot(` -a----h----h ${TIMEOUT}ms       ${TIMEOUT * 2}ms       ${TIMEOUT * 2}ms       ${TIMEOUT * 2 - 1}ms h ${TIMEOUT - 1}ms h ${TIMEOUT - 1}ms d ${TIMEOUT - 1}ms d ------`, marble)
    const subscription = `^----------- ${TIMEOUT}ms       ${TIMEOUT * 2}ms       ${TIMEOUT * 2}ms       ${TIMEOUT * 2}ms       ${TIMEOUT}ms       ${TIMEOUT}ms       ${TIMEOUT}ms       -----!`
    const expected  = `   ------------ ${TIMEOUT - 1}ms r ${TIMEOUT * 2 - 1}ms r ${TIMEOUT * 2 - 1}ms r ${TIMEOUT * 2}ms       ${TIMEOUT}ms       ${TIMEOUT}ms       ${TIMEOUT}ms       ------`

    expectObservable(
      epicRecoverReset$(TIMEOUT)(puppet$),
      subscription,
    ).toBe(expected, marble)
  })
})
