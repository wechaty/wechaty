/**
 * Legacy file streaming for `messageSendFileStream`: a conversation id
 * message followed by the file box chunks, packed on the client and unpacked
 * on the server. Deprecated with the streaming RPCs.
 */
import type {
  FileBoxInterface,
}                               from 'file-box'
import { PassThrough }          from 'node:stream'
import type { Readable }             from 'stronger-typed-streams'

import { nextData }                 from './next-data.ts'
import {
  packFileBoxToPb,
  unpackFileBoxFromPb,
}                                  from './file-box-pb.ts'
import type { PbFactory } from './chunk-pb.ts'
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
  if (!chunk.conversationId) {
    throw new Error('no conversation id')
  }
  const conversationId = chunk.conversationId

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
  PbConstructor: PbFactory<T>,
) {
  return async (
    conversationId: string,
    fileBox:        FileBoxInterface,
  ): Promise<
    Readable<T>
  > => {
    const stream = new PassThrough({ objectMode: true })

    let firstChunk: T
    try {
      firstChunk = new (PbConstructor as new () => T)()
    } catch {
      firstChunk = (PbConstructor as () => T)()
    }
    firstChunk.conversationId = conversationId

    stream.write(firstChunk)

    const fileBoxStream = await packFileBoxToPb(PbConstructor)(fileBox)
    fileBoxStream.pipe(stream)

    return stream
  }
}

export {
  unpackConversationIdFileBoxArgsFromPb,
  packConversationIdFileBoxToPb,
}
