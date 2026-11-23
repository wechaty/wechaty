export interface RoomMemberQueryFilter {
  name?         : string,
  roomAlias?    : string,
  contactAlias? : string,
}

export interface RoomQueryFilter {
  id?    : string
  topic? : string | RegExp,
}

export interface RoomPayload {
  id : string

  topic        : string
  avatar?      : string

  /**
   * Proposal: add a handle field to RoomPayload #181
   *  "A Twitter handle is the username that appears at the end of your unique Twitter URL."
   *  @link https://github.com/wechaty/puppet/issues/181
   */
  handle?      : string

  memberIdList : string[]
  ownerId?     : string
  adminIdList  : string[]
  external?    : boolean
}

export interface RoomMemberPayload {
  id         : string
  roomAlias? : string,   // "李佳芮-群里设置的备注", `chatroom_nick_name`
  inviterId? : string,   // "wxid_7708837087612",
  avatar     : string,
  name       : string,
}

/** @hidden */
export type RoomPayloadFilterFunction = (payload: RoomPayload)    => boolean

/** @hidden */
export type RoomPayloadFilterFactory  = (query: RoomQueryFilter)  => RoomPayloadFilterFunction
