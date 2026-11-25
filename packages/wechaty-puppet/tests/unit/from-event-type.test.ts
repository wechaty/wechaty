/**
 * Type and runtime tests for RxJS `fromEvent()` on the typed puppet event emitter.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

/** Type-level equality check, as tstest's `AssertEqual` did. */
type AssertEqual<T, Expected> = T extends Expected ? (Expected extends T ? true : false) : false

import {
  Observable,
  firstValueFrom,
  fromEvent as rxFromEvent,
}                             from 'rxjs'
import type {
  FromEvent,
}                             from 'typed-emitter/rxjs/index.js'
// import type {
//   JQueryStyleEventEmitter,
// } from 'rxjs/internal/observable/fromEvent.js'

import type {
  EventScanPayload,
}                         from '../../src/schemas/mod.ts'
import type {
  PuppetCustomEvent,
}                         from '../../src/puppet/events.ts'
import {
  ScanStatus,
}                         from '../../src/mods/types.ts'

import { PuppetTest } from '../fixtures/puppet-test/puppet-test.ts'

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
//   assert.ok(true, 'expectAssignable match listener argument typings')
// })

test('RxJS: fromEvent type inference and CustomEvent delivery', async _t => {
  const puppet = new PuppetTest()

  /**
   * Issue #96: Typing support for RxJS fromEvent with WinterTC EventTarget
   * RxJS detects EventTarget and delivers CustomEvent at runtime.
   */
  const customEvent$ = fromEvent<PuppetCustomEvent<'scan'>>(puppet, 'scan')
  const payload: EventScanPayload = {
    status: ScanStatus.Unknown,
  }

  const futureCustomEvent = firstValueFrom(customEvent$)
  puppet.emit('scan', payload)
  const customEventResult = await futureCustomEvent

  assert.ok(customEventResult instanceof CustomEvent, 'should deliver CustomEvent from EventTarget')
  assert.deepEqual(customEventResult.detail, payload, 'CustomEvent.detail should match payload')

  // Using resultSelector to map to the inner payload
  const mapped$ = fromEvent(puppet, 'scan', (event: any) => event.detail as EventScanPayload)
  const typeTest: AssertEqual<Observable<EventScanPayload>, typeof mapped$> = true
  assert.ok(typeTest, 'Observable should be typed as EventScanPayload with resultSelector')

  const futureMapped = firstValueFrom(mapped$)
  puppet.emit('scan', payload)
  const mappedResult = await futureMapped
  assert.deepEqual(mappedResult, payload, 'mapped observable should emit unwrapped payload')
})
