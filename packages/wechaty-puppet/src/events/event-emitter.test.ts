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

test('EventEmitter emit preserves single array argument', () => {
  const ee = new EventEmitter()
  let received: any

  ee.on('array-test', arg => {
    received = arg
  })

  ee.emit('array-test', ['first', 'second'])
  assert.deepEqual(received, ['first', 'second'], 'single array argument must not be unpacked')
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
