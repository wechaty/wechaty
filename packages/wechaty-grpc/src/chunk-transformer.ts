/**
 * Adapts raw file chunks to and from upload and download messages using
 * native Node streams. The schema entry can load without those streams.
 */
import {
  create,
  type DescMessage,
}                 from '@bufbuild/protobuf'
import type { TransformOptions } from 'node:stream'
import type { Transform } from 'stronger-typed-streams'

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
 * Creates a native stream with the typed input and output of the public chunk API.
 * @throws If the runtime has no Node stream implementation.
 */
function createChunkTransform<In, Out> (options: TransformOptions): Transform<In, Out> {
  const stream = globalThis.process?.getBuiltinModule?.('node:stream')
  if (!stream) {
    throw new Error('gRPC chunk transformers require native Node streams')
  }
  return new stream.Transform(options)
}

/**
 * Wraps raw chunks in protobuf messages using a native object-mode stream.
 */
const chunkEncoder = <T extends ChunkPb> (
  PbConstructor: ChunkFactory<T>,
) => createChunkTransform<Chunk, T>({
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
 * Unwraps protobuf messages into raw chunks using a native object-mode stream.
 */
const chunkDecoder = <T extends ChunkPb> () => createChunkTransform<T, Chunk>({
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
