/**
 * Unit tests for `event-target.ts`.
 *
 * Verifies standard WinterTC EventTarget semantics, WechatyEvent immutability,
 * next() promise resolution, and events() bounded async iteration.
 */
import assert from 'node:assert/strict'
import test from 'node:test'

import {
  WechatyEvent,
  WechatyEventTarget,
  EventEmitter,
} from './event-target.ts'

test('WechatyEvent creates standard CustomEvent with frozen detail and metadata', () => {
  const detail = { message: 'hello', count: 42 }
  const event = new WechatyEvent('test', {
    detail,
    source: 'puppet-mock',
    traceId: 'trace-123',
  })

  assert.equal(event.type, 'test')
  assert.equal(event.source, 'puppet-mock')
  assert.equal(event.traceId, 'trace-123')
  assert.ok(event.id.length > 0, 'event.id must be non-empty')
  assert.ok(typeof event.timestamp === 'number' && event.timestamp > 0)
  assert.ok(event instanceof CustomEvent, 'must be an instance of CustomEvent')
  assert.ok(event instanceof Event, 'must be an instance of Event')
  assert.equal(event.detail.message, 'hello')
  assert.ok(Object.isFrozen(event.detail), 'object payload must be deeply or shallowly frozen')

  // Primitive payload support
  const primitiveEvent = new WechatyEvent('primitive', { detail: 'plain-string' })
  assert.equal(primitiveEvent.detail, 'plain-string')

  const voidEvent = new WechatyEvent('void')
  assert.ok(voidEvent.detail === undefined || voidEvent.detail === null)
})

test('WechatyEventTarget is an instance of globalThis.EventTarget', () => {
  const target = new WechatyEventTarget()
  assert.ok(target instanceof EventTarget, 'must be an instance of EventTarget')
  assert.equal(EventEmitter, WechatyEventTarget, 'EventEmitter must be an alias for WechatyEventTarget')
})

test('WechatyEventTarget standard addEventListener, removeEventListener, and dispatchEvent', () => {
  const target = new WechatyEventTarget()
  const received: string[] = []

  const listener = (event: Event) => {
    received.push((event as CustomEvent<string>).detail)
  }

  target.addEventListener('msg', listener)
  assert.equal(target.listenerCount('msg'), 1)
  assert.deepEqual(target.eventNames(), ['msg'])

  // Duplicate registration is a no-op per W3C specification
  target.addEventListener('msg', listener)
  assert.equal(target.listenerCount('msg'), 1)

  target.dispatchEvent(new WechatyEvent('msg', { detail: 'first' }))
  assert.deepEqual(received, ['first'])

  target.removeEventListener('msg', listener)
  assert.equal(target.listenerCount('msg'), 0)
  assert.deepEqual(target.eventNames(), [])

  target.dispatchEvent(new WechatyEvent('msg', { detail: 'second' }))
  assert.deepEqual(received, ['first'], 'removed listener must not receive further events')
})

test('WechatyEventTarget supports EventListenerObject with handleEvent()', () => {
  const target = new WechatyEventTarget()
  let handleEventCalled = 0

  const listenerObject = {
    handleEvent (event: Event) {
      assert.equal((event as CustomEvent).detail, 'payload')
      handleEventCalled++
    },
  }

  target.addEventListener('obj', listenerObject)
  target.dispatchEvent(new WechatyEvent('obj', { detail: 'payload' }))
  assert.equal(handleEventCalled, 1)

  target.removeEventListener('obj', listenerObject)
  target.dispatchEvent(new WechatyEvent('obj', { detail: 'payload' }))
  assert.equal(handleEventCalled, 1)
})

test('WechatyEventTarget handles options: { once: true }', () => {
  const target = new WechatyEventTarget()
  let callCount = 0

  target.addEventListener('once-test', () => {
    callCount++
  }, { once: true })

  assert.equal(target.listenerCount('once-test'), 1)

  target.dispatchEvent(new WechatyEvent('once-test', { detail: 1 }))
  target.dispatchEvent(new WechatyEvent('once-test', { detail: 2 }))

  assert.equal(callCount, 1)
  assert.equal(target.listenerCount('once-test'), 0)
})

