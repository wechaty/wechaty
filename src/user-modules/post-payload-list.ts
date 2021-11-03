import type {
  type,
  payload,
}           from 'wechaty-puppet'

import type { FileBoxInterface } from 'file-box'

interface PostContentPayloadAttatchment {
  type: type.Message.Attachment,
  payload: FileBoxInterface,
}

interface PostContentPayloadAudio {
  type: type.Message.Audio,
  payload: FileBoxInterface,
}

interface PostContentPayloadContact {
  type: type.Message.Contact,
  payload: string,
}

interface PostContentPayloadEmoticon {
  type: type.Message.Emoticon,
  payload: FileBoxInterface,
}

interface PostContentPayloadImage {
  type: type.Message.Image,
  payload: FileBoxInterface,
}

interface PostContentPayloadLocation {
  type: type.Message.Location,
  payload: payload.Location,
}

interface PostContentPayloadMiniProgram {
  type: type.Message.MiniProgram,
  payload: payload.MiniProgram,
}

interface PostContentPayloadText {
  type: type.Message.Text,
  payload: string,
}

interface PostContentPayloadUrl {
  type: type.Message.Url,
  payload: payload.UrlLink,
}

type PostContentPayload =
  | PostContentPayloadAttatchment
  | PostContentPayloadAudio
  | PostContentPayloadContact
  | PostContentPayloadEmoticon
  | PostContentPayloadImage
  | PostContentPayloadLocation
  | PostContentPayloadMiniProgram
  | PostContentPayloadText
  | PostContentPayloadUrl

// TODO: add an unit test to confirm that all unsupported type are listed here
type PostContentPayloadUnsupportedType =
  | 'ChatHistory'
  | 'GroupNote'
  | 'Recalled'
  | 'RedEnvolop'

export type {
  PostContentPayload,
}
