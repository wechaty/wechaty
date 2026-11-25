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
