import * as PUPPET from 'wechaty-puppet'
import { log } from 'wechaty-puppet'

import type {
  Message,
}                   from '../user-modules/mod.js'

import type { Sayable } from './types.js'

async function messageToSayable (
  message: Message,
): Promise<undefined | Sayable> {
  log.verbose('Wechaty', 'toSayable(%s)', message)

  const type = message.type()

  switch (type) {
    case PUPPET.type.Message.Text:
      return message.text()

    case PUPPET.type.Message.Image:
    case PUPPET.type.Message.Attachment:
    case PUPPET.type.Message.Audio:
    case PUPPET.type.Message.Video:
    case PUPPET.type.Message.Emoticon:
      return message.toFileBox()

    case PUPPET.type.Message.Contact:
      return message.toContact()

    case PUPPET.type.Message.Url:
      return message.toUrlLink()

    case PUPPET.type.Message.MiniProgram:
      return message.toMiniProgram()

    case PUPPET.type.Message.Location:
      return message.toLocation()

    default:
      log.warn('Wechaty',
        'toSayable() can not convert not re-sayable type: %s(%s) for %s\n%s',
        PUPPET.type.Message[type],
        type,
        message,
        new Error().stack,
      )
      return undefined
  }
}

export {
  messageToSayable,
}
