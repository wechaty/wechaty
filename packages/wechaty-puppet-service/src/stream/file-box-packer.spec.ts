import test  from 'tstest'

import { PassThrough } from 'stream'

import { FileBox } from 'wechaty-puppet'

import {
  FileBoxChunk,
  // FileBoxChunk,
  MessageFileStreamResponse,
  MessageSendFileStreamRequest,
}                 from '@chatie/grpc'

import {
  packFileBoxChunk,
  unpackFileBoxChunk,
}                   from './file-box-packer'

import { chunkStreamToFileBox, fileBoxToChunkStream } from './file-box-helper'

test('packFileBoxChunk()', async t => {
  const FILE_BOX_DATA = 'test'
  const FILE_BOX_NAME = 'test.dat'

  const fileBox = FileBox.fromBuffer(
    Buffer.from(FILE_BOX_DATA),
    FILE_BOX_NAME,
  )

  const chunkStream = await fileBoxToChunkStream(fileBox)

  const packedStream = packFileBoxChunk(chunkStream, MessageFileStreamResponse)

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

  const chunkStream = await fileBoxToChunkStream(fileBox)
  const request = new MessageSendFileStreamRequest()

  const packedStream = new PassThrough({ objectMode: true })

  chunkStream.on('data', (data: FileBoxChunk) => {
    request.setFileBoxChunk(data)
    packedStream.write(request)
  }).on('end', () => {
    packedStream.end()
  })

  const outputChunkStream = unpackFileBoxChunk(packedStream)

  const outputFileBox = await chunkStreamToFileBox(outputChunkStream)
  t.equal((await outputFileBox.toBuffer()).toString(), FILE_BOX_DATA, 'should get file box data')
})

test('packFileBoxChunk() <-> unpackFileBoxChunk()', async t => {
  const FILE_BOX_DATA = 'test'
  const FILE_BOX_NAME = 'test.dat'

  const fileBox = FileBox.fromBuffer(
    Buffer.from(FILE_BOX_DATA),
    FILE_BOX_NAME,
  )

  const stream = await fileBoxToChunkStream(fileBox)
  const packedStream = packFileBoxChunk(stream, MessageFileStreamResponse)

  const unpackedStream = unpackFileBoxChunk(packedStream)
  const restoredBox = await chunkStreamToFileBox(unpackedStream)

  t.equal(fileBox.name, restoredBox.name, 'should be same name')
  t.equal(await fileBox.toBase64(), await restoredBox.toBase64(), 'should be same content')
})
