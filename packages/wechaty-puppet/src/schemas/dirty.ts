/**
 * Huan(202008): Like the GRPC, we must NOT change the number below.
 *  When we are adding new types, just increase the maximum number by +1!
 *
 * Huan(202201): rename it to DirtyType for a better name?
 */
export enum DirtyType {
  Unspecified = 0,
  Message     = 1,
  Contact     = 2,
  Room        = 3,
  RoomMember  = 4,
  Friendship  = 5,
  Post        = 6,  // Issue #2245 - https://github.com/wechaty/wechaty/issues/2245
}
