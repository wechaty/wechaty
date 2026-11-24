/**
 * `uuidifyFileBoxLocal()`: the server's `FileBox` class whose UUIDs live in
 * a local `UniformResourceNameRegistry`, which backs the `upload` and
 * `download` RPCs. It is a clone of `FileBox`, so the global class is not
 * changed.
 */
import {
  FileBox,
  UniformResourceNameRegistry,
}                               from 'file-box'
import {
  cloneClass,
  type Constructor,
}                               from 'clone-class'

type UuidifyFileBoxLocalFactory = (urnRegistry: UniformResourceNameRegistry) => typeof FileBox

const uuidifyFileBoxLocal: UuidifyFileBoxLocalFactory = (
  urnRegistry,
) => {
  /**
   * `as any`:
   *
   * Huan(202110): TypeError: Cannot read property 'valueDeclaration' of undefined #58
   *  https://github.com/huan/clone-class/issues/58
   */
  const FileBoxUuid: typeof FileBox = cloneClass(FileBox as any as Constructor<FileBox>) as any

  FileBoxUuid.setUuidLoader(uuid   => urnRegistry.load(uuid))
  FileBoxUuid.setUuidSaver(stream  => urnRegistry.save(stream))

  return FileBoxUuid
}

export {
  uuidifyFileBoxLocal,
}
