import { Timestamp } from 'wechaty-grpc'

/**
 * https://github.com/protocolbuffers/protobuf/blob/b6993a90605cde15ba004e0287bcb078b0f3959d/src/google/protobuf/timestamp.proto#L86-L91
 */

function timestampFromMilliseconds (milliseconds: number) {
  const seconds = Math.floor(milliseconds / 1000)
  const nanos   = (milliseconds % 1000) * 1000000

  const timestamp = new Timestamp()
  timestamp.setSeconds(seconds)
  timestamp.setNanos(nanos)

  return timestamp
}

function millisecondsFromTimestamp (timestamp: ReturnType<typeof timestampFromMilliseconds>) {
  const seconds = timestamp.getSeconds()
  const nanos   = timestamp.getNanos()

  return seconds * 1000 + nanos / 1000000
}

export {
  millisecondsFromTimestamp,
  timestampFromMilliseconds,
}
