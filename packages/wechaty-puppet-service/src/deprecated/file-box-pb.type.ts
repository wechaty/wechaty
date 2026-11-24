/**
 * Structural types for the protobuf messages that carry a `FileBoxChunk`
 * (and a conversation id), so the legacy helpers work with any of them.
 */
import type { puppet } from 'wechaty-grpc'

/**
 * Any Protocol Buffer message that include a FileBoxChunk
 */
export interface FileBoxPb {
  hasFileBoxChunk(): boolean
  getFileBoxChunk(): puppet.FileBoxChunk | undefined
  setFileBoxChunk(value?: puppet.FileBoxChunk): void
}

export interface ConversationIdFileBoxPb extends FileBoxPb {
  hasConversationId(): boolean
  getConversationId(): string
  setConversationId(value: string): void
}
