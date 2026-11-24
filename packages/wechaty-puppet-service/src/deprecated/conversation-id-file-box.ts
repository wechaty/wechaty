import type {
  FileBoxInterface,
}                               from 'file-box'
import { PassThrough }          from 'stream'
import type { Readable }             from 'stronger-typed-streams'

import { nextData }                 from './next-data.js'
import {
  packFileBoxToPb,
  unpackFileBoxFromPb,
}                                  from './file-box-pb.js'
import type { ConversationIdFileBoxPb } from './file-box-pb.type.js'

interface ConversationIdFileBoxArgs {
  conversationId: string,
  fileBox: FileBoxInterface,
}

/**
 * MessageSendFileStreamRequest to Args
 * @deprecated Will be removed after Dec 31, 2022
 */
async function unpackConversationIdFileBoxArgsFromPb (
  stream: Readable<ConversationIdFileBoxPb>,
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
 * @deprecated Will be removed after Dec 31, 2022
 */
function packConversationIdFileBoxToPb<T extends ConversationIdFileBoxPb> (
  PbConstructor: { new(): T },
) {
  return async (
    conversationId: string,
    fileBox:        FileBoxInterface,
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
