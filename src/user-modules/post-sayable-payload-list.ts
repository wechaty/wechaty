import type {
  type,
  payload,
}           from 'wechaty-puppet'

import type { FileBoxInterface } from 'file-box'

interface SayablePayloadAttatchment {
  type: type.Message.Attachment
  payload: FileBoxInterface
}

interface SayablePayloadAudio {
  type: type.Message.Audio
  payload: FileBoxInterface
}

interface SayablePayloadContact {
  type: type.Message.Contact
  payload: string
}

interface SayablePayloadEmoticon {
  type: type.Message.Emoticon
  payload: FileBoxInterface
}

interface SayablePayloadImage {
  type: type.Message.Image
  payload: FileBoxInterface
}

interface SayablePayloadLocation {
  type: type.Message.Location
  payload: payload.Location
}

interface SayablePayloadMiniProgram {
  type: type.Message.MiniProgram
  payload: payload.MiniProgram
}

interface SayablePayloadText {
  type: type.Message.Text
  payload: string
}

interface SayablePayloadUrl {
  type: type.Message.Url
  payload: payload.UrlLink
}

interface SayablePayloadVideo {
  type: type.Message.Video
  payload: FileBoxInterface
}

type SayablePayload =
  | SayablePayloadAttatchment
  | SayablePayloadAudio
  | SayablePayloadContact
  | SayablePayloadEmoticon
  | SayablePayloadImage
  | SayablePayloadLocation
  | SayablePayloadMiniProgram
  | SayablePayloadText
  | SayablePayloadUrl
  | SayablePayloadVideo

// TODO: add an unit test to confirm that all unsupported type are listed here
type SayablePayloadUnsupportedType =
  | 'ChatHistory'
  | 'GroupNote'
  | 'Recalled'
  | 'RedEnvolop'

export type {
  SayablePayload,
}
