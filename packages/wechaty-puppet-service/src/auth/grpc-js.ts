/**
 * The one place that imports `@grpc/grpc-js` for `auth/`. It uses only the
 * package's public entry: `CallMetadataGenerator` is not exported there, so
 * it is derived from `credentials.createFromMetadataGenerator()`.
 *
 * `@grpc/grpc-js` is a direct dependency with the same range as
 * `wechaty-grpc`'s, so npm installs one copy: the `Metadata` patch in
 * `mokey-patch-header-authorization.ts` must reach the instance that the
 * generated stubs and the server use.
 */
import {
  credentials,
  Metadata,
  status as GrpcStatus,
  StatusBuilder,
  type sendUnaryData,
  type ServerUnaryCall,
  type UntypedHandleCall,
  type UntypedServiceImplementation,
}                                 from '@grpc/grpc-js'

/** The callback that `callCredToken()` passes to grpc-js to build call metadata. */
type CallMetadataGenerator = Parameters<typeof credentials.createFromMetadataGenerator>[0]

export type {
  UntypedServiceImplementation,
  UntypedHandleCall,
  sendUnaryData,
  ServerUnaryCall,
  CallMetadataGenerator,
}
export {
  credentials,
  GrpcStatus,
  Metadata,
  StatusBuilder,
}
