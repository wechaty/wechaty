/**
 * Stream transformers between raw chunks and the `UploadRequest` /
 * `DownloadResponse` messages, for streaming files over gRPC.
 */
import {
  create,
}                 from '@bufbuild/protobuf'
import {
  Transform,
}                 from 'stronger-typed-streams'

type Chunk = string | Uint8Array

/**
 * Interface for objects satisfying UploadRequest & DownloadResponse chunk accessors.
 */
interface ChunkPb {
  chunk?: Chunk | undefined
  getChunk?(): Chunk
  setChunk?(value: Chunk): void
}

/**
 * Wrap Chunk
 */
const chunkEncoder = <T extends ChunkPb> (
  PbConstructor: any,
) => new Transform<Chunk, T>({
  objectMode: true,
  transform: (chunk: Chunk, _: any, callback: (error: Error | null, pb?: T) => void) => {
    const bytes = typeof chunk === 'string' ? new TextEncoder().encode(chunk) : chunk
    let pb: any
    if (PbConstructor && typeof PbConstructor === 'object' && ('kind' in PbConstructor || '$typeName' in PbConstructor)) {
      pb = create(PbConstructor, { chunk: bytes })
    } else {
      try {
        pb = new PbConstructor()
      } catch {
        pb = typeof PbConstructor === 'function' ? PbConstructor({ chunk: bytes }) : { chunk: bytes }
      }
      if (typeof pb.setChunk === 'function') {
        pb.setChunk(bytes)
      } else {
        pb.chunk = bytes
      }
    }
    callback(null, pb)
  },
})

/**
 * Unwrap Chunk
 */
const chunkDecoder = <T extends ChunkPb> () => new Transform<T, Chunk>({
  objectMode: true,
  transform: (pb: T, _: any, callback: (error: Error | null, chunk?: Chunk) => void) => {
    let chunk: any
    if (typeof pb.getChunk === 'function') {
      chunk = pb.getChunk()
    } else {
      chunk = pb.chunk
    }
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
