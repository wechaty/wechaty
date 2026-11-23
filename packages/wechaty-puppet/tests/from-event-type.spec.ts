#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import {
  test,
  AssertEqual,
}               from 'tstest'

import {
  Observable,
  firstValueFrom,
  fromEvent as rxFromEvent,
}                             from 'rxjs'
import type {
  FromEvent,
}                             from 'typed-emitter/rxjs'
// import type {
//   JQueryStyleEventEmitter,
// } from 'rxjs/internal/observable/fromEvent.js'

import type {
  EventScanPayload,
}                         from '../src/schemas/mod.js'
import {
  ScanStatus,
}                         from '../src/mods/types.js'

import { PuppetTest } from './fixtures/puppet-test/puppet-test.js'

/**
 * Huan(202111): fromEvent + typed-emitter/rxjs
 * @see https://github.com/andywer/typed-emitter/pull/19
 */
const fromEvent: FromEvent = rxFromEvent

// test('Puppet satisfy DOM EventTarget: HasEventTargetAddRemove', async t => {
//   const puppet = new PuppetTest()

//   // Huan(202110): do not use `tsd` module because the TypeScript version conflict
//   //  - https://github.com/SamVerschueren/tsd/issues/122
//   //
//   // expectAssignable<
//   //   JQueryStyleEventEmitter<
//   //     any,
//   //     EventScanPayload | EventLoginPayload
//   //   >
//   // >(puppet)

//   const target: JQueryStyleEventEmitter<
//     any,
//     EventScanPayload | EventLoginPayload
//   > = puppet
//   void target
//   t.pass('expectAssignable match listener argument typings')
// })

test('RxJS: fromEvent type inference', async t => {
  const puppet = new PuppetTest()

  /**
   * Issue #96: Add Typing support for RxJS fromEvent
   *  - https://github.com/wechaty/wechaty-puppet/issues/96
   *
   */
  const event$ = fromEvent(puppet, 'scan')

  const typeTest: AssertEqual<Observable<EventScanPayload>, typeof event$> = true
  t.ok(typeTest, 'should be equal type')

  const future = firstValueFrom(event$)
  const payload: EventScanPayload = {
    status: ScanStatus.Unknown,
  }
  puppet.emit('scan', payload)

  const result = await future
  const typeTest2: AssertEqual<EventScanPayload, typeof result> = true
  t.ok(typeTest2, 'should be equal type')

  t.same(result, payload, 'should get scan payload')
})
