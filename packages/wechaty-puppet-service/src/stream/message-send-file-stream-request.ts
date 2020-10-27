import {
  MessageSendFileStreamRequest,
}                                     from '@chatie/grpc'
import { FileBox } from 'wechaty-puppet'
import { PassThrough } from 'stream'

import {
  Readable,
}                   from './typed-stream'
import { firstData } from './first-data'
import {
  chunkStreamToFileBox,
  fileBoxToChunkStream,
}                   from './file-box-helper'
import { packFileBoxChunk, unpackFileBoxChunk } from './file-box-packer'

interface MessageSendFileStreamRequestArgs {
  conversationId: string,
  fileBox: FileBox,
}

async function toMessageSendFileStreamRequestArgs (
  stream: Readable<MessageSendFileStreamRequest>
): Promise<MessageSendFileStreamRequestArgs> {
  const chunk = await firstData(stream)
  if (!chunk.hasConversationId()) {
    throw new Error('no conversation id')
  }
  const conversationId = chunk.getConversationId()

  const fileBox = await chunkStreamToFileBox(unpackFileBoxChunk(stream))

  return {
    conversationId,
    fileBox,
  }
}

async function toMessageSendFileStreamRequest (
  conversationId: string,
  fileBox: FileBox,
): Promise<Readable<MessageSendFileStreamRequest>> {
  const stream = new PassThrough({ objectMode: true })

  const first = new MessageSendFileStreamRequest()
  first.setConversationId(conversationId)
  stream.write(first)

  const fileBoxChunkStream = await fileBoxToChunkStream(fileBox)

  packFileBoxChunk(fileBoxChunkStream, MessageSendFileStreamRequest)
    .pipe(stream)

  return stream
}

export {
  toMessageSendFileStreamRequestArgs,
  toMessageSendFileStreamRequest,
}
