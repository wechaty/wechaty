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
  roomName: string,
  url: string,
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

export const CHAT_EVENT_DICT = {
  friendship  : 'document can be written at here',
  login       : 'document can be written at here',
  logout      : 'document can be written at here',
  message     : 'document can be written at here',
  'room-invite': 'document can be written at here',
  'room-join' : 'document can be written at here',
  'room-leave': 'document can be written at here',
  'room-topic': 'document can be written at here',
  scan        : 'document can be written at here',
}
export type ChatEventName = keyof typeof CHAT_EVENT_DICT

export const PUPPET_EVENT_DICT = {
  ...CHAT_EVENT_DICT,
  dong      : 'document can be written at here',
  error     : 'document can be written at here',
  reset     : 'push to reset!',
  watchdog  : 'document can be written at here',
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
