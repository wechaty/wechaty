/**
 * Public `wechaty-puppet/filters` entry point: the query filter types.
 */
import type {
  ContactQueryFilter,
  FriendshipSearchQueryFilter,
  MessageQueryFilter,
  PaginationRequest,
  PaginationResponse,
  PostQueryFilter,
  RoomMemberQueryFilter,
  RoomQueryFilter,
  TapQueryFilter,
}                           from '../schemas/mod.ts'

export type {
  ContactQueryFilter          as Contact,
  FriendshipSearchQueryFilter as Friendship,
  MessageQueryFilter          as Message,
  PaginationRequest,
  PaginationResponse,
  PostQueryFilter             as Post,
  RoomMemberQueryFilter       as RoomMember,
  RoomQueryFilter             as Room,
  TapQueryFilter              as Tap,
}
