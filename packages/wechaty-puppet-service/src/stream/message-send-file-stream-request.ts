import {
  FileBoxChunk,
  MessageSendFileStreamRequest,
}                                     from '@chatie/grpc'
import { FileBox } from 'wechaty-puppet'
import { PassThrough } from 'stream'

import {
  Readable,
  TypedTransform,
}                   from './typed-stream'
import { firstData } from './first-data'
import {
  chunkStreamToFileBox,
  fileBoxToChunkStream,
}                   from './file-box-helper'

interface MessageSendFileStreamRequestArgs {
  conversationId: string,
  fileBox: FileBox,
}

const decoder = () => new TypedTransform<
  MessageSendFileStreamRequest,
  FileBoxChunk
>({
  objectMode: true,
  transform: (chunk: MessageSendFileStreamRequest, _: any, callback: any) => {
    if (!chunk.hasFileBoxChunk()) {
      throw new Error('no file box chunk')
    }
    const fileBoxChunk = chunk.getFileBoxChunk()
    callback(null, fileBoxChunk)
  },
})

async function toMessageSendFileStreamRequestArgs (
  stream: Readable<MessageSendFileStreamRequest>
): Promise<MessageSendFileStreamRequestArgs> {
  const chunk = await firstData(stream)
  if (!chunk.hasConversationId()) {
    throw new Error('no conversation id')
  }
  const conversationId = chunk.getConversationId()

  const fileBoxChunkStream = stream.pipe(decoder())
  const fileBox = await chunkStreamToFileBox(fileBoxChunkStream)

  return {
    conversationId,
    fileBox,
  }
}

const encoder = () => new TypedTransform<
  FileBoxChunk,
  MessageSendFileStreamRequest
>({
  objectMode: true,
  transform: (chunk: FileBoxChunk, _: any, callback: any) => {
    const req = new MessageSendFileStreamRequest()
    req.setFileBoxChunk(chunk)
    callback(null, req)
  },
})

async function toMessageSendFileStreamRequest (
  conversationId: string,
  fileBox: FileBox,
): Promise<Readable<MessageSendFileStreamRequest>> {
  const stream = new PassThrough({ objectMode: true })

  const req = new MessageSendFileStreamRequest()
  req.setConversationId(conversationId)
  stream.write(req)

  const fileBoxChunkStream = await fileBoxToChunkStream(fileBox)
  fileBoxChunkStream
    .pipe(encoder())
    .pipe(stream)

  return stream
}

export {
  toMessageSendFileStreamRequestArgs,
  toMessageSendFileStreamRequest,
}
