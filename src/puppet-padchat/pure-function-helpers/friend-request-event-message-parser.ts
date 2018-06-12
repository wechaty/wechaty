import { PadchatMessagePayload } from '../padchat-schemas'

export function friendRequestEventMessageParser(rawPayload: PadchatMessagePayload): null | string {
    return rawPayload.msg_id
  // //   const reList = regexConfig.friendConfirm
  // //   let found = false

  // //   reList.some(re => !!(found = re.test(content)))
  // //   if (found) {
  // //     return true
  // //   } else {
  // //     return false
  // //   }
}
