import {
  FileBox,
  Message,
  Contact,
  UrlLink,
  MiniProgram,
  log,
}                 from './mod'

export type SayableMessage =  undefined
                            | Message
                            | string
                            | FileBox
                            | Contact
                            | UrlLink
                            | MiniProgram

async function toSayableMessage (message: Message): Promise<SayableMessage> {
  const type = message.type()
  switch (type) {
    case Message.Type.Text:
      return message.text()
    case Message.Type.Image:
    case Message.Type.Attachment:
    case Message.Type.Audio:
    case Message.Type.Video:
    case Message.Type.Emoticon:
      return message.toFileBox()
    case Message.Type.Contact:
      return message.toContact()
    case Message.Type.Url:
      return message.toUrlLink()
    case Message.Type.MiniProgram:
      return message.toMiniProgram()

    default:
      log.silly('Wechaty', 'toSayableMessage(%s) non-convertible type: %s', message, type)
      return undefined
  }
}

export {
  toSayableMessage,
}
