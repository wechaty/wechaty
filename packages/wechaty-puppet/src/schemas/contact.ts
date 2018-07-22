export enum ContactGender {
  Unknown = 0,
  Male    = 1,
  Female  = 2,
}

export enum ContactType {
  Unknown = 0,
  Personal,
  Official,
}

export interface ContactQueryFilter {
  name?:   string | RegExp,
  alias?:  string | RegExp,
}

export interface ContactPayload {
  id     : string,
  gender : ContactGender,
  type   : ContactType,
  name   : string,
  avatar : string,

  address?   : string,
  alias?     : string,
  city?      : string,
  friend?    : boolean,
  province?  : string,
  signature? : string,
  star?      : boolean,
  weixin?    : string,
}

/** @hidden */
export type ContactPayloadFilterFunction = (payload: ContactPayload) => boolean

/** @hidden */
export type ContactPayloadFilterFactory  = (query: ContactQueryFilter) => ContactPayloadFilterFunction
