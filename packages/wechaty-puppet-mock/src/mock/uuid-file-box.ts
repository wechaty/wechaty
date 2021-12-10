import {
  UniformResourceNameRegistry,
}                                 from 'file-box'

/**
 * Huan(202112): Use UUID FileBox to save attachment temporary
 *  for testing the silk audio message with bot5-assistant
 */
const urnRegistry = new UniformResourceNameRegistry()
const UUIDFileBox = urnRegistry.getFileBox()

export {
  urnRegistry,
  UUIDFileBox,
}
