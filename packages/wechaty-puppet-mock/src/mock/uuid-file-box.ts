import {
  FileBox,
  UniformResourceNameRegistry,
}                                 from 'file-box'
import { cloneClass } from 'clone-class'

/**
 * Huan(202112): Use UUID FileBox to save attachment temporary
 *  for testing the silk audio message with bot5-assistant
 */
const urnRegistry = new UniformResourceNameRegistry()
const UUIDFileBox = cloneClass(FileBox)

UUIDFileBox.setUuidLoader(urnRegistry.load)
UUIDFileBox.setUuidSaver(urnRegistry.save)

export {
  UUIDFileBox,
}
