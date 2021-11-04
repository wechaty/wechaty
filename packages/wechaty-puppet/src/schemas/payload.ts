/**
 * Huan(202008): Like the GRPC, we must not change the number below.
 *  When we are adding new types, just increase the maximum number by +1!
 */
export enum PayloadType {
  Unspecified = 0,
  Message     = 1,
  Contact     = 2,
  Room        = 3,
  RoomMember  = 4,
  Friendship  = 5,
}
