#!/usr/bin/env ts-node

import test  from 'tstest'

import { PassThrough } from 'stream'

import { FileBox } from 'wechaty-puppet'

import {
  FileBoxChunk,
  MessageFileStreamResponse,
  MessageSendFileStreamRequest,
}                                 from '@chatie/grpc'

import {
  unpackFileBox,
  packFileBox,
}                         from './file-box-packer'
import {
  packFileBoxChunk,
  unpackFileBoxChunk,
}                         from './file-box-chunk-packer'

test('packFileBoxChunk()', async t => {
  const FILE_BOX_DATA = 'test'
  const FILE_BOX_NAME = 'test.dat'

  const fileBox = FileBox.fromBuffer(
    Buffer.from(FILE_BOX_DATA),
    FILE_BOX_NAME,
  )

  const chunkStream = await packFileBox(fileBox)

  const packedStream = packFileBoxChunk(MessageFileStreamResponse)(chunkStream)

  let name = ''
  let buffer = ''
  packedStream.on('data', (data: MessageFileStreamResponse) => {
    if (data.hasFileBoxChunk()) {
      const fileBoxChunk = data.getFileBoxChunk()
      if (fileBoxChunk!.hasData()) {
        buffer += fileBoxChunk!.getData()
      } else if (fileBoxChunk!.hasName()) {
        name = fileBoxChunk!.getName()
      }
    }
  })

  await new Promise(resolve => packedStream.on('end', resolve))
  t.equal(name, FILE_BOX_NAME, 'should get file box name')
  t.equal(buffer, FILE_BOX_DATA, 'should get file box data')

})

test('unpackFileBoxChunk()', async t => {
  const FILE_BOX_DATA = 'test'
  const FILE_BOX_NAME = 'test.dat'

  const fileBox = FileBox.fromBuffer(
    Buffer.from(FILE_BOX_DATA),
    FILE_BOX_NAME,
  )

  const chunkStream = await packFileBox(fileBox)
  const request = new MessageSendFileStreamRequest()

  const packedStream = new PassThrough({ objectMode: true })

  chunkStream.on('data', (data: FileBoxChunk) => {
    request.setFileBoxChunk(data)
    packedStream.write(request)
  }).on('end', () => {
    packedStream.end()
  })

  const outputChunkStream = unpackFileBoxChunk(packedStream)

  const outputFileBox = await unpackFileBox(outputChunkStream)
  t.equal((await outputFileBox.toBuffer()).toString(), FILE_BOX_DATA, 'should get file box data')
})

test('packFileBoxChunk() <-> unpackFileBoxChunk()', async t => {
  const FILE_BOX_DATA = 'test'
  const FILE_BOX_NAME = 'test.dat'

  const fileBox = FileBox.fromBuffer(
    Buffer.from(FILE_BOX_DATA),
    FILE_BOX_NAME,
  )

  const stream = await packFileBox(fileBox)
  const packedStream = packFileBoxChunk(MessageFileStreamResponse)(stream)

  const unpackedStream = unpackFileBoxChunk(packedStream)
  const restoredBox = await unpackFileBox(unpackedStream)

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
    outStream = packFileBoxChunk(MessageFileStreamResponse)(stream)
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
  const outStream = packFileBoxChunk(MessageFileStreamResponse)(stream)

  outStream.on('error', e => {
    t.equal(e.message, errorMessage)
  })

  await new Promise(resolve => outStream.on('end', resolve))
})

test('unpackFileBoxChunk(): should not throw if no read on the stream', async t => {

  t.plan(1)
  const stream = await getTestPackedStream({})
  let outStream
  try {
    outStream = unpackFileBoxChunk(stream)
  } catch (e) {
    t.assert(e.message)
    return
  }
  outStream.on('error', _ => { /* Do nothing */ })
  t.pass()
})

test('unpackFileBoxChunk(): should emit error in the output stream', async t => {

  t.plan(1)
  const errorMessage = 'test emit error'
  const stream = await getTestPackedStream({ errorMessage })

  const outStream = packFileBoxChunk(MessageFileStreamResponse)(stream)

  outStream.on('error', e => {
    t.equal(e.message, errorMessage)
  })

  await new Promise(resolve => outStream.on('end', resolve))
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

  const chunkStream = await packFileBox(fileBox)
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

  const chunkStream = await packFileBox(fileBox)
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
