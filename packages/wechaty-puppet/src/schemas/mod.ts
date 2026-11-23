/**
 * Barrel for every schema: the `const` type maps, payloads, filters and event
 * dictionaries.
 */
import {
  ContactGender,
  ContactType,
  type ContactPayload,
  type ContactQueryFilter,
}                             from './contact.ts'
import {
  ScanStatus,
}                             from './event.ts'
import {
  type FriendshipAddOptions,
  type FriendshipPayload,
  type FriendshipPayloadConfirm,
  type FriendshipPayloadReceive,
  type FriendshipPayloadVerify,
  type FriendshipSearchQueryFilter,
  FriendshipType,
  FriendshipSceneType,
}                             from './friendship.ts'
import {
  ImageType,
}                             from './image.ts'
import {
  type MessagePayload,
  type MessagePayloadBase,
  type MessagePayloadRoom,
  type MessagePayloadTo,
  type MessageQueryFilter,
  MessageType,
}                             from './message.ts'
import { DirtyType }         from './dirty.ts'
import {
  CHAT_EVENT_DICT,
  PUPPET_EVENT_DICT,
  YOU,
}                       from './puppet.ts'
import {
  type TapPayload,
  TapType,
  type TapQueryFilter,
}                       from './tap.ts'
import {
  type PostPayload,
  PostType,
  isPostPayloadClient,
  isPostPayloadServer,
  type PostQueryFilter,
  type PostPayloadClient,
  type PostPayloadServer,
}                         from './post.ts'

import type {
  EventDirtyPayload,
  EventDongPayload,
  EventErrorPayload,
  EventFriendshipPayload,
  EventHeartbeatPayload,
  EventLoginPayload,
  EventLogoutPayload,
  EventMessagePayload,
  EventPostPayload,
  EventReadyPayload,
  EventResetPayload,
  EventRoomInvitePayload,
  EventRoomJoinPayload,
  EventRoomLeavePayload,
  EventRoomTopicPayload,
  EventRoomAnnouncePayload,
  EventScanPayload,
}                             from './event.ts'
import type {
  RoomPayload,
  RoomQueryFilter,
  RoomMemberPayload,
  RoomMemberQueryFilter,
}                             from './room.ts'
import type {
  RoomInvitationPayload,
}                             from './room-invitation.ts'
import type {
  UrlLinkPayload,
}                             from './url-link.ts'
import type {
  MiniProgramPayload,
}                             from './mini-program.ts'
import type {
  LocationPayload,
}                             from './location.ts'

import type {
  PuppetOptions,
  PuppetEventName,
  ChatEventName,
}                         from './puppet.ts'

import {
  sayablePayloads,
  sayableTypes,
  type SayablePayload,
}                         from './sayable.ts'
import type {
  PaginationRequest,
  PaginationResponse,
}                         from './pagination.ts'

export {
  CHAT_EVENT_DICT,
  ContactGender,
  ContactType,
  DirtyType,
  FriendshipSceneType,
  FriendshipType,
  ImageType,
  isPostPayloadClient,
  isPostPayloadServer,
  MessageType,
  type PaginationRequest,
  type PaginationResponse,
  PostType,
  PUPPET_EVENT_DICT,
  sayablePayloads,
  sayableTypes,
  ScanStatus,
  TapType,
  type ChatEventName,
  type ContactPayload,
  type ContactQueryFilter,
  type EventDirtyPayload,
  type EventDongPayload,
  type EventErrorPayload,
  type EventFriendshipPayload,
  type EventHeartbeatPayload,
  type EventLoginPayload,
  type EventLogoutPayload,
  type EventMessagePayload,
  type EventPostPayload,
  type EventReadyPayload,
  type EventResetPayload,
  type EventRoomInvitePayload,
  type EventRoomJoinPayload,
  type EventRoomLeavePayload,
  type EventRoomTopicPayload,
  type EventRoomAnnouncePayload,
  type EventScanPayload,
  type FriendshipAddOptions,
  type FriendshipPayload,
  type FriendshipPayloadConfirm,
  type FriendshipPayloadReceive,
  type FriendshipPayloadVerify,
  type FriendshipSearchQueryFilter,
  type LocationPayload,
  type MessagePayload,
  type MessagePayloadBase,
  type MessagePayloadRoom,
  type MessagePayloadTo,
  type MessageQueryFilter,
  type MiniProgramPayload,
  type PostPayload,
  type PostPayloadClient,
  type PostPayloadServer,
  type PostQueryFilter,
  type PuppetEventName,
  type PuppetOptions,
  type RoomInvitationPayload,
  type RoomMemberPayload,
  type RoomMemberQueryFilter,
  type RoomPayload,
  type RoomQueryFilter,
  type SayablePayload,
  type TapPayload,
  type TapQueryFilter,
  type UrlLinkPayload,
  YOU,
}
