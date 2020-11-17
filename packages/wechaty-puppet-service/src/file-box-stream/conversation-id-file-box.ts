import { FileBox }              from 'wechaty-puppet'
import { PassThrough }          from 'stream'
import { Readable }             from 'stronger-typed-streams'

import { nextData }                 from './next-data'
import {
  packFileBoxToPb,
  unpackFileBoxFromPb,
}                                  from './file-box-pb'
import { ConversationIdFileBoxPb } from './file-box-pb.type'

interface ConversationIdFileBoxArgs {
  conversationId: string,
  fileBox: FileBox,
}

/**
 * MessageSendFileStreamRequest to Args
 */
async function unpackConversationIdFileBoxArgsFromPb (
  stream: Readable<ConversationIdFileBoxPb>
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
 */
function packConversationIdFileBoxToPb<T extends ConversationIdFileBoxPb> (
  PbConstructor: { new(): T },
) {
  return async (
    conversationId: string,
    fileBox:        FileBox,
  ): Promise<
    Readable<T>
  > => {
    const stream = new PassThrough({ objectMode: true })

    const first = new PbConstructor()
    first.setConversationId(conversationId)
    stream.write(first)

    // const fileBoxChunkStream = await packFileBoxToChunk(fileBox)
    // packFileBoxChunkToPb(MessageSendFileStreamRequest)(fileBoxChunkStream)
    const pbStream = await packFileBoxToPb(PbConstructor)(fileBox)
    pbStream.pipe(stream)

    return stream
  }
}

export {
  unpackConversationIdFileBoxArgsFromPb,
  packConversationIdFileBoxToPb,
}
