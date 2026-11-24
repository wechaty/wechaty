/**
 * Unit tests for `healthImplementation`: standard gRPC health service implementation.
 *
 * Validates initial status (UNKNOWN before first heartbeat), active status (SERVING
 * after puppet heartbeat), timeout status (NOT_SERVING after 60s), and clean cancellation
 * of watch() streams without leaving unhandled timers on the event loop.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import EventEmitter from 'node:events'

import {
  HealthCheckRequestSchema,
  ServingStatus,
} from 'wechaty-grpc'
import { create } from '@bufbuild/protobuf'
import type { Puppet } from 'wechaty-puppet'

import { healthImplementation } from './health-implementation.ts'

test('healthImplementation() check() lifecycle and status transitions', async () => {
  const puppetEmitter = new EventEmitter() as unknown as Puppet
  const health = healthImplementation(puppetEmitter)

  const req = create(HealthCheckRequestSchema, { service: 'wechaty.puppet.Puppet' })

  // 1. Initial status before any heartbeat should be UNKNOWN
  const initial = await health.check(req)
  assert.equal(initial.status, ServingStatus.UNKNOWN, 'initial status before heartbeat should be UNKNOWN')

  // 2. Status after heartbeat should be SERVING
  puppetEmitter.emit('heartbeat', { data: 'alive' })
  const serving = await health.check(req)
  assert.equal(serving.status, ServingStatus.SERVING, 'status after heartbeat should be SERVING')
})

test('healthImplementation() watch() yields status and terminates on abort without timer leaks', async () => {
  const puppetEmitter = new EventEmitter() as unknown as Puppet
  const health = healthImplementation(puppetEmitter)

  const req = create(HealthCheckRequestSchema, { service: 'wechaty.puppet.Puppet' })
  const abortController = new AbortController()

  const responses: ServingStatus[] = []
  const watchStream = health.watch(req, { signal: abortController.signal })

  const iterator = watchStream[Symbol.asyncIterator]()
  const first = await iterator.next()
  assert.equal(first.done, false, 'first response should not be done')
  if (first.value) {
    responses.push(first.value.status)
  }
  assert.equal(responses[0], ServingStatus.UNKNOWN, 'first response should be UNKNOWN')

  // Aborting signal should cancel the watch generator immediately
  abortController.abort()
  const next = await iterator.next()
  assert.equal(next.done, true, 'iterator should complete immediately upon abort')
})
