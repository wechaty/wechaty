import { FileBoxChunk } from 'wechaty-grpc'
import { Readable, Transform } from 'stronger-typed-streams'
import { PassThrough } from 'stream'

import { FileBoxPb } from './file-box-pb.type'

/**
 * Wrap FileBoxChunk
 */
const encoder = <T extends FileBoxPb>(
  PbConstructor: { new(): T },
) => new Transform<FileBoxChunk, T>({
  objectMode: true,
  transform: (chunk: FileBoxChunk, _: any, callback: (error: Error | null, data: T) => void) => {
    const message = new PbConstructor()
    message.setFileBoxChunk(chunk)
    callback(null, message)
  },
})

function packFileBoxChunkToPb<T extends FileBoxPb> (
  PbConstructor: { new(): T },
) {
  return (stream: Readable<FileBoxChunk>): Readable<T> => {
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
 */
const decoder = <T extends FileBoxPb>() => new Transform<T, FileBoxChunk>({
  objectMode: true,
  transform: (chunk: T, _: any, callback: (error: Error | null, data?: FileBoxChunk) => void) => {
    const fileBoxChunk = chunk.getFileBoxChunk()
    if (!fileBoxChunk) {
      callback(new Error('No FileBoxChunk'))
    } else {
      callback(null, fileBoxChunk)
    }
  },
})

function unpackFileBoxChunkFromPb<T extends FileBoxPb> (
  stream: Readable<T>,
): Readable<FileBoxChunk> {
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
