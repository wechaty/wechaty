import { FileBoxChunk } from '@chatie/grpc'
import { Readable, Transform } from 'stronger-typed-streams'
import { PassThrough } from 'stream'

const encoder = <T extends { setFileBoxChunk: (chunk: FileBoxChunk) => void }>(
  Data: { new(): T },
) => new Transform<FileBoxChunk, T>({
  objectMode: true,
  transform: (chunk: FileBoxChunk, _: any, callback: (error: Error | null, data: T) => void) => {
    const message = new Data()
    message.setFileBoxChunk(chunk)
    callback(null, message)
  },
})

function packFileBoxChunk<T extends { setFileBoxChunk: (chunk: FileBoxChunk) => void }> (
  stream: Readable<FileBoxChunk>,
  DataConstructor: { new(): T },
): Readable<T> {
  const outStream = new PassThrough({ objectMode: true })
  stream.on('error', e => outStream.emit('error', e))
  stream.pipe(encoder(DataConstructor)).pipe(outStream)

  return outStream
}

function unpackFileBoxChunk<T extends { getFileBoxChunk: () => FileBoxChunk | undefined }> (
  stream: Readable<T>,
): Readable<FileBoxChunk> {
  const outStream = new PassThrough({ objectMode: true })
  const transformedStream = stream.pipe(decoder())
  stream.on('error', e => outStream.emit('error', e))
  transformedStream.on('error', e => outStream.emit('error', e))

  transformedStream.pipe(outStream)
  return outStream
}

const decoder = <T extends { getFileBoxChunk: () => FileBoxChunk | undefined }>() => new Transform<T, FileBoxChunk>({
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

export {
  packFileBoxChunk,
  unpackFileBoxChunk,
}
