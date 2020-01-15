export enum FriendshipType {
  Unknown = 0,
  Confirm,
  Receive,
  Verify,
}

/** @hidden */
export interface FriendshipPayloadBase {
  id        : string,

  contactId : string,
  hello?    : string,
  timestamp : number, // Unix Timestamp, in seconds
}

/** @hidden */
export type FriendshipPayloadConfirm = FriendshipPayloadBase & {
  type      : FriendshipType.Confirm,
}

/** @hidden */
export type FriendshipPayloadReceive = FriendshipPayloadBase & {
  stranger? : string,
  ticket    : string,
  type      : FriendshipType.Receive,
}

/** @hidden */
export type FriendshipPayloadVerify = FriendshipPayloadBase & {
  type      : FriendshipType.Verify,
}

export type FriendshipPayload = FriendshipPayloadConfirm
                                  | FriendshipPayloadReceive
                                  | FriendshipPayloadVerify

export interface FriendshipSearchCondition {
  phone: string,
  weixin: string,
}

// https://stackoverflow.com/a/48244432/1123955
type AtLeastOne<T, U = {[K in keyof T]: Pick<T, K> }> = Partial<T> & U[keyof U]

export type FriendshipSearchQueryFilter = AtLeastOne<FriendshipSearchCondition>
