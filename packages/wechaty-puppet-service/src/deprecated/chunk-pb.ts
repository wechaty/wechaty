/**
 * Legacy file streaming, layer 2: wraps a stream of `FileBoxChunk`s into
 * the protobuf messages of the old streaming RPCs (and back). The newer RPCs
 * send file boxes as JSON; these stay only for servers and clients that
 * still use the streaming RPCs, and are deprecated with them.
 */
import type { FileBoxChunk } from 'wechaty-grpc'
import { Readable, Transform } from 'stronger-typed-streams'
import { PassThrough } from 'node:stream'

import type { FileBoxPb } from './file-box-pb.type.ts'

export type PbFactory<T extends FileBoxPb> = (new () => T) | (() => T)

/**
 * Wrap FileBoxChunk
 * @deprecated Will be removed after Dec 31, 2022
 */
const encoder = <T extends FileBoxPb>(
  PbConstructor: PbFactory<T>,
) => new Transform<FileBoxChunk, T>({
  objectMode: true,
  transform: (chunk: FileBoxChunk, _: any, callback: (error: Error | null, data?: T) => void) => {
    let message: T
    try {
      message = new (PbConstructor as new () => T)()
    } catch {
      message = (PbConstructor as () => T)()
    }
    message.fileBoxChunk = chunk
    callback(null, message)
  },
})

/**
 * @deprecated Will be removed after Dec 31, 2022
 */
function packFileBoxChunkToPb<T extends FileBoxPb> (
  PbConstructor: PbFactory<T>,
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
 * @deprecated Will be removed after Dec 31, 2022
 */
const decoder = <T extends FileBoxPb>() => new Transform<T, FileBoxChunk>({
  objectMode: true,
  transform: (message: T, _: any, callback: (error: Error | null, chunk?: FileBoxChunk) => void) => {
    if (!message.fileBoxChunk) {
      callback(new Error('no file box chunk'))
      return
    }
    callback(null, message.fileBoxChunk)
  },
})

/**
 * @deprecated Will be removed after Dec 31, 2022
 */
function unpackFileBoxChunkFromPb<T extends FileBoxPb> (
  stream: Readable<T>,
): Readable<FileBoxChunk> {
  const outStream     = new PassThrough({ objectMode: true })
  const decodedStream = stream.pipe(decoder<T>())

  stream.on('error',        e => outStream.emit('error', e))
  decodedStream.on('error', e => outStream.emit('error', e))

  decodedStream.pipe(outStream)
  return outStream
}

export {
  packFileBoxChunkToPb,
  unpackFileBoxChunkFromPb,
}
