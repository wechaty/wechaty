/**
 * Stream transformers between raw chunks and the `UploadRequest` /
 * `DownloadResponse` messages, for streaming files over gRPC.
 */
import {
  create,
  type DescMessage,
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
 * Decodes a chunk into Uint8Array. Strings are decoded as base64 to maintain wire-format
 * compatibility with legacy protobuf bytes setters, falling back to UTF-8 text encoding.
 */
function decodeChunk (chunk: Chunk): Uint8Array {
  if (typeof chunk !== 'string') {
    return chunk
  }
  try {
    return Uint8Array.from(atob(chunk), c => c.charCodeAt(0))
  } catch {
    return new TextEncoder().encode(chunk)
  }
}

type ChunkFactory<T> = DescMessage | (new () => T) | ((init?: any) => T)

/**
 * Wrap Chunk
 */
const chunkEncoder = <T extends ChunkPb> (
  PbConstructor: ChunkFactory<T>,
) => new Transform<Chunk, T>({
  objectMode: true,
  transform: (chunk: Chunk, _: any, callback: (error: Error | null, pb?: T) => void) => {
    const bytes = decodeChunk(chunk)
    let pb: T
    if (PbConstructor && typeof PbConstructor === 'object' && ('kind' in PbConstructor || '$typeName' in PbConstructor)) {
      pb = create(PbConstructor as DescMessage, { chunk: bytes }) as unknown as T
    } else if (typeof PbConstructor === 'function') {
      const isConstructor = Boolean(
        PbConstructor.prototype &&
        PbConstructor.prototype.constructor === PbConstructor &&
        Object.getOwnPropertyNames(PbConstructor.prototype).length > 1,
      )
      if (isConstructor) {
        pb = new (PbConstructor as new () => T)()
      } else {
        pb = (PbConstructor as (init?: any) => T)({ chunk: bytes })
      }
      if (typeof pb.setChunk === 'function') {
        pb.setChunk(bytes)
      } else {
        pb.chunk = bytes
      }
    } else {
      pb = { chunk: bytes } as unknown as T
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
