/**
 * Structural types for the protobuf messages that carry a `FileBoxChunk`
 * (and a conversation id), so the legacy helpers work with any of them.
 */
import type { FileBoxChunk } from 'wechaty-grpc'

/**
 * Any Protocol Buffer message that includes a FileBoxChunk
 */
export interface FileBoxPb {
  fileBoxChunk?: FileBoxChunk | undefined
}

export interface ConversationIdFileBoxPb extends FileBoxPb {
  conversationId?: string | undefined
}
