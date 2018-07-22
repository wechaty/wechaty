export interface RoomInvitationPayload {
  id        : string,
  inviterId : string,
  roomId    : string,
  timestamp : number, // Unix Timestamp, in seconds
}
