import type { DirtyType } from './dirty.js'

/**
 * The event `scan` status number.
 */
export enum ScanStatus {
  Unknown   = 0,
  Cancel    = 1,
  Waiting   = 2,
  Scanned   = 3,
  Confirmed = 4,
  Timeout   = 5,
}

export interface EventFriendshipPayload {
  friendshipId: string,
}

export interface EventLoginPayload {
  contactId: string,
}

export interface EventLogoutPayload {
  contactId : string,
  data?     : string,
}

export interface EventMessagePayload {
  messageId: string,
}

export interface EventPostPayload {
  postId: string,
}

export interface EventRoomInvitePayload {
  roomInvitationId: string,
}

export interface EventRoomJoinPayload {
  inviteeIdList : string[],
  inviterId     : string,
  roomId        : string,
  timestamp     : number,
}

export interface EventRoomLeavePayload {
  removeeIdList : string[],
  removerId     : string,
  roomId        : string,
  timestamp     : number,
}

export interface EventRoomTopicPayload {
  changerId : string,
  newTopic  : string,
  oldTopic  : string,
  roomId    : string,
  timestamp : number,
}

export interface EventScanPayload {
  status: ScanStatus,

  qrcode? : string,
  data?   : string,
}

export interface EventDongPayload {
  data?: string,
}

/**
 * GError.stringify-ed string
 *  @see https://github.com/huan/gerror
 *
 * TODO: remove `?` on `gerror` after Dec 31, 2022
 * TODO: remove `data` after Dec 31, 2022
 */
export type EventErrorPayload = {
  data?   : string  // <- deprecated. use `gerror` instead.
  gerror? : string
}

export interface EventReadyPayload {
  data?: string,
}

export interface EventResetPayload {
  data?: string,
}

export interface EventHeartbeatPayload {
  data?: string,
}

export interface EventDirtyPayload {
  payloadType : DirtyType,
  payloadId   : string,
}

export type EventPayload =
  | EventDirtyPayload
  | EventDongPayload
  | EventErrorPayload
  | EventFriendshipPayload
  | EventHeartbeatPayload
  | EventLoginPayload
  | EventLogoutPayload
  | EventMessagePayload
  | EventReadyPayload
  | EventResetPayload
  | EventRoomInvitePayload
  | EventRoomJoinPayload
  | EventRoomLeavePayload
  | EventRoomTopicPayload
  | EventScanPayload
