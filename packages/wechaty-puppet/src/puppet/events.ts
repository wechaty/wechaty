import { EventEmitter }         from 'events'
import type TypedEventEmitter   from 'typed-emitter'

import type {
  EventDirtyPayload,
  EventDongPayload,
  EventErrorPayload,
  EventFriendshipPayload,
  EventLoginPayload,
  EventLogoutPayload,
  EventMessagePayload,
  EventPostPayload,
  EventResetPayload,
  EventRoomJoinPayload,
  EventRoomLeavePayload,
  EventRoomTopicPayload,
  EventRoomInvitePayload,
  EventScanPayload,
  EventReadyPayload,
  EventHeartbeatPayload,
}                                 from '../schemas/event.js'

export type PuppetDirtyListener      = (payload: EventDirtyPayload)       => void | Promise<void>
export type PuppetDongListener       = (payload: EventDongPayload)        => void | Promise<void>
export type PuppetErrorListener      = (payload: EventErrorPayload)       => void | Promise<void>
export type PuppetFriendshipListener = (payload: EventFriendshipPayload)  => void | Promise<void>
export type PuppetHeartbeatListener  = (payload: EventHeartbeatPayload)   => void | Promise<void>
export type PuppetLoginListener      = (payload: EventLoginPayload)       => void | Promise<void>
export type PuppetLogoutListener     = (payload: EventLogoutPayload)      => void | Promise<void>
export type PuppetMessageListener    = (payload: EventMessagePayload)     => void | Promise<void>
export type PuppetPostListener       = (payload: EventPostPayload)        => void | Promise<void>
export type PuppetReadyListener      = (payload: EventReadyPayload)       => void | Promise<void>
export type PuppetResetListener      = (payload: EventResetPayload)       => void | Promise<void>
export type PuppetRoomInviteListener = (payload: EventRoomInvitePayload)  => void | Promise<void>
export type PuppetRoomJoinListener   = (payload: EventRoomJoinPayload)    => void | Promise<void>
export type PuppetRoomLeaveListener  = (payload: EventRoomLeavePayload)   => void | Promise<void>
export type PuppetRoomTopicListener  = (payload: EventRoomTopicPayload)   => void | Promise<void>
export type PuppetScanListener       = (payload: EventScanPayload)        => void | Promise<void>

export type PuppetStartListener      = () => void | Promise<void>
export type PuppetStopListener       = () => void | Promise<void>

interface PuppetEventListener {
  dirty         : PuppetDirtyListener
  dong          : PuppetDongListener
  error         : PuppetErrorListener
  friendship    : PuppetFriendshipListener
  heartbeat     : PuppetHeartbeatListener
  login         : PuppetLoginListener
  logout        : PuppetLogoutListener
  message       : PuppetMessageListener
  post          : PuppetPostListener
  ready         : PuppetReadyListener
  reset         : PuppetResetListener
  'room-invite' : PuppetRoomInviteListener
  'room-join'   : PuppetRoomJoinListener
  'room-leave'  : PuppetRoomLeaveListener
  'room-topic'  : PuppetRoomTopicListener
  scan          : PuppetScanListener
  start         : PuppetStartListener,
  stop          : PuppetStopListener,
}

const PuppetEventEmitter = EventEmitter as unknown as new () =>
  TypedEventEmitter<PuppetEventListener>

type PuppetEventName = keyof PuppetEventListener

export type {
  PuppetEventListener,
  PuppetEventName,
}
export {
  PuppetEventEmitter,
}
