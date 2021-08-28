#!/usr/bin/env node --no-warnings --loader ts-node/esm

import { test }  from 'tstest'
import {
  expectType,
  expectAssignable,
}                   from 'tsd'

import {
  Observable,
  fromEvent,
  firstValueFrom,
}                 from 'rxjs'
import {
  JQueryStyleEventEmitter,
} from 'rxjs/internal/observable/fromEvent'

import {
  EventLoginPayload,
  EventScanPayload,
  ScanStatus,
}                         from '../src/mod.js'

import { PuppetTest } from './fixtures/puppet-test/puppet-test.js'

test('Puppet satisfy DOM EventTarget: HasEventTargetAddRemove', async t => {
  const puppet = new PuppetTest()
  expectAssignable<
    JQueryStyleEventEmitter<
      any,
      EventScanPayload | EventLoginPayload
    >
  >(puppet)

  t.pass('expectAssignable match listener argument typings')
})

test('RxJS: fromEvent type inference', async t => {
  const puppet = new PuppetTest()

  // FIXME(202106): get inference from on/off typings
  const event$ = fromEvent<EventScanPayload>(puppet, 'scan')
  expectType<Observable<EventScanPayload>>(event$)

  const future = firstValueFrom(event$)
  const payload: EventScanPayload = {
    status: ScanStatus.Unknown,
  }
  puppet.emit('scan', payload)

  const result = await future
  expectType<EventScanPayload>(result)
  t.same(result, payload, 'should get scan payload')
})
