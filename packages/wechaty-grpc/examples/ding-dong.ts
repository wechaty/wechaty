/**
 * Example demonstrating how to construct, serialize, and deserialize Wechaty
 * Protobuf-ES v2 messages and inspect service descriptors.
 */
import {
  create,
  toBinary,
  fromBinary,
  toJson,
} from '@bufbuild/protobuf'

import {
  Puppet,
  EventResponseSchema,
  EventType,
  DingRequestSchema,
  DingResponseSchema,
  VERSION,
} from '../src/mod.ts'

console.info(`wechaty-grpc v${VERSION} Protobuf-ES v2 example`)

// 1. Inspect Service Descriptor
console.info(`Service: ${Puppet.typeName} exposes ${Puppet.methods.length} RPC methods`)
console.info(`Event streaming kind: ${Puppet.method.event.methodKind}`)

// 2. Construct messages using create()
const dingReq = create(DingRequestSchema, { data: 'ding' })
const dingRes = create(DingResponseSchema, {})
void dingReq
void dingRes

const event = create(EventResponseSchema, {
  type: EventType.DONG,
  payload: JSON.stringify({ data: 'dong' }),
})

// 3. Serialize to binary and JSON
const binaryBytes = toBinary(EventResponseSchema, event)
const jsonObject = toJson(EventResponseSchema, event)

console.info(`Serialized EventResponse to ${binaryBytes.length} bytes:`, jsonObject)

// 4. Deserialize from binary
const restored = fromBinary(EventResponseSchema, binaryBytes)
console.info(`Restored EventResponse type: ${restored.type}, payload: ${restored.payload}`)