test('WechatyEventTarget handles options: { signal: AbortSignal }', () => {
  const target = new WechatyEventTarget()
  const controller = new AbortController()
  let callCount = 0

  target.addEventListener('abort-test', () => {
    callCount++
  }, { signal: controller.signal })

  assert.equal(target.listenerCount('abort-test'), 1)

  target.dispatchEvent(new WechatyEvent('abort-test', { detail: 1 }))
  assert.equal(callCount, 1)

  controller.abort()
  assert.equal(target.listenerCount('abort-test'), 0)

  target.dispatchEvent(new WechatyEvent('abort-test', { detail: 2 }))
  assert.equal(callCount, 1)

  // Pre-aborted signal should not attach
  const preAborted = new AbortController()
  preAborted.abort()
  target.addEventListener('abort-test', () => { callCount++ }, { signal: preAborted.signal })
  assert.equal(target.listenerCount('abort-test'), 0)
})

test('WechatyEventTarget next() resolves on next event and handles signal cancellation', async () => {
  const target = new WechatyEventTarget()

  // Normal resolution
  const nextPromise = target.next<{ value: number }>('num')
  target.dispatchEvent(new WechatyEvent('num', { detail: { value: 100 } }))
  const result = await nextPromise
  assert.equal(result.value, 100)
  assert.equal(target.listenerCount('num'), 0, 'next() must clean up its listener')

  // Signal abortion
  const controller = new AbortController()
  const abortedPromise = target.next('aborted', { signal: controller.signal })
  controller.abort(new Error('explicit abort'))
  await assert.rejects(abortedPromise, /explicit abort/)
  assert.equal(target.listenerCount('aborted'), 0)

  // Pre-aborted signal
  const preAborted = new AbortController()
  preAborted.abort()
  await assert.rejects(target.next('pre', { signal: preAborted.signal }), /aborted/)
})

test('WechatyEventTarget events() consumes stream with for-await and handles early break', async () => {
  const target = new WechatyEventTarget()
  const received: number[] = []

  // Dispatch events asynchronously
  const consumer = (async () => {
    for await (const num of target.events<number>('stream')) {
      received.push(num)
      if (num === 3) {
        break
      }
    }
  })()

  await Promise.resolve()
  target.dispatchEvent(new WechatyEvent('stream', { detail: 1 }))
  target.dispatchEvent(new WechatyEvent('stream', { detail: 2 }))
  target.dispatchEvent(new WechatyEvent('stream', { detail: 3 }))
  target.dispatchEvent(new WechatyEvent('stream', { detail: 4 }))

  await consumer
  assert.deepEqual(received, [1, 2, 3])
  assert.equal(target.listenerCount('stream'), 0, 'early break must clean up event listener')
})

test('WechatyEventTarget events() respects highWaterMark and overflow strategies', async () => {
  // Test drop-oldest
  const dropOldestTarget = new WechatyEventTarget()
  const dropOldestStream = dropOldestTarget.events<number>('data', {
    highWaterMark: 2,
    overflow: 'drop-oldest',
  })

  // Buffer 3 events without consumer
  dropOldestTarget.dispatchEvent(new WechatyEvent('data', { detail: 1 }))
  dropOldestTarget.dispatchEvent(new WechatyEvent('data', { detail: 2 }))
  dropOldestTarget.dispatchEvent(new WechatyEvent('data', { detail: 3 }))

  const iterator1 = dropOldestStream[Symbol.asyncIterator]()
  const val1 = await iterator1.next()
  const val2 = await iterator1.next()
  assert.equal(val1.value, 2, 'drop-oldest should have dropped 1')
  assert.equal(val2.value, 3)
  await iterator1.return?.()

  // Test drop-latest
  const dropLatestTarget = new WechatyEventTarget()
  const dropLatestStream = dropLatestTarget.events<number>('data', {
    highWaterMark: 2,
    overflow: 'drop-latest',
  })

  dropLatestTarget.dispatchEvent(new WechatyEvent('data', { detail: 10 }))
  dropLatestTarget.dispatchEvent(new WechatyEvent('data', { detail: 20 }))
  dropLatestTarget.dispatchEvent(new WechatyEvent('data', { detail: 30 })) // dropped

  const iterator2 = dropLatestStream[Symbol.asyncIterator]()
  const val10 = await iterator2.next()
  const val20 = await iterator2.next()
  assert.equal(val10.value, 10)
  assert.equal(val20.value, 20)
  await iterator2.return?.()

  // Test throw
  const throwTarget = new WechatyEventTarget()
  const throwStream = throwTarget.events<number>('data', {
    highWaterMark: 2,
    overflow: 'throw',
  })

  throwTarget.dispatchEvent(new WechatyEvent('data', { detail: 100 }))
  throwTarget.dispatchEvent(new WechatyEvent('data', { detail: 200 }))
  throwTarget.dispatchEvent(new WechatyEvent('data', { detail: 300 })) // triggers throw

  const iterator3 = throwStream[Symbol.asyncIterator]()
  await assert.rejects(async () => {
    await iterator3.next()
  }, (err: any) => err.name === 'QuotaExceededError' || /Queue overflow/.test(err?.message))
})

