/**
 * `uuidifyFileBoxGrpc()`: the client's `FileBox` class whose UUIDs live on
 * the server. Saving uploads the stream with the `upload` RPC; loading
 * downloads it with `download`. It is a clone of `FileBox`, so the global
 * class is not changed.
 */
import { Readable } from 'node:stream'

import {
  FileBox,
  type UuidLoader,
  type UuidSaver,
} from 'file-box'
import {
  cloneClass,
  type Constructor,
} from 'clone-class'
import type { Client } from '@connectrpc/connect'
import type { Puppet } from 'wechaty-grpc'

const uuidResolverGrpc = (
  grpcClient: () => Client<typeof Puppet>,
): UuidLoader => async function uuidResolver (
  this : FileBox,
  uuid : string,
) {
  const responseStream = grpcClient().download({ id: uuid })

  async function* toChunks () {
    for await (const res of responseStream) {
      if (res.chunk && res.chunk.length > 0) {
        yield res.chunk
      }
    }
  }

  return Readable.from(toChunks())
}

const uuidRegisterGrpc = (
  grpcClient: () => Client<typeof Puppet>,
): UuidSaver => async function uuidRegister (
  this   : FileBox,
  stream : Readable,
) {
  async function* toRequests () {
    for await (const chunk of stream) {
      yield {
        chunk: typeof chunk === 'string' ? new TextEncoder().encode(chunk) : chunk,
      }
    }
  }

  const response = await grpcClient().upload(toRequests())
  return response.id
}

type UuidifyFileBoxGrpcFactory = (grpcClient: () => Client<typeof Puppet>) => typeof FileBox

const uuidifyFileBoxGrpc: UuidifyFileBoxGrpcFactory = (
  grpcClient,
) => {
  const FileBoxUuid: typeof FileBox = cloneClass(FileBox as any as Constructor<FileBox>) as any

  FileBoxUuid.setUuidLoader(uuidResolverGrpc(grpcClient))
  FileBoxUuid.setUuidSaver(uuidRegisterGrpc(grpcClient))

  return FileBoxUuid
}

export {
  uuidifyFileBoxGrpc,
}
