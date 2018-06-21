import {
  PadchatMessagePayload,
}                               from '../padchat-schemas'

export function messageFileName(
  rawPayload: PadchatMessagePayload,
): string {
  return rawPayload.msg_id + '-to-be-implement.txt'
}
