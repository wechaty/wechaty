/**
 * Main `wechaty-grpc` entry point: pure-ESM Protobuf-ES v2 schemas and ConnectRPC service
 * definitions for the Wechaty Puppet protocol, with zero CommonJS dependencies.
 */
import { Puppet } from './generated/wechaty/puppet_pb.ts'

import * as base from './generated/wechaty/puppet/base_pb.ts'
import * as contact from './generated/wechaty/puppet/contact_pb.ts'
import * as conversation from './generated/wechaty/puppet/conversation_pb.ts'
import * as downloadUpload from './generated/wechaty/puppet/download-upload_pb.ts'
import * as event from './generated/wechaty/puppet/event_pb.ts'
import * as friendship from './generated/wechaty/puppet/friendship_pb.ts'
import * as image from './generated/wechaty/puppet/image_pb.ts'
import * as location from './generated/wechaty/puppet/location_pb.ts'
import * as message from './generated/wechaty/puppet/message_pb.ts'
import * as miniProgram from './generated/wechaty/puppet/mini-program_pb.ts'
import * as referrer from './generated/wechaty/puppet/referrer_pb.ts'
import * as room from './generated/wechaty/puppet/room_pb.ts'
import * as roomInvitation from './generated/wechaty/puppet/room-invitation_pb.ts'
import * as roomMember from './generated/wechaty/puppet/room-member_pb.ts'
import * as tag from './generated/wechaty/puppet/tag_pb.ts'
import * as urlLink from './generated/wechaty/puppet/url-link_pb.ts'
import * as fileBox from './generated/wechaty/deprecated/file-box_pb.ts'
import * as health from './generated/grpc/health/v1/health_pb.ts'

import {
  codeRoot,
  getProtoPath,
  puppet as protoPuppet,
} from './proto.ts'
import { VERSION } from './config.ts'
import {
  StringValue,
  Timestamp,
} from './google.ts'
import {
  chunkEncoder,
  chunkDecoder,
  type Chunk,
} from './chunk-transformer.ts'

/**
 * Aggregated `puppet` namespace preserving familiar grouped access to schemas,
 * enums, and the core Puppet service definition.
 */
const puppet = {
  ...base,
  ...contact,
  ...conversation,
  ...downloadUpload,
  ...event,
  ...friendship,
  ...image,
  ...location,
  ...message,
  ...miniProgram,
  ...referrer,
  ...room,
  ...roomInvitation,
  ...roomMember,
  ...tag,
  ...urlLink,
  ...fileBox,
  Puppet,
  PuppetService: Puppet,
}

/**
 * Aggregated `google` namespace for standard gRPC health check services and schemas.
 */
const google = {
  ...health,
  Health: health.Health,
  HealthService: health.Health,
  ServingStatus: health.HealthCheckResponse_ServingStatus,
}

const ServingStatus = health.HealthCheckResponse_ServingStatus
type ServingStatus = health.HealthCheckResponse_ServingStatus

const proto = {
  puppet: protoPuppet,
}

export type {
  Chunk,
}

export {
  chunkEncoder,
  chunkDecoder,
  codeRoot,
  getProtoPath,
  google,
  proto,
  puppet,
  Puppet,
  ServingStatus,
  StringValue,
  Timestamp,
  VERSION,
}

// Direct re-exports of generated message and service schemas
export * from './generated/wechaty/puppet_pb.ts'
export * from './generated/wechaty/puppet/base_pb.ts'
export * from './generated/wechaty/puppet/contact_pb.ts'
export * from './generated/wechaty/puppet/conversation_pb.ts'
export * from './generated/wechaty/puppet/download-upload_pb.ts'
export * from './generated/wechaty/puppet/event_pb.ts'
export * from './generated/wechaty/puppet/friendship_pb.ts'
export * from './generated/wechaty/puppet/image_pb.ts'
export * from './generated/wechaty/puppet/location_pb.ts'
export * from './generated/wechaty/puppet/message_pb.ts'
export * from './generated/wechaty/puppet/mini-program_pb.ts'
export * from './generated/wechaty/puppet/referrer_pb.ts'
export * from './generated/wechaty/puppet/room_pb.ts'
export * from './generated/wechaty/puppet/room-invitation_pb.ts'
export * from './generated/wechaty/puppet/room-member_pb.ts'
export * from './generated/wechaty/puppet/tag_pb.ts'
export * from './generated/wechaty/puppet/url-link_pb.ts'
export * from './generated/wechaty/deprecated/file-box_pb.ts'
export * from './generated/grpc/health/v1/health_pb.ts'
