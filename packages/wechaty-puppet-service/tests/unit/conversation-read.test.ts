/**
 * Tests the server's `conversationRead` RPC over gRPC: a `PuppetService`
 * client calls `conversationReadMark()` on a `PuppetServer` serving a `PuppetMock`.
 * The request reaches `puppet.conversationReadMark()`; the response carries the puppet's
 * answer, or the requested state when the puppet returns nothing; and a puppet failure
 * reaches the client as a gRPC error.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { PuppetMock } from 'wechaty-puppet-mock'

import {
  PuppetServer,
  PuppetService,
  type PuppetServerOptions,
} from '../../src/mod.ts'
import { freePort } from '../fixtures/free-port.ts'
import { useTempHome } from '../fixtures/temp-home.ts'

const NIL_UUID_V4 = '00000000-0000-0000-0000-000000000000'

/**
 * A `PuppetMock` whose `conversationReadMark()` records its arguments and
 * returns what `answer` gives. A subclass, not a `node:test` mock: under
 * Deno 2.9 the server ran the prototype method instead of a `mock.method()`
 * spy installed on the instance.
 */
class ReadMarkPuppet extends PuppetMock {

  calls: [string, boolean | undefined][] = []
  answer: () => Promise<void | boolean> = async () => true

  override async conversationReadMark (conversationId: string, hasRead?: boolean): Promise<void> {
    this.calls.push([ conversationId, hasRead ])
    // PuppetMock declares `Promise<void>`; the base contract allows a boolean.
    return await this.answer() as void
  }

}

test('conversationRead RPC', async t => {
  useTempHome(t)
  const PORT     = await freePort()
  const TOKEN    = `insecure_${NIL_UUID_V4}`
  const ENDPOINT = `0.0.0.0:${PORT}`

  const puppet = new ReadMarkPuppet()

  const puppetServer = new PuppetServer({
    endpoint : ENDPOINT,
    puppet,
    token    : TOKEN,
  } as PuppetServerOptions)
  await puppetServer.start()

  const puppetService = new PuppetService({ endpoint: ENDPOINT, token: TOKEN } as any)
  await puppetService.start()

  t.after(async () => {
    await puppetService.stop()
    await puppetServer.stop()
  })

  const conversationRead = (conversationId: string, hasRead: boolean) => {
    return puppetService.conversationReadMark(conversationId, hasRead)
  }

  await t.test('passes the request to the puppet and returns its answer', async () => {
    puppet.calls = []
    const response = await conversationRead('room_id', true)

    assert.deepEqual(puppet.calls, [ [ 'room_id', true ] ], 'should call conversationReadMark() once with the conversation id and state')
    assert.equal(response, true, 'should return the puppet answer')
  })

  await t.test('returns the requested state when the puppet returns nothing', async () => {
    puppet.answer = async () => undefined
    const response = await conversationRead('contact_id', false)

    assert.equal(response, false, 'should echo the requested state')
  })

  await t.test('reports a puppet failure as a gRPC error', async () => {
    puppet.answer = async () => { throw new Error('read mark failed') }

    await assert.rejects(conversationRead('room_id', true), /read mark failed/, 'should reject with the puppet error')
  })
})
