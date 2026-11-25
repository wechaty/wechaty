/**
 * Unit tests for portable EventEmitter implementation.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { EventEmitter } from './event-emitter.ts'

test('EventEmitter registers and emits events in order', () => {
  const ee = new EventEmitter()
  const calls: number[] = []

  ee.on('data', val => calls.push(val))
  ee.on('data', val => calls.push(val * 2))

  const emitted = ee.emit('data', 5)
  assert.equal(emitted, true)
  assert.deepEqual(calls, [5, 10])
})

test('EventEmitter once() fires exactly once', () => {
  const ee = new EventEmitter()
  let count = 0

  ee.once('ping', () => count++)
  ee.emit('ping')
  ee.emit('ping')

  assert.equal(count, 1)
  assert.equal(ee.listenerCount('ping'), 0)
})

test('EventEmitter removeListener / off removes correct listener', () => {
  const ee = new EventEmitter()
  const fn1 = () => {}
  const fn2 = () => {}

  ee.on('msg', fn1)
  ee.on('msg', fn2)
  assert.equal(ee.listenerCount('msg'), 2)

  ee.off('msg', fn1)
  assert.equal(ee.listenerCount('msg'), 1)
  assert.equal(ee.listeners('msg')[0], fn2)
})

test('EventEmitter prependListener adds to beginning', () => {
  const ee = new EventEmitter()
  const order: string[] = []

  ee.on('test', () => order.push('second'))
  ee.prependListener('test', () => order.push('first'))

  ee.emit('test')
  assert.deepEqual(order, ['first', 'second'])
})

test('EventEmitter removeAllListeners clears listeners', () => {
  const ee = new EventEmitter()
  ee.on('a', () => {})
  ee.on('b', () => {})

  assert.equal(ee.eventNames().length, 2)
  ee.removeAllListeners('a')
  assert.equal(ee.listenerCount('a'), 0)
  assert.equal(ee.listenerCount('b'), 1)

  ee.removeAllListeners()
  assert.equal(ee.eventNames().length, 0)
})

test('EventEmitter throws on unhandled error event', () => {
  const ee = new EventEmitter()
  assert.throws(() => ee.emit('error', new Error('boom')), /boom/)
  assert.throws(() => ee.emit('error', { gerror: '{"message":"UNAUTHENTICATED"}' }), /UNAUTHENTICATED/)

  let caught: Error | undefined
  ee.on('error', err => { caught = err })
  assert.doesNotThrow(() => ee.emit('error', new Error('handled')))
  assert.equal(caught?.message, 'handled')
})

test('EventEmitter prependListener and prependOnceListener', () => {
  const ee = new EventEmitter()
  let count = 0
  ee.prependOnceListener('test', () => {
    count++
  })
  ee.emit('test')
  ee.emit('test')
  assert.equal(count, 1)
})

test('EventEmitter guards once wrappers against reentrant emissions', () => {
  const ee = new EventEmitter()
  let onceCount = 0
  let reentered = false

  ee.on('reentrant', () => {
    if (!reentered) {
      reentered = true
      ee.emit('reentrant')
    }
  })

  ee.once('reentrant', () => {
    onceCount++
  })

  ee.emit('reentrant')
  assert.equal(onceCount, 1, 'once listener must only be invoked once even under reentrant emission')
})

test('EventEmitter static listenerCount, rawListeners, and setMaxListeners', () => {
  const ee = new EventEmitter()
  const fn = () => {}
  assert.equal(ee.getMaxListeners(), 10)
  ee.setMaxListeners(20)
  assert.equal(ee.getMaxListeners(), 20)

  ee.on('event', fn)
  assert.equal(EventEmitter.listenerCount(ee, 'event'), 1)
  assert.equal(ee.listeners('event')[0], fn)
  assert.equal(typeof ee.rawListeners('event')[0], 'function')

  // Removing once listener before firing
  const onceFn = () => {}
  ee.once('event', onceFn)
  assert.equal(ee.listenerCount('event'), 2)
  ee.off('event', onceFn)
  assert.equal(ee.listenerCount('event'), 1)

  // Invalid listener throws TypeError
  assert.throws(() => ee.on('test', null as any), TypeError)
})

test('EventEmitter addEventListener deduplication and EventTarget methods', () => {
  const ee = new EventEmitter()
  let count = 0
  const listener = () => { count++ }

  // Deduplication: registering same listener twice is a no-op
  ee.addEventListener('ping', listener)
  ee.addEventListener('ping', listener)
  assert.equal(ee.listenerCount('ping'), 1)

  ee.dispatchEvent(new Event('ping'))
  assert.equal(count, 1)

  ee.removeEventListener('ping', listener)
  assert.equal(ee.listenerCount('ping'), 0)
  ee.dispatchEvent(new Event('ping'))
  assert.equal(count, 1)
})

test('EventEmitter emit preserves single array argument and 0-argument emissions', () => {
  const ee = new EventEmitter()
  let received: any
  let argCount = -1

  ee.on('array-test', (...args) => {
    received = args[0]
    argCount = args.length
  })

  ee.emit('array-test', ['first', 'second'])
  assert.equal(argCount, 1, 'single array argument must not be unpacked')
  assert.deepEqual(received, ['first', 'second'])

  let zeroArgCount = -1
  ee.on('zero-arg', (...args) => {
    zeroArgCount = args.length
  })
  ee.emit('zero-arg')
  assert.equal(zeroArgCount, 0, '0-arg emission must invoke listener with 0 arguments, not null')

  let undefinedArgCount = -1
  let undefinedVal: any = 'not-set'
  ee.on('undefined-arg', (...args) => {
    undefinedArgCount = args.length
    undefinedVal = args[0]
  })
  ee.emit('undefined-arg', undefined)
  assert.equal(undefinedArgCount, 1)
  assert.equal(undefinedVal, undefined)
})

test('EventEmitter multi-argument custom event enrichment', () => {
  const ee = new EventEmitter()
  let scanDetail: any
  ee.addEventListener('scan', (event: any) => {
    scanDetail = event.detail
  })

  ee.emit('scan', 'https://qr.code', 2, 'scan-data')
  assert.equal(scanDetail.qrcode, 'https://qr.code')
  assert.equal(scanDetail.status, 2)
  assert.equal(scanDetail.data, 'scan-data')
})

test('EventEmitter once and AbortSignal targeted cleanup with multiple listeners', () => {
  const ee = new EventEmitter()
  let count = 0
  const fn = () => { count++ }

  ee.on('ping', fn)
  ee.once('ping', fn)
  assert.equal(ee.listenerCount('ping'), 2)

  ee.emit('ping')
  assert.equal(count, 2)
  assert.equal(ee.listenerCount('ping'), 1)

  ee.emit('ping')
  assert.equal(count, 3)
})

test('EventEmitter prependListener does not break existing once or signal listeners', () => {
  const ee = new EventEmitter()
  const ac = new AbortController()
  let onceRan = 0
  let abortRan = 0
  let prependedRan = 0

  ee.once('test', () => { onceRan++ })
  ee.on('test', () => { abortRan++ }, { signal: ac.signal })
  ee.prependListener('test', () => { prependedRan++ })

  ee.emit('test')
  assert.equal(prependedRan, 1)
  assert.equal(onceRan, 1)
  assert.equal(abortRan, 1)

  // Second emission: once listener should not run again
  ee.emit('test')
  assert.equal(onceRan, 1, 'once listener must not run again after prepend')
  assert.equal(abortRan, 2)

  // Abort signal: abort listener should not run
  ac.abort()
  ee.emit('test')
  assert.equal(abortRan, 2, 'aborted listener must not run after prepend')
})

test('EventEmitter branch coverage edge cases: abort signal, EventListenerObject, direct dispatchEvent', () => {
  const ee = new EventEmitter()

  // 1. Static listenerCount fallback
  assert.equal(EventEmitter.listenerCount({} as any, 'foo'), 0)

  // 2. addEventListener / on with pre-aborted signal
  const preAbortedAc = new AbortController()
  preAbortedAc.abort()
  ee.addEventListener('preabort', () => {}, { signal: preAbortedAc.signal })
  assert.equal(ee.listenerCount('preabort'), 0)
  ee.on('preabort', () => {}, { signal: preAbortedAc.signal })
  assert.equal(ee.listenerCount('preabort'), 0)

  // 3. addEventListener with null / falsy listener
  ee.addEventListener('null-test', null)
  assert.equal(ee.listenerCount('null-test'), 0)

  // 4. removeEventListener with null or non-existent event
  ee.removeEventListener('null-test', null)
  ee.removeEventListener('non-existent', () => {})

  // 5. EventListenerObject support and listeners()/rawListeners() fallback
  let handleEventCalled = 0
  const listenerObj = {
    handleEvent (_evt: Event) {
      handleEventCalled++
    },
  }
  ee.addEventListener('obj-event', listenerObj, { once: true })
  assert.equal(ee.listenerCount('obj-event'), 1)
  const fnList = ee.listeners('obj-event')
  assert.equal(fnList.length, 1)
  assert.equal(typeof fnList[0], 'function')
  fnList[0]?.() // invoke fallback no-op

  const rawList = ee.rawListeners('obj-event')
  assert.equal(rawList.length, 1)
  assert.equal(typeof rawList[0], 'function')

  ee.dispatchEvent(new Event('obj-event'))
  assert.equal(handleEventCalled, 1)
  assert.equal(ee.listenerCount('obj-event'), 0) // once consumed

  // 6. Direct dispatchEvent without emit (EVENT_ARGS_MAP not set)
  let receivedArgs: any[] = []
  ee.on('direct', (...args: any[]) => {
    receivedArgs = args
  })
  ee.dispatchEvent(new CustomEvent('direct', { detail: { value: 42 } }))
  assert.deepEqual(receivedArgs, [{ value: 42 }])

  ee.dispatchEvent(new Event('direct'))
  assert.deepEqual(receivedArgs, [])

  // 7. removeAllListeners with active AbortSignal listener cleanup
  const ac1 = new AbortController()
  const ac2 = new AbortController()
  ee.on('cleanup-single', () => {}, { signal: ac1.signal })
  ee.removeAllListeners('cleanup-single')
  assert.equal(ee.listenerCount('cleanup-single'), 0)

  ee.on('cleanup-all', () => {}, { signal: ac2.signal })
  ee.removeAllListeners()
  assert.equal(ee.listenerCount('cleanup-all'), 0)
})

test('EventEmitter preserves distinct Symbol event instances with identical descriptions', () => {
  const ee = new EventEmitter()
  const sym1 = Symbol('test')
  const sym2 = Symbol('test')
  let sym1Count = 0
  let sym2Count = 0

  ee.on(sym1, () => { sym1Count++ })
  ee.on(sym2, () => { sym2Count++ })

  ee.emit(sym1)
  assert.equal(sym1Count, 1)
  assert.equal(sym2Count, 0, 'sym2 listener must not fire when emitting sym1')

  ee.emit(sym2)
  assert.equal(sym1Count, 1)
  assert.equal(sym2Count, 1)
})

test('EventEmitter distinguishes capture vs non-capture listeners', () => {
  const ee = new EventEmitter()
  let captureCalls = 0
  let bubbleCalls = 0
  const fn = () => { captureCalls++ }
  const fnBubble = () => { bubbleCalls++ }

  ee.addEventListener('custom-evt', fn, { capture: true })
  ee.addEventListener('custom-evt', fnBubble, { capture: false })
  assert.equal(ee.listenerCount('custom-evt'), 2)

  // Duplicate registration with identical capture is ignored
  ee.addEventListener('custom-evt', fn, { capture: true })
  assert.equal(ee.listenerCount('custom-evt'), 2)

  ee.removeEventListener('custom-evt', fn, { capture: true })
  assert.equal(ee.listenerCount('custom-evt'), 1)

  ee.removeEventListener('custom-evt', fnBubble, { capture: false })
  assert.equal(ee.listenerCount('custom-evt'), 0)
})

test('EventEmitter logout event normalizes 1-argument emission with user detail', () => {
  const ee = new EventEmitter()
  let detail: any
  ee.addEventListener('logout', (event: any) => {
    detail = event.detail
  })

  ee.emit('logout', 'mock-user-id')
  assert.equal(detail.user, 'mock-user-id')
  assert.equal(detail.reason, undefined)
  assert.equal(detail[0], 'mock-user-id')
})


