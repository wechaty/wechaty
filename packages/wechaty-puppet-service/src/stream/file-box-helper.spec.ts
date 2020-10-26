#!/usr/bin/env ts-node

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
import test  from 'tstest'

import { PassThrough } from 'stream'

import { FileBox } from 'wechaty-puppet'

import {
  FileBoxChunk,
}                 from '@chatie/grpc'

import {
  chunkStreamToFileBox,
  fileBoxToChunkStream,
}                   from './file-box-helper'
import { firstData } from './first-data'

test('chunkStreamToFileBox()', async t => {
  const FILE_BOX_DATA = 'test'
  const FILE_BOX_NAME = 'test.dat'

  const fileBox = FileBox.fromBuffer(
    Buffer.from(FILE_BOX_DATA),
    FILE_BOX_NAME,
  )

  const stream = new PassThrough({ objectMode: true })

  const chunk1 = new FileBoxChunk()
  chunk1.setName(fileBox.name)
  stream.write(chunk1)

  const fileBoxStream = await fileBox.toStream()
  fileBoxStream.on('data', chunk => {
    const fileBoxChunk = new FileBoxChunk()
    fileBoxChunk.setData(chunk)
    stream.write(fileBoxChunk)
  })
  fileBoxStream.on('end', () => stream.end())

  const decodedFileBox = await chunkStreamToFileBox(stream)
  const data = (await decodedFileBox.toBuffer()).toString()

  t.equal(decodedFileBox.name, FILE_BOX_NAME, 'should get file box name')
  t.equal(data, FILE_BOX_DATA, 'should get file box data')

})

test('fileBoxToChunkStream()', async t => {
  const FILE_BOX_DATA = 'test'
  const FILE_BOX_NAME = 'test.dat'

  const fileBox = FileBox.fromBuffer(
    Buffer.from(FILE_BOX_DATA),
    FILE_BOX_NAME,
  )

  const stream = await fileBoxToChunkStream(fileBox)

  const fileBoxChunk = await firstData(stream)
  t.true(fileBoxChunk.hasName(), 'has name')

  const fileName = fileBoxChunk.getName()
  t.equal(fileName, FILE_BOX_NAME, 'should get name')

  let data = ''
  stream.on('data', (chunk: FileBoxChunk) => {
    if (!chunk.hasData()) {
      throw new Error('no data')
    }
    data += chunk.getData()
  })

  await new Promise(resolve => stream.on('end', resolve))

  t.equal(data, FILE_BOX_DATA, 'should get file box data')
})

test('fileBoxToChunkStream() <-> chunkStreamToFileBox()', async t => {
  const FILE_BOX_DATA = 'test'
  const FILE_BOX_NAME = 'test.dat'

  const fileBox = FileBox.fromBuffer(
    Buffer.from(FILE_BOX_DATA),
    FILE_BOX_NAME,
  )

  const stream = await fileBoxToChunkStream(fileBox)
  const restoredBox = await chunkStreamToFileBox(stream)

  t.equal(fileBox.name, restoredBox.name, 'should be same name')
  t.equal(await fileBox.toBase64(), await restoredBox.toBase64(), 'should be same content')
})
