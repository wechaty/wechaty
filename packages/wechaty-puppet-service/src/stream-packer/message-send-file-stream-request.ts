import {
  MessageSendFileStreamRequest,
}                                     from '@chatie/grpc'
import { FileBox }      from 'wechaty-puppet'
import { PassThrough }  from 'stream'
import { Readable }     from 'stronger-typed-streams'

import { nextData }   from './next-data'
import {
  unpackFileBox,
  packFileBox,
}                     from './file-box-packer'
import {
  packFileBoxChunk,
  unpackFileBoxChunk,
}                     from './file-box-chunk-packer'

interface MessageSendFileStreamRequestArgs {
  conversationId: string,
  fileBox: FileBox,
}

/**
 * MessageSendFileStreamRequest to Args
 */
async function toMessageSendFileStreamRequestArgs (
  stream: Readable<MessageSendFileStreamRequest>
): Promise<MessageSendFileStreamRequestArgs> {
  const chunk = await nextData(stream)
  if (!chunk.hasConversationId()) {
    throw new Error('no conversation id')
  }
  const conversationId = chunk.getConversationId()

  const fileBox = await unpackFileBox(unpackFileBoxChunk(stream))

  return {
    conversationId,
    fileBox,
  }
}

/**
 * Args to MessageSendFileStreamRequest
 */
async function toMessageSendFileStreamRequest (
  conversationId: string,
  fileBox:        FileBox,
): Promise<
  Readable<MessageSendFileStreamRequest>
> {
  const stream = new PassThrough({ objectMode: true })

  const first = new MessageSendFileStreamRequest()
  first.setConversationId(conversationId)
  stream.write(first)

  const fileBoxChunkStream = await packFileBox(fileBox)

  packFileBoxChunk(MessageSendFileStreamRequest)(fileBoxChunkStream)
    .pipe(stream)

  return stream
}

export {
  toMessageSendFileStreamRequestArgs,
  toMessageSendFileStreamRequest,
}
