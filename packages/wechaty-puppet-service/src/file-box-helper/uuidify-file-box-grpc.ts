import type {
  Readable,
  Writable,
}                       from 'stream'

import {
  FileBox,
  UuidLoader,
  UuidSaver,
}                         from 'file-box'
import {
  chunkDecoder,
  chunkEncoder,
  puppet as pbPuppet,
}                         from 'wechaty-grpc'
import {
  cloneClass,
  Constructor,
}                         from 'clone-class'

const uuidResolverGrpc: (grpcClient: () => pbPuppet.PuppetClient) => UuidLoader = (
  grpcClient,
) => async function uuidResolver (
  this : FileBox,
  uuid : string,
) {
  const request = new pbPuppet.DownloadRequest()
  request.setId(uuid)

  const response = grpcClient().download(request)

  const stream = response
    .pipe(chunkDecoder())

  return stream
}

const uuidRegisterGrpc: (grpcClient: () => pbPuppet.PuppetClient) => UuidSaver = (
  grpcClient,
) => async function uuidRegister (
  this   : FileBox,
  stream : Readable,
) {
  const response = await new Promise<pbPuppet.UploadResponse>((resolve, reject) => {
    const request = grpcClient().upload((err, response) => {
      if (err) {
        reject(err)
      } else {
        resolve(response)
      }
    }) as unknown as Writable  // Huan(202203) FIXME: as unknown as

    stream
      .pipe(chunkEncoder(pbPuppet.UploadRequest))
      .pipe(request)
  })

  const uuid = response.getId()
  return uuid
}

type UuidifyFileBoxGrpcFactory = (grpcClient: () => pbPuppet.PuppetClient) => typeof FileBox

const uuidifyFileBoxGrpc: UuidifyFileBoxGrpcFactory = (
  grpcClient,
) => {
  /**
   * `as any`:
   *
   * Huan(202110): TypeError: Cannot read property 'valueDeclaration' of undefined #58
   *  https://github.com/huan/clone-class/issues/58
   */
  const FileBoxUuid: typeof FileBox = cloneClass(FileBox as any as Constructor<FileBox>) as any

  FileBoxUuid.setUuidLoader(uuidResolverGrpc(grpcClient))
  FileBoxUuid.setUuidSaver(uuidRegisterGrpc(grpcClient))

  return FileBoxUuid
}

export {
  uuidifyFileBoxGrpc,
}
