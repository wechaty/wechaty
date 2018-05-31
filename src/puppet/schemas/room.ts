export interface RoomMemberQueryFilter {
  name?         : string,
  roomAlias?    : string,
  contactAlias? : string,
}

export interface RoomQueryFilter {
  topic: string | RegExp,
}

export interface RoomPayload {
  id : string,

  topic        : string,
  memberIdList : string[],
  ownerId?     : string,
  aliasDict    : { [contactId: string]: string | undefined }  // room alias
  // nameMap         : Map<string, string>,
  // roomAliasMap    : Map<string, string>,
  // contactAliasMap : Map<string, string>,
  // [index: string]:  Map<string, string> | string | number | PuppeteerContact[],
}

export type RoomPayloadFilterFunction = (payload: RoomPayload)    => boolean
export type RoomPayloadFilterFactory  = (query: RoomQueryFilter)    => RoomPayloadFilterFunction
