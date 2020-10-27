import { FileBox } from 'wechaty-puppet'
import {
  PassThrough,
}                   from 'stream'

import {
  Readable,
  TypedTransform,
}                   from './typed-stream'

import {
  FileBoxChunk,
}                 from '@chatie/grpc'
import {
  firstData,
}           from './first-data'

const decoder = () => new TypedTransform<FileBoxChunk, any>({
  objectMode: true,
  transform: (chunk: FileBoxChunk, _: any, callback: any) => {
    if (!chunk.hasData()) {
      callback(new Error('no data'))
      return
    }
    const data = chunk.getData()
    callback(null, data)
  },
})

async function chunkStreamToFileBox (
  stream: Readable<FileBoxChunk>,
): Promise<FileBox> {
  const chunk = await firstData(stream)
  if (!chunk.hasName()) {
    throw new Error('no name')
  }
  const fileName = chunk.getName()
  const fileStream = stream.pipe(decoder())

  const fileBox = FileBox.fromStream(fileStream, fileName)

  return fileBox
}

const encoder = () => new TypedTransform<any, FileBoxChunk>({
  objectMode: true,
  transform: (chunk: any, _: any, callback: any) => {
    const fileBoxChunk = new FileBoxChunk()
    fileBoxChunk.setData(chunk)
    callback(null, fileBoxChunk)
  },
})

async function fileBoxToChunkStream (
  fileBox: FileBox,
): Promise<Readable<FileBoxChunk>> {
  const stream = new PassThrough({ objectMode: true })

  const chunk = new FileBoxChunk()
  chunk.setName(fileBox.name)

  // FIXME: Huan(202010) write might return false
  stream.write(chunk)

  fileBox
    .pipe(encoder())
    .pipe(stream)

  return stream
}

export {
  chunkStreamToFileBox,
  fileBoxToChunkStream,
}
