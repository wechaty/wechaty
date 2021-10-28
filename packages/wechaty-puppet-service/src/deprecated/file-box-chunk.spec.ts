#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

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
import { test } from 'tstest'

import { PassThrough }  from 'stream'
import type { Duplex }       from 'stronger-typed-streams'
import { FileBox }      from 'file-box'

import {
  puppet,
}                 from 'wechaty-grpc'

import {
  unpackFileBoxFromChunk,
  packFileBoxToChunk,
}                         from './file-box-chunk.js'
import { nextData }       from './next-data.js'

test('unpackFileBoxFromChunk()', async t => {
  const FILE_BOX_DATA = 'test'
  const FILE_BOX_NAME = 'test.dat'

  const stream = await getFileBoxStreamStub(FILE_BOX_DATA, FILE_BOX_NAME)

  const decodedFileBox = await unpackFileBoxFromChunk(stream)
  const data = (await decodedFileBox.toBuffer()).toString()

  t.equal(decodedFileBox.name, FILE_BOX_NAME, 'should get file box name')
  t.equal(data, FILE_BOX_DATA, 'should get file box data')

})

test('packFileBoxToChunk()', async t => {
  const FILE_BOX_DATA = 'test'
  const FILE_BOX_NAME = 'test.dat'

  const fileBox = FileBox.fromBuffer(
    Buffer.from(FILE_BOX_DATA),
    FILE_BOX_NAME,
  )

  const stream = await packFileBoxToChunk(fileBox)

  const fileBoxChunk = await nextData(stream)
  t.ok(fileBoxChunk.hasName(), 'has name')

  const fileName = fileBoxChunk.getName()
  t.equal(fileName, FILE_BOX_NAME, 'should get name')

  let data = ''
  stream.on('data', (chunk: puppet.FileBoxChunk) => {
    if (!chunk.hasData()) {
      throw new Error('no data')
    }
    data += chunk.getData()
  })

  await new Promise(resolve => stream.on('end', resolve))

  t.equal(data, FILE_BOX_DATA, 'should get file box data')
})

test('packFileBoxToChunk() <-> unpackFileBoxFromChunk()', async t => {
  const FILE_BOX_DATA = 'test'
  const FILE_BOX_NAME = 'test.dat'

  const fileBox = FileBox.fromBuffer(
    Buffer.from(FILE_BOX_DATA),
    FILE_BOX_NAME,
  )

  const stream = await packFileBoxToChunk(fileBox)
  const restoredBox = await unpackFileBoxFromChunk(stream)

  t.equal(fileBox.name, restoredBox.name, 'should be same name')
  t.equal(await fileBox.toBase64(), await restoredBox.toBase64(), 'should be same content')
})

test('should handle no name error in catch', async t => {
  t.plan(1)
  const FILE_BOX_DATA = 'test'
  const FILE_BOX_NAME = 'test.dat'

  const stream = await getFileBoxStreamStub(FILE_BOX_DATA, FILE_BOX_NAME, true)

  try {
    await unpackFileBoxFromChunk(stream)
  } catch (e) {
    t.equal((e as Error).message, 'no name')
  }
})

test('should handle first error catch', async t => {
  t.plan(1)
  const FILE_BOX_DATA = 'test'
  const FILE_BOX_NAME = 'test.dat'

  const stream = await getFileBoxStreamStub(FILE_BOX_DATA, FILE_BOX_NAME, false, true)

  try {
    await unpackFileBoxFromChunk(stream)
  } catch (e) {
    t.equal((e as Error).message, 'first exception')
  }
})

test('should handle middle error in further ops', async t => {
  t.plan(1)
  const FILE_BOX_DATA = 'test'
  const FILE_BOX_NAME = 'test.dat'

  const stream = await getFileBoxStreamStub(FILE_BOX_DATA, FILE_BOX_NAME, false, false, true)

  const fileBox = await unpackFileBoxFromChunk(stream)
  try {
    await fileBox.toBuffer()
  } catch (e) {
    t.equal((e as Error).message, 'middle exception')
  }
})

async function getFileBoxStreamStub (
  data: string,
  name: string,
  noname = false,
  firstException = false,
  middleException = false,
) {
  const fileBox = FileBox.fromBuffer(
    Buffer.from(data),
    name,
  )

  const stream: Duplex<puppet.FileBoxChunk, puppet.FileBoxChunk> = new PassThrough({ objectMode: true })

  if (firstException) {
    stream.pause()
    setImmediate(() => {
      stream.emit('error', new Error('first exception'))
      stream.resume()
    })
  } else {
    const chunk1 = new puppet.FileBoxChunk()
    if (!noname) {
      chunk1.setName(fileBox.name)
    }
    setTimeout(() => stream.write(chunk1), 10)
  }

  if (middleException) {
    setTimeout(() => {
      stream.emit('error', new Error('middle exception'))
    }, 100)
  }

  const fileBoxStream = await fileBox.toStream()
  fileBoxStream.on('data', chunk => {
    const fileBoxChunk = new puppet.FileBoxChunk()
    fileBoxChunk.setData(chunk)
    setTimeout(() => stream.write(fileBoxChunk), 200)
  })
  fileBoxStream.on('end', () => setTimeout(() => stream.end(), 250))

  return stream
}
