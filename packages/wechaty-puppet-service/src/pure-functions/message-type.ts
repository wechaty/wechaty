/**
 * Narrows a remote Protobuf message type to the Puppet SDK's known values at
 * the client boundary. Both contracts use the same numbers for known types.
 */
import { types } from 'wechaty-puppet'

const messageTypes = new Map<number, types.Message>(
  Object.values(types.Message).map(type => [type, type]),
)

/** Returns the matching Puppet type or `Unknown` when the wire number is unrecognized. */
export function messageTypeFromWire (type: number): types.Message {
  return messageTypes.get(type) ?? types.Message.Unknown
}
