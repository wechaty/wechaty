/**
 * A stream transformer that encodes chunks into protobufs (and vice versa)
 */
import {
  Transform,
}                 from 'stronger-typed-streams'

import type {
  UploadRequest,
}                 from '../out/wechaty/puppet/download-upload_pb.js'

// string | Uint8Array
type Chunk = UploadRequest.AsObject['chunk']

/**
 * the interface for satisfyign UploadRequest & DownloadResponse
 */
interface ChunkPb {
  getChunk(): Chunk
  setChunk(value: Chunk): void
}

/**
 * Wrap Chunk
 */
const chunkEncoder = <T extends ChunkPb> (
  PbConstructor: { new(): T },
) => new Transform<Chunk, T>({
  objectMode: true,
  transform: (chunk: Chunk, _: any, callback: (error: Error | null, pb: T) => void) => {
    const pb = new PbConstructor()
    pb.setChunk(chunk)
    callback(null, pb)
  },
})

/**
 * Unwrap Chunk
 */
const chunkDecoder = <T extends ChunkPb> () => new Transform<T, Chunk>({
  objectMode: true,
  transform: (pb: T, _: any, callback: (error: Error | null, chunk?: Chunk) => void) => {
    const chunk = pb.getChunk()
    if (chunk) {
      callback(null, chunk)
    } else {
      callback(new Error('NOCHUNK'))
    }
  },
})

export type {
  Chunk,
}
export {
  chunkEncoder,
  chunkDecoder,
}
