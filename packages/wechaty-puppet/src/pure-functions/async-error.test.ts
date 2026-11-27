/**
 * Unit tests for `wrapAsyncError`, `timeoutPromise`, `TimeoutPromiseGError`,
 * and `parseGErrorPayload`.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { Code, GError } from 'gerror'

import {
  parseGErrorPayload,
  timeoutPromise,
  TimeoutPromiseGError,
  wrapAsyncError,
} from './async-error.ts'

describe('async-error helpers', () => {
  it('wrapAsyncError preserves receiver `this` and forwards async/sync errors', async () => {
    const errors: unknown[] = []
    const wrapAsync = wrapAsyncError((err) => errors.push(err))

    const receiver = {
      tag: 'ctx-42',
      async okMethod (this: { tag: string }) {
        if (this.tag !== 'ctx-42') {
          throw new Error('lost receiver')
        }
        throw new Error(`boom:${this.tag}`)
      },
    }

    const wrapped = wrapAsync(receiver.okMethod)
    wrapped.call(receiver)
    await new Promise((resolve) => setTimeout(resolve, 0))

    assert.equal(errors.length, 1)
    assert.equal((errors[0] as Error).message, 'boom:ctx-42')

    const syncThrower = wrapAsync(() => {
      throw new Error('sync-boom')
    })
    syncThrower()
    assert.equal(errors.length, 2)
    assert.equal((errors[1] as Error).message, 'sync-boom')

    wrapAsync(Promise.reject(new Error('promise-boom')))
    await new Promise((resolve) => setTimeout(resolve, 0))
    assert.equal(errors.length, 3)
    assert.equal((errors[2] as Error).message, 'promise-boom')
  })

  it('timeoutPromise resolves and clears timer, or rejects with TimeoutPromiseGError', async () => {
    const value = await timeoutPromise(Promise.resolve('ok'), 5000)
    assert.equal(value, 'ok')

    await assert.rejects(
      () => timeoutPromise(new Promise(() => {}), 10),
      (err: unknown) => {
        assert.equal(err instanceof TimeoutPromiseGError, true)
        assert.equal(GError.isGError(err), true)
        assert.equal((err as TimeoutPromiseGError).code, Code.DeadlineExceeded)
        return true
      },
    )
  })

  it('parseGErrorPayload parses JSON GErrorData strings and falls back safely', () => {
    const orig = new GError('not found', { code: Code.NotFound })
    assert.equal(parseGErrorPayload(orig), orig)

    const parsed = parseGErrorPayload(JSON.stringify(orig))
    assert.equal(GError.isGError(parsed), true)
    assert.equal(parsed.code, Code.NotFound)
    assert.equal(parsed.message, 'not found')

    const plain = parseGErrorPayload('plain message')
    assert.equal(plain.code, Code.Unknown)
    assert.equal(plain.message, 'plain message')

    const dataObj = new GError('from data obj', { code: Code.PermissionDenied }).toData()
    const fromDataObj = parseGErrorPayload(dataObj)
    assert.equal(fromDataObj.code, Code.PermissionDenied)
    assert.equal(fromDataObj.message, 'from data obj')
  })
})
