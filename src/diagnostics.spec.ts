#!/usr/bin/env -S node --import=tsx/esm
import { channel } from 'node:diagnostics_channel'
import {
  test,
  sinon,
}                    from 'tstest'

import './wechaty/wechaty-impl.js'

import { TimeoutPromiseGError } from 'gerror'
import { PuppetMock } from 'wechaty-puppet-mock'

import { diagnose } from './diagnostics.js'
import type { DiagnosticRecord } from './diagnostics.js'
import { WechatyBase } from './wechaty/wechaty-base.js'

const diagnosticsChannel = channel('wechaty.lifecycle')

test('diagnostics are silent without subscribers', async t => {
  const action = async () => 'result'

  t.equal(await diagnose('start', action), 'result')
})

test('diagnostics correlate concurrent operations and omit private values', async t => {
  const records: unknown[] = []
  const listener = (record: unknown) => records.push(record)
  diagnosticsChannel.subscribe(listener)

  try {
    const secret = 'secret-token-and-session-data'
    const [first, second] = await Promise.all([
      diagnose('provider.resolve', async () => secret, 'configured'),
      diagnose('provider.resolve', async () => 'resolved', 'default'),
    ])

    t.equal(first, secret, 'should preserve the operation result')
    t.equal(second, 'resolved', 'should preserve concurrent operation results')
  } finally {
    diagnosticsChannel.unsubscribe(listener)
  }

  const diagnosticRecords = records as Array<{
    operation: string
    operationId: string
    phase: string
    provider?: string
    durationMs?: number
  }>
  const startRecords = diagnosticRecords.filter(record => record.phase === 'start')
  const endRecords = diagnosticRecords.filter(record => record.phase === 'end')

  t.equal(startRecords.length, 2, 'should publish one start per operation')
  t.equal(endRecords.length, 2, 'should publish one end per operation')
  t.not(startRecords[0]?.operationId, startRecords[1]?.operationId, 'should correlate concurrent operations independently')
  t.ok(endRecords.every(record => record.durationMs !== undefined && record.durationMs >= 0), 'should report monotonic durations')
  t.notOk(JSON.stringify(records).includes('secret-token-and-session-data'), 'should not publish operation results or secrets')
  t.ok(diagnosticRecords.every(record => !('options' in record) && !('error' in record) && !('payload' in record)), 'should publish only the diagnostic contract')
})

test('diagnostics report rejected and timed-out outcomes without swallowing errors', async t => {
  const records: unknown[] = []
  const listener = (record: unknown) => records.push(record)
  diagnosticsChannel.subscribe(listener)

  const expectedError = new Error('private-error-detail')
  let caughtError: unknown
  try {
    await diagnose('provider.resolve', async () => {
      throw expectedError
    }, 'configured')
  } catch (error) {
    caughtError = error
  }

  const expectedTimeout = new Error('timeout')
  let caughtTimeout: unknown
  try {
    await diagnose('provider.start', async () => {
      throw expectedTimeout
    }, 'configured', () => 'timed-out')
  } catch (error) {
    caughtTimeout = error
  } finally {
    diagnosticsChannel.unsubscribe(listener)
  }

  const diagnosticRecords = records as Array<{
    operation: string
    phase: string
    outcome?: string
  }>
  t.equal(caughtError, expectedError, 'should rethrow the original error')
  t.equal(caughtTimeout, expectedTimeout, 'should rethrow even when reporting a timeout')
  t.ok(diagnosticRecords.some(record => record.operation === 'provider.resolve' && record.phase === 'end' && record.outcome === 'rejected'), 'should record rejected resolution')
  t.ok(diagnosticRecords.some(record => record.operation === 'provider.start' && record.phase === 'end' && record.outcome === 'timed-out'), 'should record tolerated timeout outcome')
  t.notOk(JSON.stringify(records).includes('private-error-detail'), 'should not publish raw error details')
})

test('Wechaty lifecycle diagnostics pair calls and report readiness separately', async t => {
  const records: DiagnosticRecord[] = []
  const listener = (record: unknown) => records.push(record as DiagnosticRecord)
  diagnosticsChannel.subscribe(listener)

  const puppet = new PuppetMock()
  const bot = new WechatyBase({ puppet })
  try {
    await bot.start()
    puppet.emit('ready', { data: 'test' })
    await bot.stop()
  } finally {
    diagnosticsChannel.unsubscribe(listener)
  }

  for (const operation of ['start', 'stop', 'provider.resolve', 'provider.start']) {
    const operationRecords = records.filter(record => record.operation === operation)
    t.equal(operationRecords.length, 2, `should pair ${operation}`)
    t.equal(operationRecords[0]?.phase, 'start', `should start ${operation}`)
    t.equal(operationRecords[1]?.phase, 'end', `should end ${operation}`)
    t.equal(operationRecords[0]?.operationId, operationRecords[1]?.operationId, `should correlate ${operation}`)
  }
  t.equal(records.filter(record => record.operation === 'provider.ready' && record.phase === 'event').length, 1, 'should report readiness as a separate event')
})

test('start completion and provider failure are reported independently', async t => {
  const records: DiagnosticRecord[] = []
  const listener = (record: unknown) => records.push(record as DiagnosticRecord)
  diagnosticsChannel.subscribe(listener)

  const puppet = new PuppetMock()
  const sandbox = sinon.createSandbox()
  const startStub = sandbox.stub(puppet, 'start').rejects(new Error('private-error-detail'))
  const bot = new WechatyBase({ puppet })
  let errorCount = 0
  bot.on('error', () => errorCount++)

  try {
    await bot.start()
    await bot.stop()
  } finally {
    diagnosticsChannel.unsubscribe(listener)
    sandbox.restore()
  }

  t.ok(startStub.calledOnce, 'should call puppet.start() once')
  t.equal(errorCount, 1, 'should preserve the provider error event')
  t.ok(records.some(record => record.operation === 'provider.start' && record.phase === 'end' && record.outcome === 'rejected'), 'should report provider failure')
  t.ok(records.some(record => record.operation === 'start' && record.phase === 'end' && record.outcome === 'resolved'), 'should report handled start completion')
  t.notOk(JSON.stringify(records).includes('private-error-detail'), 'should not report the raw provider error')
})

test('a tolerated provider start timeout is not reported as readiness', async t => {
  const records: DiagnosticRecord[] = []
  const listener = (record: unknown) => {
    records.push(record as DiagnosticRecord)
  }
  diagnosticsChannel.subscribe(listener)

  const sandbox = sinon.createSandbox()
  const puppet = new PuppetMock()
  const timeoutError = TimeoutPromiseGError.from('private-timeout-detail')
  sandbox.stub(puppet, 'start').rejects(timeoutError)
  const bot = new WechatyBase({ puppet })
  try {
    await bot.start()
    await bot.stop()
  } finally {
    diagnosticsChannel.unsubscribe(listener)
    sandbox.restore()
  }

  t.ok(records.some(record => record.operation === 'provider.start' && record.phase === 'end' && record.outcome === 'timed-out'), 'should report the tolerated provider timeout')
  t.ok(records.some(record => record.operation === 'start' && record.phase === 'end' && record.outcome === 'resolved'), 'should report start call completion')
  t.notOk(records.some(record => record.operation === 'provider.ready'), 'should not report readiness after a timeout')
})
