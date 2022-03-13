enum ContactGender {
  Unknown = 0,
  Male    = 1,
  Female  = 2,
}

/**
 * Huan(202004) TODO: Lock the ENUM number (like protobuf) ?
 */
enum ContactType {
  Unknown     = 0,
  Individual  = 1,
  Official    = 2,
  Corporation = 3,
}

interface ContactQueryFilter {
  alias?:  string | RegExp,
  id?:     string,
  name?:   string | RegExp,
  weixin?:  string,
}

interface ContactPayload {
  id     : string
  gender : ContactGender
  type   : ContactType
  name   : string
  avatar : string

  address?   : string  // Huan(202001): what's this for?
  alias?     : string
  city?      : string
  friend?    : boolean
  province?  : string
  signature? : string
  star?      : boolean

  /**
   * @deprecated use `handle` instead
   *  @see https://github.com/wechaty/puppet/issues/181
   */
  weixin? : string
  /**
   * "A Twitter handle is the username that appears at the end of your unique Twitter URL."
   *  - Twitter: @handle (https://twitter.com/handle)
   *  - Facebook: https://facebook.com/handle
   */
  handle? : string

  phone        : string[]
  corporation? : string
  title?       : string
  description? : string
  coworker?    : boolean
}

/** @hidden */
type ContactPayloadFilterFunction = (payload: ContactPayload) => boolean

/** @hidden */
type ContactPayloadFilterFactory  = (query: ContactQueryFilter) => ContactPayloadFilterFunction

export {
  ContactGender,
  ContactType,
  type ContactPayload,
  type ContactPayloadFilterFactory,
  type ContactPayloadFilterFunction,
  type ContactQueryFilter,
}
