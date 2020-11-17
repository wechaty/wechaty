import { FileBoxChunk } from '@chatie/grpc'

/**
 * Any Protocol Buffer message that include a FileBoxChunk
 */
export type FileBoxPb = {
  getFileBoxChunk: () => FileBoxChunk | undefined
  setFileBoxChunk: (chunk: FileBoxChunk) => void
}
