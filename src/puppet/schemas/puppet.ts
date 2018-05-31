import {
  MemoryCard,
}                       from 'memory-card'

// export interface ScanPayload {
//   code  : number,   // Code
//   data? : string,   // Image Data URL
//   url   : string,   // QR Code URL
// }

export const CHAT_EVENT_DICT = {
  friend      : 'document can be writen at here',
  login       : 'document can be writen at here',
  logout      : 'document can be writen at here',
  message     : 'document can be writen at here',
  'room-join' : 'document can be writen at here',
  'room-leave': 'document can be writen at here',
  'room-topic': 'document can be writen at here',
  scan        : 'document can be writen at here',
}
export type ChatEventName = keyof typeof CHAT_EVENT_DICT

export const PUPPET_EVENT_DICT = {
  ...CHAT_EVENT_DICT,
  error     : 'document can be writen at here',
  // heartbeat : 'document can be writen at here',
  start     : 'document can be writen at here',
  stop      : 'document can be writen at here',
  watchdog  : 'document can be writen at here',
}

export type PuppetEventName = keyof typeof PUPPET_EVENT_DICT

export interface PuppetOptions {
  memory: MemoryCard,
}

export interface Receiver {
  contactId? : string,
  roomId?    : string,
}
