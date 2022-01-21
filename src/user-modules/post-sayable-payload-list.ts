import type {
  types,
  payloads,
}           from 'wechaty-puppet'

import type { FileBoxInterface } from 'file-box'

interface SayablePayloadAttatchment {
  type: types.Message.Attachment
  payload: FileBoxInterface
}

interface SayablePayloadAudio {
  type: types.Message.Audio
  payload: FileBoxInterface
}

interface SayablePayloadContact {
  type: types.Message.Contact
  payload: string
}

interface SayablePayloadEmoticon {
  type: types.Message.Emoticon
  payload: FileBoxInterface
}

interface SayablePayloadImage {
  type: types.Message.Image
  payload: FileBoxInterface
}

interface SayablePayloadLocation {
  type: types.Message.Location
  payload: payloads.Location
}

interface SayablePayloadMiniProgram {
  type: types.Message.MiniProgram
  payload: payloads.MiniProgram
}

interface SayablePayloadText {
  type: types.Message.Text
  payload: string
}

interface SayablePayloadUrl {
  type: types.Message.Url
  payload: payloads.UrlLink
}

interface SayablePayloadVideo {
  type: types.Message.Video
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
