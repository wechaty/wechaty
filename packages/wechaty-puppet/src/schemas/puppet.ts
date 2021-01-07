/**
 * This is used internally to as a placeholder for the bot name.
 *
 * For example:
 *  we should replace '你' and 'You' to YOU.
 *
 * See: https://github.com/Microsoft/TypeScript/issues/20898#issuecomment-354073352
 *
 * Huan(202003): `YOU` must NOT be passed to the `Wechaty`
 *  `YOU` is only for the wechaty-puppet-XXX internal usage only.
 *  because it might be transported via the GRPC interface,
 *  which can not serialize the `YOU` Symbol correctly.
 *
 */
export const YOU = Symbol('You')
export type YOU  = typeof YOU

/** @hidden */
export const CHAT_EVENT_DICT = {
  friendship    : 'receive a friend request',
  login         : 'puppet had logged in',
  logout        : 'puppet had logged out',
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
  dirty     : 'dirty the cache payload',
  dong      : 'emit this event if you received a ding() call',
  error     : "emit an Error instance when there's any Error need to report to Wechaty",
  // Huan(202003): rename `watchdog` to `heartbeat`
  // watchdog  : 'feed the watchdog by emit this event',
  heartbeat : 'feed the watchdog by emit this event',
  ready     : 'emit this event after the puppet is ready(you define it)',
  reset     : 'reset the puppet by emit this event',
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
