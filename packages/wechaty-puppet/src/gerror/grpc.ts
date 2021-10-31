/**
 * See:
 *  - https://cloud.google.com/apis/design/errors
 *
 * gRPC Status:
 *
 * The `Status` type defines a logical error model that is suitable for
 * different programming environments, including REST APIs and RPC APIs. It is
 * used by [gRPC](https://github.com/grpc). Each `Status` message contains
 * three pieces of data: error code, error message, and error details.
 * You can find out more about this error model and how to work with it in the
 * [API Design Guide](https://cloud.google.com/apis/design/errors).
 *
 * message Status {
 *   // The status code, which should be an enum value of [google.rpc.Code][google.rpc.Code].
 *   // See: https://github.com/googleapis/googleapis/blob/master/google/rpc/code.proto
 *
 *   int32 code = 1;
 *
 *   // A developer-facing error message, which should be in English. Any
 *   // user-facing error message should be localized and sent in the
 *   // [google.rpc.Status.details][google.rpc.Status.details] field, or localized by the client.
 *
 *   string message = 2;
 *
 *   // A list of messages that carry the error details.  There is a common set of
 *   // message types for APIs to use.
 *
 *   repeated google.protobuf.Any details = 3;
 * }
 */

/**
 * Credit: https://github.com/grpc/grpc-node/blob/master/packages/grpc-js/src/constants.ts
 *
 * Huan(202110): it seems that the order of the below enum Code is exactly follow the Protobuf enum:
 *  See: https://github.com/googleapis/googleapis/blob/master/google/rpc/code.protodeclare
 */
enum Code {
  OK = 0,
  CANCELLED,
  UNKNOWN,
  INVALID_ARGUMENT,
  DEADLINE_EXCEEDED,
  NOT_FOUND,
  ALREADY_EXISTS,
  PERMISSION_DENIED,
  RESOURCE_EXHAUSTED,
  FAILED_PRECONDITION,
  ABORTED,
  OUT_OF_RANGE,
  UNIMPLEMENTED,
  INTERNAL,
  UNAVAILABLE,
  DATA_LOSS,
  UNAUTHENTICATED,
}

interface GrpcStatus {
  code     : Code
  message  : string
  /**
   * In gRPC Protobuf, details is a Array
   *  but here, we only keep the first element (if ther's any)
   *
   * The reason is for compatible with `@grpc/grpc-js` package defination:
   *  @see https://github.com/grpc/grpc-node/blob/4a5c1da93b77cc82e31063ae32990ba2d0883387/packages/grpc-js/src/call-stream.ts#L94-L98
   *
   * ```ts
   * export interface StatusObject {
   *   code: Status;
   *   details: string;
   *   metadata: Metadata;
   * }
   * ```
   */
  details? : string
}

const isGrpcStatus = (payload: any): payload is GrpcStatus => payload instanceof Object
  && typeof payload.code    === 'number'
  && typeof payload.message === 'string'
  && Array.isArray(payload.details)

export type { GrpcStatus }
export {
  isGrpcStatus,
  Code,
}
