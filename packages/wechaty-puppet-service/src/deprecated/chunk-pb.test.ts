/**
 * Unit tests for wrapping `FileBoxChunk` streams into protobuf messages and
 * unwrapping them.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { PassThrough } from 'stream'

import { FileBox } from 'file-box'

import type { FileBoxChunk } from 'wechaty-grpc'
import type { FileBoxPb, ConversationIdFileBoxPb } from './file-box-pb.type.ts'

class MessageFileStreamResponse implements FileBoxPb {
  fileBoxChunk?: FileBoxChunk
}

class MessageSendFileStreamRequest implements ConversationIdFileBoxPb {
  conversationId?: string
  fileBoxChunk?: FileBoxChunk
}

import {
  unpackFileBoxFromChunk,
  packFileBoxToChunk,
}                             from './file-box-chunk.ts'
import {
  unpackFileBoxChunkFromPb,
  packFileBoxChunkToPb,
}                             from './chunk-pb.ts'

test('packFileBoxChunk()', async _t => {
  const FILE_BOX_DATA = 'test'
  const FILE_BOX_NAME = 'test.dat'

  const fileBox = FileBox.fromBuffer(
    Buffer.from(FILE_BOX_DATA),
    FILE_BOX_NAME,
  )

  const chunkStream = await packFileBoxToChunk(fileBox)
  const pbStream    = await packFileBoxChunkToPb(MessageFileStreamResponse)(chunkStream)

  let   name        = ''
  let   buffer      = ''
  pbStream.on('data', (data: MessageFileStreamResponse) => {
    if (data.fileBoxChunk) {
      const fileBoxChunk = data.fileBoxChunk
      if (fileBoxChunk.data) {
        buffer += Buffer.from(fileBoxChunk.data).toString()
      } else if (fileBoxChunk.name) {
        name = fileBoxChunk.name
      }
    }
  })

  await new Promise(resolve => chunkStream.on('end', resolve))
  assert.equal(name, FILE_BOX_NAME, 'should get file box name')
  assert.equal(buffer, FILE_BOX_DATA, 'should get file box data')

})

test('unpackFileBoxChunkFromPb()', async _t => {
  const FILE_BOX_DATA = 'test'
  const FILE_BOX_NAME = 'test.dat'

  const fileBox = FileBox.fromBuffer(
    Buffer.from(FILE_BOX_DATA),
    FILE_BOX_NAME,
  )

  const chunkStream = await packFileBoxToChunk(fileBox)
  const request = new MessageSendFileStreamRequest()

  const packedStream = new PassThrough({ objectMode: true })

  chunkStream.on('data', (data: FileBoxChunk) => {
    request.fileBoxChunk = data
    packedStream.write(request)
  }).on('end', () => {
    packedStream.end()
  })

  const outputChunkStream = unpackFileBoxChunkFromPb(packedStream)
  const outputFileBox = await unpackFileBoxFromChunk(outputChunkStream)

  assert.equal((await outputFileBox.toBuffer()).toString(), FILE_BOX_DATA, 'should get file box data')
})

test('packFileBoxChunk() <-> unpackFileBoxChunkFromPb()', async _t => {
  const FILE_BOX_DATA = 'test'
  const FILE_BOX_NAME = 'test.dat'

  const fileBox = FileBox.fromBuffer(
    Buffer.from(FILE_BOX_DATA),
    FILE_BOX_NAME,
  )

  const chunkStream = await packFileBoxToChunk(fileBox)
  const packedStream = packFileBoxChunkToPb(MessageFileStreamResponse)(chunkStream)

  const unpackedStream = unpackFileBoxChunkFromPb(packedStream)
  const restoredBox = await unpackFileBoxFromChunk(unpackedStream)
  assert.equal(fileBox.name, restoredBox.name, 'should be same name')

  const EXPECTED_BASE64 = await fileBox.toBase64()
  const actualBase64 = await restoredBox.toBase64()

  assert.equal(EXPECTED_BASE64, actualBase64, 'should be same content')
})

test('packFileBoxChunk(): should not throw if no read on the stream', async _t => {
  const stream = await getTestChunkStream({})
  let outStream
  try {
    outStream = packFileBoxChunkToPb(MessageFileStreamResponse)(stream)
  } catch (e) {
    assert.ok((e as Error).message)
    return
  }
  outStream.on('error', _ => { /* Do nothing */ })
  assert.ok(true, )
})

test('packFileBoxChunk(): should emit error in the output stream', async _t => {
  const EXPECTED_MESSAGE = 'test emit error'

  const stream = await getTestChunkStream({ errorMessage: EXPECTED_MESSAGE })
  const outStream = packFileBoxChunkToPb(MessageFileStreamResponse)(stream)

  const error = await new Promise<Error>(resolve => outStream.on('error', resolve))
  // await new Promise(resolve => outStream.on('end', resolve))
  assert.equal(error.message, EXPECTED_MESSAGE, 'should emit error message')
})

test('unpackFileBoxChunkFromPb(): should not throw if no read on the stream', async _t => {
  const stream = await getTestPackedStream({})
  let outStream
  try {
    outStream = unpackFileBoxChunkFromPb(stream)
    assert.ok(true, 'should no rejection')
  } catch (e) {
    assert.fail((e as Error).message)
    return
  }
  outStream.on('error', _ => { /* Do nothing */ })
})

test('unpackFileBoxChunkFromPb(): should emit error in the output stream', async _t => {

  const errorMessage = 'test emit error'
  const stream = await getTestPackedStream({ errorMessage })

  const outStream = packFileBoxChunkToPb(MessageFileStreamResponse)(stream)

  await assert.rejects(
    new Promise((resolve, reject) => {
      outStream.on('error', reject)
      outStream.on('end', resolve)
    }),
    { message: errorMessage },
    'should get the expected rejection error message',
  )
})

async function getTestChunkStream (options: {
  errorMessage?: string,
}) {
  const { errorMessage } = options

  const FILE_BOX_DATA = 'test'
  const FILE_BOX_NAME = 'test.dat'

  const fileBox = FileBox.fromBuffer(
    Buffer.from(FILE_BOX_DATA),
    FILE_BOX_NAME,
  )

  const chunkStream = await packFileBoxToChunk(fileBox)
  setImmediate(() => {
    chunkStream.emit('error', new Error(errorMessage))
  })

  return chunkStream
}

async function getTestPackedStream (options: {
  errorMessage?: string,
}) {
  const { errorMessage } = options

  const FILE_BOX_DATA = 'test'
  const FILE_BOX_NAME = 'test.dat'

  const fileBox = FileBox.fromBuffer(
    Buffer.from(FILE_BOX_DATA),
    FILE_BOX_NAME,
  )

  const chunkStream = await packFileBoxToChunk(fileBox)
  const packedStream = new PassThrough({ objectMode: true })
  chunkStream.on('data', d => {
    const packedChunk = new MessageFileStreamResponse()
    packedChunk.fileBoxChunk = d
    packedStream.write(packedChunk)
  }).on('error', e => {
    packedStream.emit('error', e)
  })

  setImmediate(() => {
    chunkStream.emit('error', new Error(errorMessage))
  })

  return packedStream
}
