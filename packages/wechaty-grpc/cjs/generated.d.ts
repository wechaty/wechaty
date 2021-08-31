/**
 * Huan(202108)
 *
 *  Re-exporting namespace declarations in ES6 ambient declaration #4336
 *    https://github.com/microsoft/TypeScript/issues/4336
 */

/**
 * Huan(202108): I want to `declare namespace puppet {...}`
 *  but it seemss the `export * from '../generated/...js` is not working
 *
 * So I export them on the top level,
 *  then import them in another `puppet.js` file
 *  with the `puppet` namespace
 *
 * This is because the ESM module system need to do the following things
 *  when import a CJS module:
 *
 *  ```ts
 *  import pkg from './cjs-pkg'
 *  const puppet = pkg['puppet']
 *  ```
 */
export * from '../generated/wechaty/puppet/base_pb'
export * from '../generated/wechaty/puppet/contact_pb.js'
export * from '../generated/wechaty/puppet/event_pb.js'
export * from '../generated/wechaty/puppet/file_box_pb.js'
export * from '../generated/wechaty/puppet/friendship_pb.js'
export * from '../generated/wechaty/puppet/message_pb.js'
export * from '../generated/wechaty/puppet/room_invitation_pb.js'
export * from '../generated/wechaty/puppet/room_member_pb.js'
export * from '../generated/wechaty/puppet/room_pb.js'
export * from '../generated/wechaty/puppet/tag_pb.js'

export * from '../generated/wechaty/puppet_grpc_pb.js'
export * from '../generated/wechaty/puppet_pb.js'
