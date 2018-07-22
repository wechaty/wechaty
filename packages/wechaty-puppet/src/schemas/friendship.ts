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
