import type { puppet } from 'wechaty-grpc'
import { Readable, Transform } from 'stronger-typed-streams'
import { PassThrough } from 'stream'

import type { FileBoxPb } from './file-box-pb.type.js'

/**
 * Wrap FileBoxChunk
 * @deprecated Will be removed after Dec 31, 2022
 */
const encoder = <T extends FileBoxPb>(
  PbConstructor: { new(): T },
) => new Transform<puppet.FileBoxChunk, T>({
  objectMode: true,
  transform: (chunk: puppet.FileBoxChunk, _: any, callback: (error: Error | null, data: T) => void) => {
    const message = new PbConstructor()
    message.setFileBoxChunk(chunk)
    callback(null, message)
  },
})

/**
 * @deprecated Will be removed after Dec 31, 2022
 */
function packFileBoxChunkToPb<T extends FileBoxPb> (
  PbConstructor: { new(): T },
) {
  return (stream: Readable<puppet.FileBoxChunk>): Readable<T> => {
    const outStream     = new PassThrough({ objectMode: true })
    const encodedStream = stream.pipe(encoder(PbConstructor))

    stream.on('error',        e => outStream.emit('error', e))
    encodedStream.on('error', e => outStream.emit('error', e))

    encodedStream.pipe(outStream)
    return outStream
  }
}

/**
 * Unwrap FileBoxChunk
 * @deprecated Will be removed after Dec 31, 2022
 */
const decoder = <T extends FileBoxPb>() => new Transform<T, puppet.FileBoxChunk>({
  objectMode: true,
  transform: (chunk: T, _: any, callback: (error: Error | null, data?: puppet.FileBoxChunk) => void) => {
    const fileBoxChunk = chunk.getFileBoxChunk()
    if (!fileBoxChunk) {
      callback(new Error('No FileBoxChunk'))
    } else {
      callback(null, fileBoxChunk)
    }
  },
})

/**
 * @deprecated Will be removed after Dec 31, 2022
 */
function unpackFileBoxChunkFromPb<T extends FileBoxPb> (
  stream: Readable<T>,
): Readable<puppet.FileBoxChunk> {
  const outStream     = new PassThrough({ objectMode: true })
  const decodedStream = stream.pipe(decoder())

  stream.on('error',        e => outStream.emit('error', e))
  decodedStream.on('error', e => outStream.emit('error', e))

  decodedStream.pipe(outStream)
  return outStream
}

export {
  packFileBoxChunkToPb,
  unpackFileBoxChunkFromPb,
}
