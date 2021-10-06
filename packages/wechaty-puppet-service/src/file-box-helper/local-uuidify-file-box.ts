import {
  FileBox,
}                         from 'file-box'
import {
  cloneClass,
  Constructor,
}                         from 'clone-class'

import type { UuidFileManager } from './uuid-file-manager.js'

type UuidifyFileBoxLocalFactory = (uuidFileManager: UuidFileManager) => typeof FileBox

const uuidifyFileBoxLocal: UuidifyFileBoxLocalFactory = (
  uuidFileManager,
) => {
  /**
   * `as any`:
   *
   * Huan(202110): TypeError: Cannot read property 'valueDeclaration' of undefined #58
   *  https://github.com/huan/clone-class/issues/58
   */
  const FileBoxUuid: typeof FileBox = cloneClass(FileBox as any as Constructor<FileBox>) as any

  FileBoxUuid.setUuidLoader(uuid  => uuidFileManager.load(uuid))
  FileBoxUuid.setUuidSaver(stream => uuidFileManager.save(stream))

  return FileBoxUuid
}

export {
  uuidifyFileBoxLocal,
}
