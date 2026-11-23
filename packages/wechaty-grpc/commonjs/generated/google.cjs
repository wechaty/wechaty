/**
 * Merges the generated gRPC health check stubs in `out/` into one CommonJS
 * object, which `src/cjs.ts` re-exports as the `google` namespace.
 */
const googleFileList = [
  '../../out/google/api/health_check/v1/health_check_grpc_pb.js',
  '../../out/google/api/health_check/v1/health_check_pb.js',
]

module.exports = googleFileList.reduce((acc, pkg) => ({
  ...acc,
  ...require(pkg),
}), {}) // Huan(202108): must provide a `{}` as the initial value, or it will be `[]`
