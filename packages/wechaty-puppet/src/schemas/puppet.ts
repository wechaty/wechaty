// tslint:disable:object-literal-key-quotes

/**
 * This is used internally to as a placeholder for the bot name.
 *
 * For example:
 *  we should replace '你' and 'You' to YOU.
 *
 * See: https://github.com/Microsoft/TypeScript/issues/20898#issuecomment-354073352
 */
export const YOU = Symbol('You')
export type YOU  = typeof YOU

export interface PuppetQRCodeScanEvent {
  data?  : string,   // Other Data
  qrcode : string,   // QR Code Data
  status : number,   // Status Code
}

export interface PuppetRoomInviteEvent {
  inviterId : string,
  roomId    : string,
}

export interface PuppetRoomJoinEvent {
  inviteeNameList : Array<(string | YOU)>,
  inviterName     : string | YOU,
  roomId          : string,
  timestamp       : number, // Unix Timestamp, in seconds
}

export interface PuppetRoomLeaveEvent {
  leaverNameList : Array<(string | YOU)>,
  removerName    : string | YOU,
  roomId         : string,
  timestamp      : number,  // Unix Timestamp, in seconds
}

export interface PuppetRoomTopicEvent {
  changerName : string | YOU,
  roomId      : string,
  topic       : string,
  timestamp   : number, // Unix Timestamp, in seconds
}

/** @hidden */
export const CHAT_EVENT_DICT = {
  friendship    : 'receive a friend request',
  login         : 'puppet had logined',
  logout        : 'puppet had logouted',
  message       : 'received a new message',
  'room-invite' : 'received a room invitation',
  'room-join'   : 'be added to a room',
  'room-leave'  : 'leave or be removed from a room',
  'room-topic'  : 'room topic had been changed',
  scan          : 'a QR Code scan is required',
}
export type ChatEventName = keyof typeof CHAT_EVENT_DICT

/** @hidden */
export const PUPPET_EVENT_DICT = {
  ...CHAT_EVENT_DICT,
  dong      : 'emit this event if you received a ding() call',
  error     : `emit an Error instance when there's any Error need to report to Wechaty`,
  ready     : 'emit this event after the puppet is ready(you define it)',
  reset     : 'reset the puppet by emit this event',
  watchdog  : 'feed the watchdog by emit this event',
}

export type PuppetEventName = keyof typeof PUPPET_EVENT_DICT

/**
 * endpoint: URL/Path for the puppet underlining system
 * timeout: WatchDog Timeout in Seconds
 */
export interface PuppetOptions {
  endpoint? : string,
  timeout?  : number,
  token?    : string,

  [ puppetOptionKey: string ]: unknown,

}

/**
 * @deprecated Huan(202002) use (conversationalId: string) instead.
 */
// export interface Receiver {
//   contactId? : string,
//   roomId?    : string,
// }
