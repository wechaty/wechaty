/**
 * TODO: Huan(202002) clean the deprecated properties
 */
export interface RoomInvitationPayload {
  id               : string,
  inviterId        : string,

  roomTopic?       : string,  // deprecated. use topic instead.
  topic?           : string

  avatar?          : string,
  invitation?      : string,

  roomMemberCount? : number,  // deprecated. use memberCount instead.
  memberCount?     : number,

  roomMemberIdList?: string[],  // deprecated. use memberIdList instead.
  memberIdList?    : string[],  // Friends' Contact Id List of the Room

  timestamp        : number,     // Unix Timestamp, in seconds or milliseconds
}
