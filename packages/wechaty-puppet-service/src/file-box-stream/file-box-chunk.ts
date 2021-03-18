import { FileBoxChunk } from 'wechaty-grpc'
import { FileBox }      from 'wechaty-puppet'
import { PassThrough }  from 'stream'
import {
  Readable,
  Transform,
}                       from 'stronger-typed-streams'

import { nextData } from './next-data'

const decoder = () => new Transform<FileBoxChunk, any>({
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

async function unpackFileBoxFromChunk (
  stream: Readable<FileBoxChunk>,
): Promise<FileBox> {
  const chunk = await nextData(stream)
  if (!chunk.hasName()) {
    throw new Error('no name')
  }
  const fileName = chunk.getName()

  const fileStream = new PassThrough({ objectMode: true })
  const transformedStream = stream.pipe(decoder())
  transformedStream.pipe(fileStream)
  stream.on('error', e => fileStream.emit('error', e))
  transformedStream.on('error', e => fileStream.emit('error', e))

  const fileBox = FileBox.fromStream(fileStream, fileName)

  return fileBox
}

const encoder = () => new Transform<any, FileBoxChunk>({
  objectMode: true,
  transform: (chunk: any, _: any, callback: any) => {
    const fileBoxChunk = new FileBoxChunk()
    fileBoxChunk.setData(chunk)
    callback(null, fileBoxChunk)
  },
})

async function packFileBoxToChunk (
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
  unpackFileBoxFromChunk,
  packFileBoxToChunk,
}
