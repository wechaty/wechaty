/* eslint-disable sort-keys */
import { createAction } from 'typesafe-actions'
import type { FileBoxInterface } from 'file-box'

import { MessageType }              from './message.js'
import type { LocationPayload }     from './location.js'
import type { UrlLinkPayload }      from './url-link.js'
import type { MiniProgramPayload }  from './mini-program.js'
import type {
  PostPayload,
  SayablePayloadPost,
}                                     from './post.js'

const payloadContact     = (contactId: string)                      => ({ contactId })
const payloadFilebox     = (filebox: string | FileBoxInterface)     => ({ filebox })
const payloadText        = (text: string, mentions: string[] = [])  => ({ text, mentions })
/**
 * expand/merge the payload altogether
 */
const payloadLocation    = (locationPayload: LocationPayload)       => ({ ...locationPayload })
const payloadMiniProgram = (miniProgramPayload: MiniProgramPayload) => ({ ...miniProgramPayload })
const payloadUrlLink     = (urlLinkPayload: UrlLinkPayload)         => ({ ...urlLinkPayload })
const payloadPost        = (postPayload: PostPayload)               => ({ ...postPayload })

/**
 * using `types` as a static typed string name list for `createAction`
 *
 *  Huan(202201): if we remove the `(() => ({}))()`, then the typing will fail.
 *    FIXME: remove the `(() => ({}))()` after we fix the issue.
 */
const sayableTypes = (() => ({
  ...Object.keys(MessageType)
    .filter(k => isNaN(Number(k)))
    .reduce((acc, cur) => ({
      ...acc,
      [cur]: cur,
    }), {}),
} as  {
  [k in keyof typeof MessageType]: k
}))()

/**
 * Simple data
 */
const contact = createAction(sayableTypes.Contact, payloadContact)()
const text    = createAction(sayableTypes.Text,    payloadText)()
// (conversationId: string, text: string, mentionIdList?: string[]) => ({ conversationId, mentionIdList, text }
/**
 * FileBoxs
 */
const attatchment = createAction(sayableTypes.Attachment,  payloadFilebox)()
const audio       = createAction(sayableTypes.Audio,       payloadFilebox)()
const emoticon    = createAction(sayableTypes.Emoticon,    payloadFilebox)()
const image       = createAction(sayableTypes.Image,       payloadFilebox)()
const video       = createAction(sayableTypes.Video,       payloadFilebox)()

/**
 * Payload data
 */
const location    = createAction(sayableTypes.Location,    payloadLocation)()
const miniProgram = createAction(sayableTypes.MiniProgram, payloadMiniProgram)()
const url         = createAction(sayableTypes.Url,         payloadUrlLink)()
const post        = createAction(sayableTypes.Post,        payloadPost)()

/**
 * Huan(202201): Recursive type references
 *  @link https://github.com/microsoft/TypeScript/pull/33050#issuecomment-1002455128
 */
const sayablePayloadsNoPost = {
  attatchment,
  audio,
  contact,
  emoticon,
  image,
  location,
  miniProgram,
  text,
  url,
  video,
} as const

/**
 *
 * Huan(202201): Recursive type references
 *  @link https://github.com/microsoft/TypeScript/pull/33050#issuecomment-1002455128
 *  @link https://github.com/wechaty/puppet/issues/180
 */
const sayablePayloads = {
  ...sayablePayloadsNoPost,
  post,
} as const

type SayablePayloadNoPost = ReturnType<typeof sayablePayloadsNoPost[keyof typeof sayablePayloadsNoPost]>
type SayablePayload       = SayablePayloadNoPost | SayablePayloadPost

// TODO: add an unit test to confirm that all unsupported type are listed here
type SayablePayloadUnsupportedType =
  | 'ChatHistory'
  | 'GroupNote'
  | 'Recalled'
  | 'RedEnvelope'
  | 'Transfer'
  | 'Unknown'

export {
  sayablePayloads,
  sayableTypes,
  type SayablePayloadNoPost,
  type SayablePayload,
  type SayablePayloadUnsupportedType,
}
