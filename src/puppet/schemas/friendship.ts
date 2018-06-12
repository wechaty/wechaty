export enum FriendRequestType {
  Unknown = 0,
  Confirm,
  Receive,
  Verify,
}

export interface FriendRequestPayloadBase {
  id        : string,

  contactId : string,
  hello?    : string,
}

export type FriendRequestPayloadConfirm = FriendRequestPayloadBase & {
  type      : FriendRequestType.Confirm,
}

export type FriendRequestPayloadReceive = FriendRequestPayloadBase & {
  stranger? : string,
  ticket    : string,
  type      : FriendRequestType.Receive,
}

export type FriendRequestPayloadVerify = FriendRequestPayloadBase & {
  type      : FriendRequestType.Verify,
}

export type FriendRequestPayload = FriendRequestPayloadConfirm
                                  | FriendRequestPayloadReceive
                                  | FriendRequestPayloadVerify
