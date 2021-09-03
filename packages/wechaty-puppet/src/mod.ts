import {
  FileBoxType,
  FileBox,
}                         from 'file-box'
import {
  MemoryCard,
}                         from 'memory-card'
import {
  StateSwitch,
}                         from 'state-switch'
import {
  looseInstanceOfClass,
  instanceToClass,
}                         from 'clone-class'

import {
  Puppet,
  PuppetImplementation,
}                         from './puppet.js'
import {
  ContactGender,
  ContactType,
  ContactPayload,
  ContactQueryFilter,
}                             from './schemas/contact.js'
import {
  ScanStatus,
}                             from './schemas/event.js'
import {
  FriendshipAddOptions,
  FriendshipPayload,
  FriendshipPayloadConfirm,
  FriendshipPayloadReceive,
  FriendshipPayloadVerify,
  FriendshipSearchQueryFilter,
  FriendshipType,
  FriendshipSceneType,
}                             from './schemas/friendship.js'
import {
  ImageType,
}                             from './schemas/image.js'
import {
  MessagePayload,
  MessagePayloadBase,
  MessagePayloadRoom,
  MessagePayloadTo,
  MessageQueryFilter,
  MessageType,
}                             from './schemas/message.js'
import {
  throwUnsupportedError,
}                             from './throw-unsupported-error.js'
import { PayloadType }         from './schemas/payload.js'
import {
  /**
   * Huan(202003): XXX_DICT
   *  The following two data structure is for the downstream
   *  to get a array of event string list.
   */
  CHAT_EVENT_DICT,
  PUPPET_EVENT_DICT,

  YOU,
}                         from './schemas/puppet.js'
import {
  VERSION,
  log,
}                         from './config.js'

import {
  EventDirtyPayload,
  EventDongPayload,
  EventErrorPayload,
  EventFriendshipPayload,
  EventHeartbeatPayload,
  EventLoginPayload,
  EventLogoutPayload,
  EventMessagePayload,
  EventReadyPayload,
  EventResetPayload,
  EventRoomInvitePayload,
  EventRoomJoinPayload,
  EventRoomLeavePayload,
  EventRoomTopicPayload,
  EventScanPayload,
}                             from './schemas/event.js'

import {
  RoomPayload,
  RoomQueryFilter,
  RoomMemberPayload,
  RoomMemberQueryFilter,
}                             from './schemas/room.js'
import {
  RoomInvitationPayload,
}                             from './schemas/room-invitation.js'
import {
  UrlLinkPayload,
}                             from './schemas/url-link.js'
import {
  MiniProgramPayload,
}                             from './schemas/mini-program.js'
import {
  PuppetOptions,
  PuppetEventName,
  // PuppetQRCodeScanEvent,
  // PuppetRoomInviteEvent,
  // PuppetRoomJoinEvent,
  // PuppetRoomLeaveEvent,
  // PuppetRoomTopicEvent,
  // Receiver,
}                       from './schemas/puppet.js'

export {
  CHAT_EVENT_DICT,
  ContactGender,
  ContactPayload,
  ContactQueryFilter,
  ContactType,
  EventDirtyPayload,
  EventDongPayload,
  EventErrorPayload,
  EventFriendshipPayload,
  EventHeartbeatPayload,
  EventLoginPayload,
  EventLogoutPayload,
  EventMessagePayload,
  EventReadyPayload,
  EventResetPayload,
  EventRoomInvitePayload,
  EventRoomJoinPayload,
  EventRoomLeavePayload,
  EventRoomTopicPayload,
  EventScanPayload,
  FileBox,
  FileBoxType,
  FriendshipAddOptions,
  FriendshipPayload,
  FriendshipPayloadConfirm,
  FriendshipPayloadReceive,
  FriendshipPayloadVerify,
  FriendshipSceneType,
  FriendshipSearchQueryFilter,
  FriendshipType,
  ImageType,
  instanceToClass,
  log,
  looseInstanceOfClass,
  MemoryCard,
  MessagePayload,
  MessagePayloadBase,
  MessagePayloadRoom,
  MessagePayloadTo,
  MessageQueryFilter,
  MessageType,
  MiniProgramPayload,
  PayloadType,
  PUPPET_EVENT_DICT,
  Puppet,
  PuppetEventName,
  PuppetImplementation,
  PuppetOptions,
  RoomInvitationPayload,
  RoomMemberPayload,
  RoomMemberQueryFilter,
  RoomPayload,
  RoomQueryFilter,
  ScanStatus,
  StateSwitch,
  throwUnsupportedError,
  UrlLinkPayload,
  VERSION,
  YOU,
}
