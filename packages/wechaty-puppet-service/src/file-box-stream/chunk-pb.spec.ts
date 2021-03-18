#!/usr/bin/env ts-node

import test  from 'tstest'

import { PassThrough } from 'stream'

import { FileBox } from 'wechaty-puppet'

import {
  FileBoxChunk,
  MessageFileStreamResponse,
  MessageSendFileStreamRequest,
}                                 from 'wechaty-grpc'

import {
  unpackFileBoxFromChunk,
  packFileBoxToChunk,
}                             from './file-box-chunk'
import {
  unpackFileBoxChunkFromPb,
  packFileBoxChunkToPb,
}                             from './chunk-pb'

test('packFileBoxChunk()', async t => {
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
    if (data.hasFileBoxChunk()) {
      const fileBoxChunk = data.getFileBoxChunk()
      if (fileBoxChunk!.hasData()) {
        buffer += fileBoxChunk!.getData()
      } else if (fileBoxChunk!.hasName()) {
        name = fileBoxChunk!.getName()
      }
    }
  })

  await new Promise(resolve => chunkStream.on('end', resolve))
  t.equal(name, FILE_BOX_NAME, 'should get file box name')
  t.equal(buffer, FILE_BOX_DATA, 'should get file box data')

})

test('unpackFileBoxChunkFromPb()', async t => {
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
    request.setFileBoxChunk(data)
    packedStream.write(request)
  }).on('end', () => {
    packedStream.end()
  })

  const outputChunkStream = unpackFileBoxChunkFromPb(packedStream)
  const outputFileBox = await unpackFileBoxFromChunk(outputChunkStream)

  t.equal((await outputFileBox.toBuffer()).toString(), FILE_BOX_DATA, 'should get file box data')
})

test('packFileBoxChunk() <-> unpackFileBoxChunkFromPb()', async t => {
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
  t.equal(fileBox.name, restoredBox.name, 'should be same name')

  const EXPECTED_BASE64 = await fileBox.toBase64()
  const actualBase64 = await restoredBox.toBase64()

  t.equal(EXPECTED_BASE64, actualBase64, 'should be same content')
})

test('packFileBoxChunk(): should not throw if no read on the stream', async t => {

  t.plan(1)
  const stream = await getTestChunkStream({})
  let outStream
  try {
    outStream = packFileBoxChunkToPb(MessageFileStreamResponse)(stream)
  } catch (e) {
    t.assert(e.message)
    return
  }
  outStream.on('error', _ => { /* Do nothing */ })
  t.pass()
})

test('packFileBoxChunk(): should emit error in the output stream', async t => {

  t.plan(1)
  const errorMessage = 'test emit error'
  const stream = await getTestChunkStream({ errorMessage })
  const outStream = packFileBoxChunkToPb(MessageFileStreamResponse)(stream)

  outStream.on('error', e => {
    t.equal(e.message, errorMessage)
  })

  await new Promise(resolve => outStream.on('end', resolve))
})

test('unpackFileBoxChunkFromPb(): should not throw if no read on the stream', async t => {

  t.plan(1)
  const stream = await getTestPackedStream({})
  let outStream
  try {
    outStream = unpackFileBoxChunkFromPb(stream)
    t.pass('should no rejection')
  } catch (e) {
    t.fail(e.message)
    return
  }
  outStream.on('error', _ => { /* Do nothing */ })
})

test('unpackFileBoxChunkFromPb(): should emit error in the output stream', async t => {

  const errorMessage = 'test emit error'
  const stream = await getTestPackedStream({ errorMessage })

  const outStream = packFileBoxChunkToPb(MessageFileStreamResponse)(stream)

  try {
    await new Promise((resolve, reject) => {
      outStream.on('error', reject)
      outStream.on('end', resolve)
    })
    t.fail('should reject the promise')
  } catch (e) {
    t.equal(e.message, errorMessage, 'should get the expected rejection error message')
  }
})

const getTestChunkStream = async (options: {
  errorMessage?: string,
}) => {
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

const getTestPackedStream = async (options: {
  errorMessage?: string,
}) => {
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
    packedChunk.setFileBoxChunk(d)
    packedStream.write(packedChunk)
  }).on('error', e => {
    packedStream.emit('error', e)
  })

  setImmediate(() => {
    chunkStream.emit('error', new Error(errorMessage))
  })

  return packedStream
}
