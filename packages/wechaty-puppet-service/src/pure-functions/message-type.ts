/**
 * Translates Puppet message kinds to the published Protobuf response enum.
 * PuppetServer uses this mapping for callers that opt in to Protobuf numbering.
 */
import { types } from 'wechaty-puppet'
import { MessageType } from 'wechaty-grpc'

const { Message } = types

const protoMessageTypeByPuppetType = {
  [Message.Unknown]: MessageType.UNSPECIFIED,
  [Message.Attachment]: MessageType.ATTACHMENT,
  [Message.Audio]: MessageType.AUDIO,
  [Message.Contact]: MessageType.CONTACT,
  [Message.ChatHistory]: MessageType.CHAT_HISTORY,
  [Message.Emoticon]: MessageType.EMOTICON,
  [Message.Image]: MessageType.IMAGE,
  [Message.Text]: MessageType.TEXT,
  [Message.Location]: MessageType.LOCATION,
  [Message.MiniProgram]: MessageType.MINI_PROGRAM,
  [Message.GroupNote]: MessageType.GROUP_NOTE,
  [Message.Transfer]: MessageType.TRANSFER,
  [Message.RedEnvelope]: MessageType.RED_ENVELOPE,
  [Message.Recalled]: MessageType.RECALLED,
  [Message.Url]: MessageType.URL,
  [Message.Video]: MessageType.VIDEO,
  [Message.Post]: MessageType.POST,
  [Message.System]: MessageType.SYSTEM,
} satisfies Record<types.Message, MessageType>

/** Returns the published Protobuf value, using UNSPECIFIED for an unrecognized provider value. */
export function messageTypeToProto (type: types.Message): MessageType {
  return protoMessageTypeByPuppetType[type] ?? MessageType.UNSPECIFIED
}
