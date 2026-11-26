/**
 * Unit tests for `service-mixin.ts`.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import type {
  ServiceMixin,
  ProtectedPropertyServiceMixin,
}                                 from './service-mixin.ts'
import {
  serviceMixin,
}                                 from './service-mixin.ts'
import {
  PuppetSkeleton,
}                                 from '../puppet/puppet-skeleton.ts'

test('ProtectedPropertyServiceMixin', async _t => {
  type NotExistInMixin = Exclude<ProtectedPropertyServiceMixin, keyof InstanceType<ServiceMixin>>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  assert.ok(noOneLeft, 'should match Mixin properties for every protected property')
})

test('start() and stop() dispatch "start" and "stop" CustomEvents with null/undefined detail', async _t => {
  class TestServicePuppet extends serviceMixin(PuppetSkeleton) {
    override async onStart (): Promise<void> {}
    override async onStop (): Promise<void> {}
  }

  const puppet = new TestServicePuppet()

  let startCustomEvent: CustomEvent | undefined
  let stopCustomEvent: CustomEvent | undefined

  puppet.addEventListener('start', ((event: CustomEvent) => {
    startCustomEvent = event
  }) as EventListener)

  puppet.addEventListener('stop', ((event: CustomEvent) => {
    stopCustomEvent = event
  }) as EventListener)

  const startPromise = puppet.next('start')
  const stopPromise = puppet.next('stop')

  let startReceived: unknown = 'not-called'
  let stopReceived: unknown = 'not-called'

  puppet.on('start', (payload) => {
    startReceived = payload
  })
  puppet.on('stop', (payload) => {
    stopReceived = payload
  })

  await puppet.start()
  const startDetail = await startPromise
  assert.ok(startCustomEvent, 'start CustomEvent should be dispatched')
  assert.equal(startCustomEvent.type, 'start')
  assert.ok(startCustomEvent.detail === undefined || startCustomEvent.detail === null, 'start detail should be undefined or null')
  assert.ok(startDetail === undefined || startDetail === null, 'startDetail should be undefined or null')
  assert.ok(startReceived === undefined || startReceived === null, 'startReceived should be undefined or null')

  await puppet.stop()
  const stopDetail = await stopPromise
  assert.ok(stopCustomEvent, 'stop CustomEvent should be dispatched')
  assert.equal(stopCustomEvent.type, 'stop')
  assert.ok(stopCustomEvent.detail === undefined || stopCustomEvent.detail === null, 'stop detail should be undefined or null')
  assert.ok(stopDetail === undefined || stopDetail === null, 'stopDetail should be undefined or null')
  assert.ok(stopReceived === undefined || stopReceived === null, 'stopReceived should be undefined or null')
})

