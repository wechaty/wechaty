/**
 * Legacy file streaming, layer 1: a file box as a stream of `FileBoxChunk`s
 * (the name first, then the data), and back. Deprecated with the streaming
 * RPCs.
 */
import { FileBox }      from 'file-box'
import type { FileBoxInterface } from 'file-box'
import { PassThrough }  from 'node:stream'
import {
  Readable,
  Transform,
}                       from 'stronger-typed-streams'

import type { FileBoxChunk } from 'wechaty-grpc'

import { nextData } from './next-data.ts'

/**
 * @deprecated Will be removed after Dec 31, 2022
 */
const decoder = () => new Transform<FileBoxChunk, any>({
  objectMode: true,
  transform: (chunk: FileBoxChunk, _: any, callback: any) => {
    if (!chunk.data) {
      callback(new Error('no data'))
      return
    }
    callback(null, chunk.data)
  },
})

/**
 * @deprecated Will be removed after Dec 31, 2022
 */
async function unpackFileBoxFromChunk (
  stream: Readable<FileBoxChunk>,
): Promise<FileBox> {
  const chunk = await nextData(stream)
  if (!chunk.name) {
    throw new Error('no name')
  }
  const fileName = chunk.name

  const fileStream = new PassThrough({ objectMode: true })
  const transformedStream = stream.pipe(decoder())
  transformedStream.pipe(fileStream)
  stream.on('error', e => fileStream.emit('error', e))
  transformedStream.on('error', e => fileStream.emit('error', e))

  const fileBox = FileBox.fromStream(fileStream, fileName)
  return fileBox
}

/**
 * @deprecated Will be removed after Dec 31, 2022
 */
const encoder = () => new Transform<any, FileBoxChunk>({
  objectMode: true,
  transform: (chunk: any, _: any, callback: any) => {
    callback(null, { data: chunk } as FileBoxChunk)
  },
})

/**
 * @deprecated Will be removed after Dec 31, 2022
 */
async function packFileBoxToChunk (
  fileBox: FileBoxInterface,
): Promise<Readable<FileBoxChunk>> {
  const stream = new PassThrough({ objectMode: true })
  stream.write({ name: fileBox.name } as FileBoxChunk)

  fileBox
    .pipe(encoder())
    .pipe(stream)

  return stream
}

export {
  unpackFileBoxFromChunk,
  packFileBoxToChunk,
}
