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

export interface PuppetQrcodeScanEvent {
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
}

export interface PuppetRoomLeaveEvent {
  leaverNameList : Array<(string | YOU)>,
  removerName    : string | YOU,
  roomId         : string,
}

export interface PuppetRoomTopicEvent {
  changerName : string | YOU,
  roomId      : string,
  topic       : string,
}

/** @hidden */
export const CHAT_EVENT_DICT = {
  friendship    : 'todo: explain what this event is',
  login         : 'todo: explain what this event is',
  logout        : 'todo: explain what this event is',
  message       : 'todo: explain what this event is',
  'room-invite' : 'todo: explain what this event is',
  'room-join'   : 'todo: explain what this event is',
  'room-leave'  : 'todo: explain what this event is',
  'room-topic'  : 'todo: explain what this event is',
  scan          : 'todo: explain what this event is',
}
export type ChatEventName = keyof typeof CHAT_EVENT_DICT

/** @hidden */
export const PUPPET_EVENT_DICT = {
  ...CHAT_EVENT_DICT,
  dong      : 'todo: explain what this event is',
  error     : 'todo: explain what this event is',
  reset     : 'push to reset!',
  watchdog  : 'todo: explain what this event is',
}

export type PuppetEventName = keyof typeof PUPPET_EVENT_DICT

/**
 * timeout: WatchDog Timeout in Seconds
 */
export interface PuppetOptions {
  endpoint? : string,
  timeout?  : number,
  token?    : string,
}

export interface Receiver {
  contactId? : string,
  roomId?    : string,
}
