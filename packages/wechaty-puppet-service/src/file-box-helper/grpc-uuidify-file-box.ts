import {
  FileBox,
}                         from 'file-box'
import type {
  puppet as pbPuppet,
}                         from 'wechaty-grpc'
import {
  cloneClass,
  Constructor,
}                         from 'clone-class'

import {
  uuidLoaderGrpc,
  uuidSaverGrpc,
}                   from './grpc-uuid-helper.js'

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

  FileBoxUuid.setUuidLoader(uuidLoaderGrpc(grpcClient))
  FileBoxUuid.setUuidSaver(uuidSaverGrpc(grpcClient))

  return FileBoxUuid
}

export {
  uuidifyFileBoxGrpc,
}
