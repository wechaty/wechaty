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
