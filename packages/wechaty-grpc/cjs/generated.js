const pkgs = [
  '../generated/wechaty/puppet/base_pb.js',
  '../generated/wechaty/puppet/contact_pb.js',
  '../generated/wechaty/puppet/event_pb.js',
  '../generated/wechaty/puppet/file_box_pb.js',
  '../generated/wechaty/puppet/friendship_pb.js',
  '../generated/wechaty/puppet/message_pb.js',
  '../generated/wechaty/puppet/room_invitation_pb.js',
  '../generated/wechaty/puppet/room_member_pb.js',
  '../generated/wechaty/puppet/room_pb.js',
  '../generated/wechaty/puppet/tag_pb.js',

  '../generated/wechaty/puppet_grpc_pb.js',
  '../generated/wechaty/puppet_pb.js',
]

/**
 * Huan(202108):
 *  if there's a "package.json" file in the `generated/` directory,
 *    then all the files in the `generated/` directory will be treated as one module,
 *    which means tht `require` each file under that directory will add methods to the same module.
 */
// for (const pkg of pkgs) {
//   console.info('## pkg:', pkg)
//   const module = require(pkg)
//   console.info(Object.keys(module).length)
//   // OOPS! The output number above will be keep increasing
// }

module.exports = pkgs.reduce((acc, pkg) => ({
  ...acc,
  ...require(pkg),
}), {}) // Huan(202108): must provide a `{}` as the initial value, or it will be `[]`

// for (const m of Object.keys(module.exports)) {
//   console.info(m)
// }
