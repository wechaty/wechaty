import * as PUPPET from 'wechaty-puppet'
import { log }  from 'wechaty-puppet'

import type {
  SayablePayload,
}                       from '../user-modules/post-sayable-payload-list.js'
import type { WechatyInterface } from '../interface/mod.js'

import type {
  Sayable,
}                   from './types.js'

const payloadToSayableWechaty: (w: WechatyInterface) => (p: SayablePayload) => Promise<undefined | Sayable> = (wechaty: WechatyInterface) => async (
  payload: SayablePayload,
) => {
  log.verbose('Wechaty', 'payloadToSayable({type: %s(%s)})',
    PUPPET.type.Message[payload.type],
    payload.type,
  )

  switch (payload.type) {
    case PUPPET.type.Message.Text:
      return wechaty.Message.find({ id: payload.payload })

    case PUPPET.type.Message.Emoticon:
    case PUPPET.type.Message.Image:
    case PUPPET.type.Message.Video:
    case PUPPET.type.Message.Audio:
    case PUPPET.type.Message.Attachment:
      return payload.payload

    case PUPPET.type.Message.Contact:
      return wechaty.Contact.find({ id: payload.payload })

    case PUPPET.type.Message.Location:
      return new wechaty.Location(payload.payload)

    case PUPPET.type.Message.MiniProgram:
      return new wechaty.MiniProgram(payload.payload)

    case PUPPET.type.Message.Url:
      return new wechaty.UrlLink(payload.payload)

    default:
      throw new Error('payloadToSayable() not support payload: ' + JSON.stringify(payload))
  }
}

export {
  payloadToSayableWechaty,
}
