export enum FriendshipType {
  Unknown = 0,
  Confirm,
  Receive,
  Verify,
}

export interface FriendshipPayloadBase {
  id        : string,

  contactId : string,
  hello?    : string,
}

export type FriendshipPayloadConfirm = FriendshipPayloadBase & {
  type      : FriendshipType.Confirm,
}

export type FriendshipPayloadReceive = FriendshipPayloadBase & {
  stranger? : string,
  ticket    : string,
  type      : FriendshipType.Receive,
}

export type FriendshipPayloadVerify = FriendshipPayloadBase & {
  type      : FriendshipType.Verify,
}

export type FriendshipPayload = FriendshipPayloadConfirm
                                  | FriendshipPayloadReceive
                                  | FriendshipPayloadVerify
