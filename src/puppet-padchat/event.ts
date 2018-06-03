import PuppetPadchat        from './puppet-padchat'
// import Firer                from './firer'
import {
  PadchatMessagePayload,
  // PadchatMessageType,
}                           from './padchat-schemas'
import {
  log,
}                           from '../config'

/* tslint:disable:variable-name */
export const Event = {
  onMessage,
}

async function onMessage(
  this    : PuppetPadchat,
  payload : PadchatMessagePayload,
  ): Promise<void> {

  try {
    /**
     * Fire Events if match message type & content
     */
    // switch (rawPayload.sub_type) {

    //   // case PadchatMessageType.VERIFYMSG:
    //   //   Firer.checkFriendRequest.call(this, msg)
    //   //   break

    //   case PadchatMessageType.SYS:
    //     // if (msg.room()) {
    //     if (/@chatroom/.test(rawPayload.from_user)) {
    //       const joinResult  = await Firer.checkRoomJoin(rawPayload)
    //       const leaveResult = await Firer.checkRoomLeave(rawPayload)
    //       const topicRestul = await Firer.checkRoomTopic(rawPayload)

    //       if (!joinResult && !leaveResult && !topicRestul) {
    //         log.warn('PuppetPadchatEvent', `checkRoomSystem message: <${msg.text()}> not found`)
    //       }
    //     }
    //     // else {
    //     //   Firer.checkFriendConfirm.call(this, msg)
    //     // }
    //     break
    // }

    /**
     * Check Type for special Message
     * reload if needed
     */

    // switch (rawPayload.sub_type) {
    //   case PadchatMessageType.EMOTICON:
    //   case PadchatMessageType.IMAGE:
    //   case PadchatMessageType.VIDEO:
    //   case PadchatMessageType.VOICE:
    //   case PadchatMessageType.MICROVIDEO:
    //   case PadchatMessageType.APP:
    //     log.verbose('PuppetPadchatEvent', 'onMessage() EMOTICON/IMAGE/VIDEO/VOICE/MICROVIDEO message')
    //     msg = this.Message.create(
    //       rawPayload.msg_id,
    //       await this.messagePayload(rawPayload.msg_id),
    //     )
    //     break

    //   case PadchatMessageType.TEXT:
    //     log.verbose('PuppetPadchatEvent', 'onMessage() (TEXT&LOCATION) message')
    //     msg = this.Message.create(
    //       rawPayload.msg_id,
    //       await this.messagePayload(rawPayload.msg_id),
    //     )
    // }

    // await msg.ready()
    this.emit('message', payload.msg_id)

  } catch (e) {
    log.error('PuppetPadchatEvent', 'onMessage() exception: %s', e.stack)
    throw e
  }
}

export default Event
