export enum ContactGender {
  Unknown = 0,
  Male    = 1,
  Female  = 2,
}

/**
 * Huan(202004) TODO: Lock the ENUM number (like protobuf) ?
 */
export enum ContactType {
  Unknown     = 0,
  Individual  = 1,
  Official    = 2,
  Corporation = 3,
}

export interface ContactQueryFilter {
  alias?:  string | RegExp,
  id?:     string,
  name?:   string | RegExp,
  weixin?:  string,
}

export interface ContactPayload {
  id     : string,
  gender : ContactGender,
  type   : ContactType,
  name   : string,
  avatar : string,

  address?   : string,  // Huan(202001): what's this for?
  alias?     : string,
  city?      : string,
  friend?    : boolean,
  province?  : string,
  signature? : string,
  star?      : boolean,
  weixin?    : string,

  phone        : string[],
  corporation? : string,
  title?       : string,
  description? : string,
  coworker?    : boolean,
}

/** @hidden */
export type ContactPayloadFilterFunction = (payload: ContactPayload) => boolean

/** @hidden */
export type ContactPayloadFilterFactory  = (query: ContactQueryFilter) => ContactPayloadFilterFunction
