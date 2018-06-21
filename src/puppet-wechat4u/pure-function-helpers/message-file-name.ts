import {
  WebMessageRawPayload,
  WebMessageType,
  WebAppMsgType,
}                           from '../web-schemas'

export function messageFileName(
  rawPayload: WebMessageRawPayload,
): string {
  let filename = rawPayload.FileName || rawPayload.MediaId || rawPayload.MsgId

  const re = /\.[a-z0-9]{1,7}$/i
  if (!re.test(filename)) {
    if (rawPayload.MMAppMsgFileExt) {
      filename += '.' + rawPayload.MMAppMsgFileExt
    } else {
      filename += messageExtname(rawPayload)
    }
  }

  return filename
}

export function messageExtname(
  rawPayload: WebMessageRawPayload,
): string {
  let ext: string

  // const type = this.type()

  switch (rawPayload.MsgType) {
    case WebMessageType.EMOTICON:
      ext = '.gif'
      break

    case WebMessageType.IMAGE:
      ext = '.jpg'
      break

    case WebMessageType.VIDEO:
    case WebMessageType.MICROVIDEO:
      ext = '.mp4'
      break

    case WebMessageType.VOICE:
      ext = '.mp3'
      break

    case WebMessageType.APP:
      switch (rawPayload.AppMsgType) {
        case WebAppMsgType.URL:
          ext = '.url' // XXX
          break
        default:
          ext = '.' + rawPayload.MsgType
          break
      }
      break

    case WebMessageType.TEXT:
      if (rawPayload.SubMsgType === WebMessageType.LOCATION) {
        ext = '.jpg'
      }
      ext = '.' + rawPayload.MsgType

      break

    default:
      ext = '.' + rawPayload.MsgType
  }

  return ext
}
