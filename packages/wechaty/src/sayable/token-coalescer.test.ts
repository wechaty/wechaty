#!/usr/bin/env node
/**
 *   Wechaty Chatbot SDK - https://github.com/wechaty/wechaty
 *
 *   @copyright 2016 Huan LI (李卓桓) <https://github.com/huan>, and
 *                   Wechaty Contributors <https://github.com/wechaty>.
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { mock, PuppetMock } from 'wechaty-puppet-mock'

import { Wechaty } from '../wechaty/wechaty-impl.ts'
import { TokenCoalescer, TokenCoalescerTransform } from './token-coalescer.ts'
import { isSayableStream } from './deliver-sayable.ts'

test('TokenCoalescer batches tokens in sentence mode using flushIntervalMs and maxChunkSize', () => {
  let now = 1000
  const coalescer = new TokenCoalescer({
    mode: 'sentence',
    flushIntervalMs: 1200,
    maxChunkSize: 30,
    now: () => now,
  })

  assert.deepEqual(coalescer.push('Hello'), [])
  assert.deepEqual(coalescer.push(' world. Next'), []) // delimiter hit, but time < 1200ms

  now += 1200
  // Splits at the last sentence boundary and retains the trailing incomplete fragment
  assert.deepEqual(coalescer.push(' sentence'), ['Hello world.'])
  // Numbers/versions like 3.14 or 2.0.0 are not split mid-token
  now += 1200
  assert.deepEqual(coalescer.push(' v2.0.0.'), ['Next sentence v2.0.0.'])

  // Exceeding maxChunkSize slices to <= maxChunkSize at whitespace or hard boundary
  assert.deepEqual(
    coalescer.push('12345678901234567890123456789012345'),
    ['123456789012345678901234567890'],
  )
  assert.equal(coalescer.flush(), '12345')
  assert.equal(coalescer.flush(), undefined)
})

test('TokenCoalescer batches tokens in paragraph and adaptive modes and validates options', () => {
  const para = new TokenCoalescer({
    mode: 'paragraph',
    maxChunkSize: 100,
  })

  assert.deepEqual(para.push('Para 1\n\nPara 2 start'), ['Para 1'])
  assert.equal(para.flush(), 'Para 2 start')

  let now = 0
  const adaptive = new TokenCoalescer({
    mode: 'adaptive',
    flushIntervalMs: 1000,
    maxChunkSize: 40,
    now: () => now,
  })
  // Paragraph break flushes immediately in adaptive mode even before flushIntervalMs
  assert.deepEqual(adaptive.push('Immediate para.\n\nNext'), ['Immediate para.'])
  // Long clause >= maxChunkSize/2 flushes at whitespace once flushIntervalMs elapses
  assert.deepEqual(adaptive.push(' clause without punctuation'), [])
  now += 1000
  assert.deepEqual(adaptive.push(' yet'), ['Next clause without punctuation'])
  assert.equal(adaptive.flush(), 'yet')

  assert.throws(() => new TokenCoalescer({ maxChunkSize: 0 }), RangeError)
  assert.throws(() => new TokenCoalescer({ flushIntervalMs: -1 }), RangeError)
})

test('TokenCoalescerTransform pipes ReadableStream<string> into coalesced chunks', async () => {
  const input = new ReadableStream<string>({
    start (controller) {
      controller.enqueue('First ')
      controller.enqueue('sentence.\n\n')
      controller.enqueue('Second paragraph.')
      controller.close()
    },
  })

  const output: string[] = []
  const reader = input
    .pipeThrough(new TokenCoalescerTransform({ mode: 'paragraph', maxChunkSize: 200 }))
    .getReader()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    output.push(value)
  }

  assert.deepEqual(output, ['First sentence.', 'Second paragraph.'])
})

test('isSayableStream distinguishes streams from strings, primitives, and Post', async () => {
  const puppet = new PuppetMock()
  const bot = new Wechaty({ puppet })
  await bot.start()
  try {
    const post = bot.Post.builder().add('hello').build()
    assert.equal(isSayableStream(post), false, 'Post implements Symbol.asyncIterator but must not be treated as SayableStream')
    assert.equal(isSayableStream('hello'), false)
    assert.equal(isSayableStream(123), false)
    assert.equal(isSayableStream(null), false)
    assert.equal(isSayableStream(new ReadableStream()), true)
    assert.equal(isSayableStream((async function * () { yield 'hi' })()), true)
  } finally {
    await bot.stop()
  }
})

test('Contact.say(), Room.say(), Message.say(), and Wechaty.say() stream ReadableStream<string> and AsyncIterable<string>', async t => {
  const mocker = new mock.Mocker()
  const puppet = new PuppetMock({ mocker })
  const sentTexts: Array<{ conversationId: string, text: string }> = []

  t.mock.method(puppet, 'messageSendText', async (conversationId: string, text: string) => {
    sentTexts.push({ conversationId, text })
    return `msg-${sentTexts.length}`
  })

  const bot = new Wechaty({ puppet })
  await bot.start()
  const botUser = mocker.createContact({ name: 'Bot' })
  mocker.login(botUser)
  const peer = mocker.createContact({ name: 'Alice' })
  const mockRoom = mocker.createRoom({ memberIdList: [botUser.id, peer.id] })

  try {
    // 1. Contact.say() with ReadableStream<string>
    const contact = await bot.Contact.find({ id: peer.id })
    assert.ok(contact, 'Contact should exist in PuppetMock')

    const textStream = new ReadableStream<string>({
      start (controller) {
        controller.enqueue('Hello ')
        controller.enqueue('world.\n\n')
        controller.enqueue('Done!')
        controller.close()
      },
    })

    await contact.say(textStream, { mode: 'paragraph' })
    assert.deepEqual(sentTexts, [
      { conversationId: contact.id, text: 'Hello world.' },
      { conversationId: contact.id, text: 'Done!' },
    ])

    // 2. Room.say() with AsyncIterable<string>
    sentTexts.length = 0
    const room = await bot.Room.find({ id: mockRoom.id })
    assert.ok(room, 'Room should exist in PuppetMock')

    async function * generateRoomTokens (): AsyncIterable<string> {
      yield 'First paragraph.\n\n'
      yield 'Second paragraph.'
    }

    await room.say(generateRoomTokens(), { mode: 'paragraph' })
    assert.deepEqual(sentTexts, [
      { conversationId: room.id, text: 'First paragraph.' },
      { conversationId: room.id, text: 'Second paragraph.' },
    ])

    // 3. Message.say() delegates to room/talker
    sentTexts.length = 0
    const nextMessage = bot.next('message')
    peer.say('hi').to(botUser)
    const message = await nextMessage
    await message.say((async function * () {
      yield 'Reply via message.say.'
    })(), { flushIntervalMs: 0 })
    assert.deepEqual(sentTexts, [
      { conversationId: peer.id, text: 'Reply via message.say.' },
    ])

    // 4. Wechaty.say(stream, { to })
    sentTexts.length = 0
    async function * generateBotTokens (): AsyncIterable<string> {
      yield 'Streamed via bot.say.'
    }
    await bot.say(generateBotTokens(), { to: contact, flushIntervalMs: 0 })
    assert.deepEqual(sentTexts, [
      { conversationId: contact.id, text: 'Streamed via bot.say.' },
    ])
  } finally {
    await bot.stop()
  }
})

test('say(stream, { signal }) cancels stream consumption on AbortSignal', async t => {
  const mocker = new mock.Mocker()
  const puppet = new PuppetMock({ mocker })
  const sentTexts: string[] = []
  t.mock.method(puppet, 'messageSendText', async (_conversationId: string, text: string) => {
    sentTexts.push(text)
    return `msg-${sentTexts.length}`
  })

  const bot = new Wechaty({ puppet })
  await bot.start()
  const botUser = mocker.createContact({ name: 'Bot' })
  mocker.login(botUser)
  const peer = mocker.createContact({ name: 'Bob' })

  try {
    const contact = await bot.Contact.find({ id: peer.id })
    assert.ok(contact)

    const controller = new AbortController()
    let returned = false

    async function * slowTokens (): AsyncIterable<string> {
      try {
        yield 'First chunk.\n\n'
        controller.abort(new Error('user cancelled'))
        await new Promise<void>(resolve => {
          if (controller.signal.aborted) {
            resolve()
          } else {
            controller.signal.addEventListener('abort', () => resolve(), { once: true })
          }
        })
        yield 'Should not be sent.'
      } finally {
        returned = true
      }
    }

    await assert.rejects(
      contact.say(slowTokens(), { mode: 'paragraph', signal: controller.signal }),
      /user cancelled/,
    )
    assert.equal(returned, true, 'async iterator return() cleanup must run on abort')
    assert.deepEqual(sentTexts, ['First chunk.'])

    // ReadableStream cancellation + synchronous abort with producer rejection
    sentTexts.length = 0
    const readableController = new AbortController()
    let readableCancelled = false
    let pullCount = 0
    const readable = new ReadableStream<string>({
      pull (streamCtrl) {
        pullCount += 1
        if (pullCount === 1) {
          streamCtrl.enqueue('Readable chunk.\n\n')
        } else {
          readableController.abort(new Error('readable cancelled'))
        }
      },
      cancel () {
        readableCancelled = true
      },
    }, { highWaterMark: 0 })
    await assert.rejects(
      contact.say(readable, { mode: 'paragraph', signal: readableController.signal }),
      /readable cancelled/,
    )
    assert.equal(readableCancelled, true, 'ReadableStream cancel() must run on abort')
    assert.deepEqual(sentTexts, ['Readable chunk.'])

    const syncAbort = new AbortController()
    const rejectingIterable: AsyncIterable<string> = {
      [Symbol.asyncIterator] () {
        return {
          next () {
            syncAbort.abort(new Error('sync abort'))
            return Promise.reject(new Error('producer error after abort'))
          },
        }
      },
    }
    await assert.rejects(
      contact.say(rejectingIterable, { signal: syncAbort.signal }),
      /sync abort/,
    )
  } finally {
    await bot.stop()
  }
})
