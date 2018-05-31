export enum ContantGender {
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
  id:         string,
  gender:     ContantGender,
  type:       ContactType,

  address?:   string,
  alias?:     string | null,
  avatar?:    string,
  city?:      string,
  friend?:    boolean,
  name?:      string,
  province?:  string,
  signature?: string,
  star?:      boolean,
  weixin?:    string,
}

export type ContactPayloadFilterFunction = (payload: ContactPayload) => boolean
export type ContactPayloadFilterFactory  = (query: ContactQueryFilter) => ContactPayloadFilterFunction
