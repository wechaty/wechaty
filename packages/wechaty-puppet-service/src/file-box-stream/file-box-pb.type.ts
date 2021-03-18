import { FileBoxChunk } from 'wechaty-grpc'

/**
 * Any Protocol Buffer message that include a FileBoxChunk
 */
export interface FileBoxPb {
  hasFileBoxChunk(): boolean
  getFileBoxChunk(): FileBoxChunk | undefined
  setFileBoxChunk(value?: FileBoxChunk): void
}

export interface ConversationIdFileBoxPb extends FileBoxPb {
  hasConversationId(): boolean
  getConversationId(): string
  setConversationId(value: string): void
}
