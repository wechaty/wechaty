import { FileBoxChunk } from '@chatie/grpc'
import { Readable, Transform } from 'stronger-typed-streams'
import { PassThrough } from 'stream'

/**
 * Any Protocol Buffer message that include a FileBoxChunk
 */
type PbFileBoxChunk = {
  getFileBoxChunk: () => FileBoxChunk | undefined
  setFileBoxChunk: (chunk: FileBoxChunk) => void
}

/**
 * Wrap FileBoxChunk
 */
const encoder = <T extends PbFileBoxChunk>(
  PbMessage: { new(): T },
) => new Transform<FileBoxChunk, T>({
  objectMode: true,
  transform: (chunk: FileBoxChunk, _: any, callback: (error: Error | null, data: T) => void) => {
    const message = new PbMessage()
    message.setFileBoxChunk(chunk)
    callback(null, message)
  },
})

function packFileBoxChunk<T extends PbFileBoxChunk> (
  DataConstructor: { new(): T },
) {
  return (stream: Readable<FileBoxChunk>): Readable<T> => {
    const outStream     = new PassThrough({ objectMode: true })
    const encodedStream = stream.pipe(encoder(DataConstructor))

    stream.on('error',        e => outStream.emit('error', e))
    encodedStream.on('error', e => outStream.emit('error', e))

    encodedStream.pipe(outStream)
    return outStream
  }
}

/**
 * Unwrap FileBoxChunk
 */
const decoder = <T extends PbFileBoxChunk>() => new Transform<T, FileBoxChunk>({
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

function unpackFileBoxChunk<T extends PbFileBoxChunk> (
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
  packFileBoxChunk,
  unpackFileBoxChunk,
}
