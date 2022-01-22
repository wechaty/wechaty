import * as PUPPET from 'wechaty-puppet'
import { log } from 'wechaty-puppet'

import type {
  MessageInterface,
}                   from '../user-modules/mod.js'

import type { Sayable } from './types.js'

async function messageToSayable (
  message: MessageInterface,
): Promise<undefined | Sayable> {
  log.verbose('Wechaty', 'toSayable(%s)', message)

  const type = message.type()

  switch (type) {
    case PUPPET.types.Message.Text:
      return message.text()

    case PUPPET.types.Message.Image:
    case PUPPET.types.Message.Attachment:
    case PUPPET.types.Message.Audio:
    case PUPPET.types.Message.Video:
    case PUPPET.types.Message.Emoticon:
      return message.toFileBox()

    case PUPPET.types.Message.Contact:
      return message.toContact()

    case PUPPET.types.Message.Url:
      return message.toUrlLink()

    case PUPPET.types.Message.MiniProgram:
      return message.toMiniProgram()

    case PUPPET.types.Message.Location:
      return message.toLocation()

    case PUPPET.types.Message.Post:
      return message.toPost()

    default:
      log.warn('Wechaty',
        'toSayable() can not convert not re-sayable type: %s(%s) for %s\n%s',
        PUPPET.types.Message[type],
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
