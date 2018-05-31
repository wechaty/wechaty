export enum FriendRequestType {
  Unknown = 0,
  Receive,
  Confirm,
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
  ticket    : string
  type      : FriendRequestType.Receive,
}

export type FriendRequestPayload = FriendRequestPayloadReceive
                                  | FriendRequestPayloadConfirm
