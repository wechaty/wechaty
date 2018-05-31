export enum MessageType {
  Unknown = 0,
  Attachment,
  Audio,
  Emoticon,
  Image,
  Text,
  Video,
}

export interface MessagePayload {
  id : string,

  type : MessageType,

  filename? : string,
  fromId?   : string,
  roomId?   : null | string,
  text?     : string,
  timestamp : number,          // milliseconds
  toId?     : null | string,   // if to is not set, then room must be set
}
