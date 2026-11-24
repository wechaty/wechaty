/**
 * Unit tests for packing and unpacking a conversation id with a file box
 * stream.
 */
/**
 *   Wechaty Chatbot SDK - https://github.com/wechaty/wechaty
 *
 *   @copyright 2016 Huan Li <huan@chatie.io>, and
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
import type { FileBoxChunk } from 'wechaty-grpc'
import type { ConversationIdFileBoxPb } from './file-box-pb.type.ts'

class MessageSendFileStreamRequest implements ConversationIdFileBoxPb {
  conversationId?: string
  fileBoxChunk?: FileBoxChunk
}

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { PassThrough }  from 'stream'
import { FileBox }      from 'file-box'

import { nextData }     from './next-data.ts'
import {
  packConversationIdFileBoxToPb,
  unpackConversationIdFileBoxArgsFromPb,
}                                         from './conversation-id-file-box.ts'

test('unpackConversationIdFileBoxArgsFromPb()', async _t => {
  const FILE_BOX_DATA = 'test'
  const FILE_BOX_NAME = 'test.dat'
  const CONVERSATION_ID = 'conversation_id'

  const fileBox = FileBox.fromBuffer(
    Buffer.from(FILE_BOX_DATA),
    FILE_BOX_NAME,
  )

  const stream = new PassThrough({ objectMode: true })

  const req1 = new MessageSendFileStreamRequest()
  req1.conversationId = CONVERSATION_ID
  stream.write(req1)

  const req2 = new MessageSendFileStreamRequest()
  req2.fileBoxChunk = { name: fileBox.name } as FileBoxChunk
  stream.write(req2)

  const fileBoxStream = await fileBox.toStream()
  fileBoxStream.on('data', chunk => {
    const req3 = new MessageSendFileStreamRequest()
    req3.fileBoxChunk = { data: chunk } as FileBoxChunk
    stream.write(req3)
  })
  fileBoxStream.on('end', () => stream.end())

  const args = await unpackConversationIdFileBoxArgsFromPb(stream)
  const data = (await args.fileBox.toBuffer()).toString()

  assert.equal(args.conversationId, CONVERSATION_ID, 'should get conversation id')
  assert.equal(args.fileBox.name, FILE_BOX_NAME, 'should get file box name')
  assert.equal(data, FILE_BOX_DATA, 'should get file box data')
})

test('packConversationIdFileBoxToPb()', async _t => {
  const FILE_BOX_DATA = 'test'
  const FILE_BOX_NAME = 'test.dat'
  const CONVERSATION_ID = 'conv_id'

  const fileBox = FileBox.fromBuffer(
    Buffer.from(FILE_BOX_DATA),
    FILE_BOX_NAME,
  )

  const stream = await packConversationIdFileBoxToPb(MessageSendFileStreamRequest)(
    CONVERSATION_ID,
    fileBox,
  )

  const data1 = await nextData(stream)
  assert.equal(data1.conversationId, CONVERSATION_ID, 'match conversation id')

  const data2 = await nextData(stream)
  assert.ok(data2.fileBoxChunk, 'has file box chunk')
  assert.ok(data2.fileBoxChunk.name, 'has file box name')
  assert.equal(data2.fileBoxChunk.name, FILE_BOX_NAME, 'match file box name')

  let data = ''
  stream.on('data', (chunk: MessageSendFileStreamRequest) => {
    if (!chunk.fileBoxChunk) {
      throw new Error('no file box chunk')
    }
    if (!chunk.fileBoxChunk.data) {
      throw new Error('no file box chunk data')
    }
    data += Buffer.from(chunk.fileBoxChunk.data).toString()
  })

  await new Promise(resolve => stream.on('end', resolve))

  assert.equal(data.toString(), FILE_BOX_DATA, 'should get file box data')
})

test('unpackConversationIdFileBoxArgsFromPb() <-> packConversationIdFileBoxToPb()', async _t => {
  const FILE_BOX_DATA = 'test'
  const FILE_BOX_NAME = 'test.dat'
  const CONVERSATION_ID = 'conv_id'

  const fileBox = FileBox.fromBuffer(
    Buffer.from(FILE_BOX_DATA),
    FILE_BOX_NAME,
  )

  const stream = await packConversationIdFileBoxToPb(MessageSendFileStreamRequest)(CONVERSATION_ID, fileBox)
  const args = await unpackConversationIdFileBoxArgsFromPb(stream)

  assert.equal(args.conversationId, CONVERSATION_ID, 'should match conversation id')
  assert.equal(args.fileBox.name, FILE_BOX_NAME, 'should be same name')
  assert.equal((await args.fileBox.toBuffer()).toString(), FILE_BOX_DATA, 'should be same content')
})
