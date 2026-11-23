const puppetFileList = [
  '../../out/wechaty/deprecated/file-box_pb.js',

  '../../out/wechaty/puppet/base_pb.js',
  '../../out/wechaty/puppet/contact_pb.js',
  '../../out/wechaty/puppet/download-upload_pb.js',
  '../../out/wechaty/puppet/event_pb.js',
  '../../out/wechaty/puppet/friendship_pb.js',
  '../../out/wechaty/puppet/location_pb.js',
  '../../out/wechaty/puppet/message_pb.js',
  '../../out/wechaty/puppet/mini-program_pb.js',
  '../../out/wechaty/puppet/referrer_pb.js',
  '../../out/wechaty/puppet/room_pb.js',
  '../../out/wechaty/puppet/room-invitation_pb.js',
  '../../out/wechaty/puppet/room-member_pb.js',
  '../../out/wechaty/puppet/tag_pb.js',
  '../../out/wechaty/puppet/url-link_pb.js',

  '../../out/wechaty/puppet_grpc_pb.js',
  '../../out/wechaty/puppet_pb.js',
]

/**
 * Huan(202108):
 *  if there's a "package.json" file in the `out/` directory,
 *    then all the files in the `out/` directory will be treated as one module,
 *    which means tht `require` each file under that directory will add methods to the same module.
 */
// for (const pkg of pkgs) {
//   console.info('## pkg:', pkg)
//   const module = require(pkg)
//   console.info(Object.keys(module).length)
//   // OOPS! The output number above will be keep increasing
// }

module.exports = puppetFileList.reduce((acc, pkg) => ({
  ...acc,
  ...require(pkg),
}), {}) // Huan(202108): must provide a `{}` as the initial value, or it will be `[]`