test('WechatyEventTarget events() terminates on AbortSignal', async () => {
  const target = new WechatyEventTarget()
  const controller = new AbortController()

  const received: number[] = []
  const consumer = (async () => {
    for await (const val of target.events<number>('sig', { signal: controller.signal })) {
      received.push(val)
    }
  })()

  target.dispatchEvent(new WechatyEvent('sig', { detail: 1 }))
  controller.abort()

  await consumer
  assert.deepEqual(received, [1])
  assert.equal(target.listenerCount('sig'), 0)
})

test('WechatyEventTarget emit() dispatches event and handles unhandled error', () => {
  const target = new WechatyEventTarget()

  // Unhandled error throws
  assert.throws(() => {
    target.emit('error', new Error('boom'))
  }, /boom/)

  // Handled error does not throw
  let handledError: any
  target.addEventListener('error', (e: Event) => {
    handledError = (e as CustomEvent).detail
  })
  assert.doesNotThrow(() => {
    target.emit('error', new Error('caught'))
  })
  assert.equal(handledError.message, 'caught')

  // Normal emit
  let messagePayload: string | undefined
  target.addEventListener('chat', (e: Event) => {
    messagePayload = (e as CustomEvent<string>).detail
  })
  const emitted = target.emit('chat', 'welcome')
  assert.equal(emitted, true)
  assert.equal(messagePayload, 'welcome')
})

test('WechatyEventTarget legacy compatibility methods (on, off, once, removeAllListeners)', () => {
  const target = new WechatyEventTarget()
  const events: string[] = []

  const onListener = (val: string) => {
    events.push(`on:${val}`)
  }
  const onceListener = (val: string) => {
    events.push(`once:${val}`)
  }

  target.on('test', onListener)
  target.once('test', onceListener)
  assert.equal(target.listenerCount('test'), 2)
  assert.equal(target.listeners('test').length, 2)
  assert.equal(target.rawListeners('test').length, 2)

  target.emit('test', '1')
  assert.deepEqual(events, ['on:1', 'once:1'])
  assert.equal(target.listenerCount('test'), 1)

  target.emit('test', '2')
  assert.deepEqual(events, ['on:1', 'once:1', 'on:2'])

  target.off('test', onListener)
  assert.equal(target.listenerCount('test'), 0)

  // Test removeAllListeners
  target.addListener('a', () => {})
  target.addListener('b', () => {})
  assert.equal(target.listenerCount('a'), 1)
  assert.equal(target.listenerCount('b'), 1)

  target.removeAllListeners('a')
  assert.equal(target.listenerCount('a'), 0)
  assert.equal(target.listenerCount('b'), 1)

  target.removeAllListeners()
  assert.equal(target.listenerCount('b'), 0)
  assert.equal(target.getMaxListeners(), Infinity)
  assert.equal(target.setMaxListeners(10), target)
})
