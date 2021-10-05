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
}                   from './uuid-helper.js'

type UuidifyFileBoxFactory = (grpcClient: () => pbPuppet.PuppetClient) => typeof FileBox

const uuidifyFileBox: UuidifyFileBoxFactory = (
  grpcClient,
) => {
  /**
   * `as any`:
   *
   * Huan(202110): TypeError: Cannot read property 'valueDeclaration' of undefined #58
   *  https://github.com/huan/clone-class/issues/58
   */
  const FileBoxGrpc: typeof FileBox = cloneClass(FileBox as any as Constructor<FileBox>) as any

  FileBoxGrpc.setUuidLoader(uuidLoaderGrpc(grpcClient))
  FileBoxGrpc.setUuidSaver(uuidSaverGrpc(grpcClient))

  return FileBoxGrpc
}

export {
  uuidifyFileBox,
}
