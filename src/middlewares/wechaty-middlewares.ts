/**
 * Wechaty MiddleWare Interfaces
 */

import type {
  WechatyEventListenerDong,
  WechatyEventListenerError,
  WechatyEventListenerFriendship,
  WechatyEventListenerHeartbeat,
  WechatyEventListenerLogin,
  WechatyEventListenerLogout,
  WechatyEventListenerMessage,
  WechatyEventListenerPuppet,
  WechatyEventListenerReady,
  WechatyEventListenerRoomInvite,
  WechatyEventListenerRoomJoin,
  WechatyEventListenerRoomLeave,
  WechatyEventListenerRoomTopic,
  WechatyEventListeners,
  WechatyEventListenerScan,
  WechatyEventListenerStartStop,
} from '../events/wechaty-events.js'

type AddFunctionParameters<
  TFunction extends (...args: any) => any,
  TParameters extends [...args: any]
> = (
  ...args: [...Parameters<TFunction>, ...TParameters]
) => ReturnType<TFunction>;

type WechatyMiddleWareDong       = AddFunctionParameters<WechatyEventListenerDong, [ next: () => void | Promise<void> ]> & { eventType?: keyof WechatyEventListeners};
type WechatyMiddleWareError      = AddFunctionParameters<WechatyEventListenerError, [ next: () => void | Promise<void> ]> & { eventType?: keyof WechatyEventListeners};
type WechatyMiddleWareFriendship = AddFunctionParameters<WechatyEventListenerFriendship, [ next: () => void | Promise<void> ]> & { eventType?: keyof WechatyEventListeners};
type WechatyMiddleWareHeartbeat  = AddFunctionParameters<WechatyEventListenerHeartbeat, [ next: () => void | Promise<void> ]> & { eventType?: keyof WechatyEventListeners};
type WechatyMiddleWareLogin      = AddFunctionParameters<WechatyEventListenerLogin, [ next: () => void | Promise<void> ]> & { eventType?: keyof WechatyEventListeners};
type WechatyMiddleWareLogout     = AddFunctionParameters<WechatyEventListenerLogout, [ next: () => void | Promise<void> ]> & { eventType?: keyof WechatyEventListeners};
type WechatyMiddleWareMessage    = AddFunctionParameters<WechatyEventListenerMessage, [ next: () => void | Promise<void> ]> & { eventType?: keyof WechatyEventListeners};
type WechatyMiddleWarePuppet     = AddFunctionParameters<WechatyEventListenerPuppet, [ next: () => void | Promise<void> ]> & { eventType?: keyof WechatyEventListeners};
type WechatyMiddleWareReady      = AddFunctionParameters<WechatyEventListenerReady, [ next: () => void | Promise<void> ]> & { eventType?: keyof WechatyEventListeners};
type WechatyMiddleWareRoomInvite = AddFunctionParameters<WechatyEventListenerRoomInvite, [ next: () => void | Promise<void> ]> & { eventType?: keyof WechatyEventListeners};
type WechatyMiddleWareRoomJoin   = AddFunctionParameters<WechatyEventListenerRoomJoin, [ next: () => void | Promise<void> ]> & { eventType?: keyof WechatyEventListeners};
type WechatyMiddleWareRoomLeave  = AddFunctionParameters<WechatyEventListenerRoomLeave, [ next: () => void | Promise<void> ]> & { eventType?: keyof WechatyEventListeners};
type WechatyMiddleWareRoomTopic  = AddFunctionParameters<WechatyEventListenerRoomTopic, [ next: () => void | Promise<void> ]> & { eventType?: keyof WechatyEventListeners};
type WechatyMiddleWareScan       = AddFunctionParameters<WechatyEventListenerScan, [ next: () => void | Promise<void> ]> & { eventType?: keyof WechatyEventListeners};
type WechatyMiddleWareStartStop  = AddFunctionParameters<WechatyEventListenerStartStop, [ next: () => void | Promise<void> ]> & { eventType?: keyof WechatyEventListeners};

interface WechatyMiddleWares {
  'room-invite' : WechatyMiddleWareRoomInvite
  'room-join'   : WechatyMiddleWareRoomJoin
  'room-leave'  : WechatyMiddleWareRoomLeave
  'room-topic'  : WechatyMiddleWareRoomTopic
  dong          : WechatyMiddleWareDong
  error         : WechatyMiddleWareError
  friendship    : WechatyMiddleWareFriendship
  heartbeat     : WechatyMiddleWareHeartbeat
  login         : WechatyMiddleWareLogin
  logout        : WechatyMiddleWareLogout
  message       : WechatyMiddleWareMessage
  puppet        : WechatyMiddleWarePuppet
  ready         : WechatyMiddleWareReady
  scan          : WechatyMiddleWareScan
  start         : WechatyMiddleWareStartStop
  stop          : WechatyMiddleWareStartStop
}

export interface TypedMiddleWareEventEmitter<Events, MiddleWares> {
  on<E extends (keyof Events & keyof MiddleWares)> (event: E, middleware: MiddleWares[E] | MiddleWares[E][], listener: Events[E]): this
}

export type {
  WechatyMiddleWares,
  WechatyMiddleWareDong,
  WechatyMiddleWareError,
  WechatyMiddleWareFriendship,
  WechatyMiddleWareHeartbeat,
  WechatyMiddleWareLogin,
  WechatyMiddleWareLogout,
  WechatyMiddleWareMessage,
  WechatyMiddleWarePuppet,
  WechatyMiddleWareReady,
  WechatyMiddleWareRoomInvite,
  WechatyMiddleWareRoomJoin,
  WechatyMiddleWareRoomLeave,
  WechatyMiddleWareRoomTopic,
  WechatyMiddleWareScan,
  WechatyMiddleWareStartStop,
}
