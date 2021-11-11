#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import {
  test,
  AssertEqual,
}               from 'tstest'

import {
  Observable,
  fromEvent,
  firstValueFrom,
}                 from 'rxjs'
import type {
  JQueryStyleEventEmitter,
} from 'rxjs/internal/observable/fromEvent.js'

import type {
  EventLoginPayload,
  EventScanPayload,
}                         from '../src/schemas/mod.js'
import {
  ScanStatus,
}                         from '../src/mods/type.js'

import { PuppetTest } from './fixtures/puppet-test/puppet-test.js'

test('Puppet satisfy DOM EventTarget: HasEventTargetAddRemove', async t => {
  const puppet = new PuppetTest()

  // Huan(202110): do not use `tsd` module because the TypeScript version conflict
  //  - https://github.com/SamVerschueren/tsd/issues/122
  //
  // expectAssignable<
  //   JQueryStyleEventEmitter<
  //     any,
  //     EventScanPayload | EventLoginPayload
  //   >
  // >(puppet)

  const target: JQueryStyleEventEmitter<
    any,
    EventScanPayload | EventLoginPayload
  > = puppet
  void target
  t.pass('expectAssignable match listener argument typings')
})

test('RxJS: fromEvent type inference', async t => {
  const puppet = new PuppetTest()

  /**
   * Issue #96: Add Typing support for RxJS fromEvent
   *  - https://github.com/wechaty/wechaty-puppet/issues/96
   *
   * FIXME(202106): get inference from on/off typings
   */
  const event$ = fromEvent<EventScanPayload>(puppet, 'scan')

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
