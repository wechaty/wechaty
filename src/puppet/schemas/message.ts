export enum MessageType {
  Unknown = 0,
  Attachment,
  Audio,
  Contact,
  Emoticon,
  Image,
  Text,
  Video,
}

export interface MessagePayloadBase {
  id            : string,
  contactId?    : string,        // Contact ShareCard
  filename?     : string,
  text?         : string,
  timestamp     : number,        // Unix Timestamp(in seconds)
  type          : MessageType,
}

export interface MessagePayloadRoom {
  fromId?        : string,
  // mentionIdList? : string[],   // Mentioned Contacts' Ids
  roomId         : string,
  toId?          : string,     // if to is not set, then room must be set
}

export interface MessagePayloadTo {
  fromId  : string,
  roomId? : string,
  toId    : string,   // if to is not set, then room must be set
}

export type MessagePayload = MessagePayloadBase
                            & (
                                MessagePayloadRoom
                              | MessagePayloadTo
                            )
