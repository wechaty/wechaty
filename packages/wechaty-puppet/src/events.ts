import { EventEmitter }   from 'events'
import TypedEventEmitter  from 'typed-emitter'

import {
  EventDirtyPayload,
  EventDongPayload,
  EventErrorPayload,
  EventFriendshipPayload,
  EventLoginPayload,
  EventLogoutPayload,
  EventMessagePayload,
  EventResetPayload,
  EventRoomJoinPayload,
  EventRoomLeavePayload,
  EventRoomTopicPayload,
  EventRoomInvitePayload,
  EventScanPayload,
  EventReadyPayload,
  EventHeartbeatPayload,
}                                 from './schemas/event'

export type PuppetDirtyListener      = (payload: EventDirtyPayload)       => void
export type PuppetDongListener       = (payload: EventDongPayload)        => void
export type PuppetErrorListener      = (payload: EventErrorPayload)       => void
export type PuppetFriendshipListener = (payload: EventFriendshipPayload)  => void
export type PuppetHeartbeatListener  = (payload: EventHeartbeatPayload)   => void
export type PuppetLoginListener      = (payload: EventLoginPayload)       => void
export type PuppetLogoutListener     = (payload: EventLogoutPayload)      => void
export type PuppetMessageListener    = (payload: EventMessagePayload)     => void
export type PuppetReadyListener      = (payload: EventReadyPayload)       => void
export type PuppetResetListener      = (payload: EventResetPayload)       => void
export type PuppetRoomInviteListener = (payload: EventRoomInvitePayload)  => void
export type PuppetRoomJoinListener   = (payload: EventRoomJoinPayload)    => void
export type PuppetRoomLeaveListener  = (payload: EventRoomLeavePayload)   => void
export type PuppetRoomTopicListener  = (payload: EventRoomTopicPayload)   => void
export type PuppetScanListener       = (payload: EventScanPayload)        => void

interface PuppetEvents {
  dirty         : PuppetDirtyListener
  dong          : PuppetDongListener
  error         : PuppetErrorListener
  friendship    : PuppetFriendshipListener
  heartbeat     : PuppetHeartbeatListener
  login         : PuppetLoginListener
  logout        : PuppetLogoutListener
  message       : PuppetMessageListener
  ready         : PuppetReadyListener
  reset         : PuppetResetListener
  'room-invite' : PuppetRoomInviteListener
  'room-join'   : PuppetRoomJoinListener
  'room-leave'  : PuppetRoomLeaveListener
  'room-topic'  : PuppetRoomTopicListener
  scan          : PuppetScanListener
}

export const PuppetEventEmitter = EventEmitter as new () => TypedEventEmitter<
  PuppetEvents
>
