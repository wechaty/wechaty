import * as PUPPET from 'wechaty-puppet'
import { log }  from 'wechaty-puppet'

import type { WechatyInterface } from '../wechaty/wechaty-impl.js'

import type {
  Sayable,
}                   from './types.js'

const payloadToSayableWechaty: (w: WechatyInterface) => (p: PUPPET.payloads.Sayable) => Promise<undefined | Sayable> = (wechaty: WechatyInterface) => async (
  sayable: PUPPET.payloads.Sayable,
) => {
  log.verbose('Wechaty', 'payloadToSayable({type: %s(%s)})',
    PUPPET.types.Message[sayable.type],
    sayable.type,
  )

  switch (sayable.type) {
    case PUPPET.types.Sayable.Text:
      return sayable.payload.text

    case PUPPET.types.Sayable.Emoticon:
    case PUPPET.types.Sayable.Image:
    case PUPPET.types.Sayable.Video:
    case PUPPET.types.Sayable.Audio:
    case PUPPET.types.Sayable.Attachment:
      return sayable.payload.filebox

    case PUPPET.types.Sayable.Contact:
      return wechaty.Contact.find({ id: sayable.payload.contactId })

    case PUPPET.types.Sayable.Location:
      return new wechaty.Location(sayable.payload)

    case PUPPET.types.Sayable.MiniProgram:
      return new wechaty.MiniProgram(sayable.payload)

    case PUPPET.types.Sayable.Url:
      return new wechaty.UrlLink(sayable.payload)

    case PUPPET.types.Sayable.Post:
      return new wechaty.Post(sayable.payload)

    default:
      throw new Error('payloadToSayable() not support payload: ' + JSON.stringify(sayable))
  }
}

export {
  payloadToSayableWechaty,
}
