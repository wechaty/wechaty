import {
  MessageSendFileStreamRequest,
}                               from '@chatie/grpc'
import { FileBox }              from 'wechaty-puppet'
import { PassThrough }          from 'stream'
import { Readable }             from 'stronger-typed-streams'

import { nextData }           from './next-data'
import {
  packFileBoxToPb,
  unpackFileBoxFromPb,
}                             from './file-box-pb'

interface ConversationIdFileBoxArgs {
  conversationId: string,
  fileBox: FileBox,
}

/**
 * MessageSendFileStreamRequest to Args
 */
async function unpackConversationIdFileBoxArgsFromPb (
  stream: Readable<MessageSendFileStreamRequest>
): Promise<ConversationIdFileBoxArgs> {
  const chunk = await nextData(stream)
  if (!chunk.hasConversationId()) {
    throw new Error('no conversation id')
  }
  const conversationId = chunk.getConversationId()

  // unpackFileBoxFromChunk(unpackFileBoxChunkFromPb(stream))
  const fileBox = await unpackFileBoxFromPb(stream)

  return {
    conversationId,
    fileBox,
  }
}

/**
 * Args to MessageSendFileStreamRequest
 * TODO: Huan(202011) to generalize this method to support all PBs like `packFileBoxToPb`
 */
async function packConversationIdFileBoxToPb (
  conversationId: string,
  fileBox:        FileBox,
): Promise<
  Readable<MessageSendFileStreamRequest>
> {
  const stream = new PassThrough({ objectMode: true })

  const first = new MessageSendFileStreamRequest()
  first.setConversationId(conversationId)
  stream.write(first)

  // const fileBoxChunkStream = await packFileBoxToChunk(fileBox)
  // packFileBoxChunkToPb(MessageSendFileStreamRequest)(fileBoxChunkStream)
  const pbStream = await packFileBoxToPb(MessageSendFileStreamRequest)(fileBox)
  pbStream.pipe(stream)

  return stream
}

export {
  unpackConversationIdFileBoxArgsFromPb,
  packConversationIdFileBoxToPb,
}
