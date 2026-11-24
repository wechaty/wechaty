/**
 * Legacy file streaming for `messageSendFileStream`: a conversation id
 * message followed by the file box chunks, packed on the client and unpacked
 * on the server. Deprecated with the streaming RPCs.
 */
import type {
  FileBoxInterface,
}                               from 'file-box'
import { PassThrough }          from 'stream'
import type { Readable }             from 'stronger-typed-streams'

import { nextData }                 from './next-data.ts'
import {
  packFileBoxToPb,
  unpackFileBoxFromPb,
}                                  from './file-box-pb.ts'
import type { ConversationIdFileBoxPb } from './file-box-pb.type.ts'

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
