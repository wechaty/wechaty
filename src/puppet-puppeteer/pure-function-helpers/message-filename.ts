import {
  WebMessageRawPayload,
}                         from '../web-schemas'

import {
  messageExtname,
}                         from './message-extname'

export function messageFilename(
  rawPayload: WebMessageRawPayload,
): string {

  let guessFilename = rawPayload.FileName || rawPayload.MediaId || rawPayload.MsgId

  const re = /\.[a-z0-9]{1,7}$/i
  if (!re.test(guessFilename)) {
    if (rawPayload.MMAppMsgFileExt) {
      guessFilename += '.' + rawPayload.MMAppMsgFileExt
    } else {
      guessFilename += messageExtname(rawPayload)
    }
  }

  return guessFilename
}
