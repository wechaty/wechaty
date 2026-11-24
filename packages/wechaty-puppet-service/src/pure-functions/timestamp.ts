/**
 * Conversions between milliseconds and `google.protobuf.Timestamp`, used for
 * message receive times on both sides of the wire.
 */
import {
  timestampFromMs,
  timestampMs,
} from '@bufbuild/protobuf/wkt'

/**
 * Creates a Protobuf-ES `google.protobuf.Timestamp` well-known type object from milliseconds.
 *
 * @param milliseconds Epoch milliseconds (positive or negative).
 * @returns Protobuf-ES `Timestamp` object.
 */
function timestampFromMilliseconds (milliseconds: number) {
  return timestampFromMs(milliseconds)
}

/**
 * Extracts epoch milliseconds from a Protobuf-ES `Timestamp` or legacy getter object.
 *
 * @param timestamp Optional `Timestamp` object or legacy class instance.
 * @returns Epoch milliseconds, or 0 if timestamp is unset.
 */
function millisecondsFromTimestamp (
  timestamp?: {
    seconds?: bigint | number
    nanos?: number
    getSeconds?: () => number
    getNanos?: () => number
  } | null,
): number {
  if (!timestamp) {
    return 0
  }
  if (typeof (timestamp as any).seconds === 'bigint' || typeof (timestamp as any).seconds === 'number') {
    return timestampMs({
      $typeName: 'google.protobuf.Timestamp',
      seconds: BigInt((timestamp as any).seconds),
      nanos: Number((timestamp as any).nanos ?? 0),
    })
  }
  if (typeof (timestamp as any).getSeconds === 'function') {
    return Number((timestamp as any).getSeconds()) * 1000 + Math.floor(Number((timestamp as any).getNanos?.() ?? 0) / 1e6)
  }
  return 0
}

export {
  millisecondsFromTimestamp,
  timestampFromMilliseconds,
}
