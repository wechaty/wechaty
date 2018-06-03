export enum MessageType {
  Unknown = 0,
  Attachment,
  Audio,
  Emoticon,
  Image,
  Text,
  Video,
}

export interface MessagePayloadBase {
  id : string,

  type : MessageType,

  filename? : string,
  fromId    : string,
  text?     : string,
  timestamp : number,   // milliseconds
}

export interface MessagePayloadRoom {
  roomId : string,
  toId?  : string,   // if to is not set, then room must be set
}

export interface MessagePayloadTo {
  roomId? : string,
  toId    : string,   // if to is not set, then room must be set
}

export type MessagePayload = MessagePayloadBase & (MessagePayloadRoom | MessagePayloadTo)
