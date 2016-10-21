import {
    Contact
  , Room
} from '../../'

const arrify = require('arrify')

export default async function onRoomJoin(
    room: Room
  , invitee: Contact|Contact[]
  , inviter: Contact
): Promise<void> {
  try {

    /********************************************
     *
     * 从这里开始修改 vvvvvvvvvvvv
     *
     */

    if (room.topic() !== 'ding') {
      return
    }

    if (inviter.self()) {
      room.say('Welcome to my room: ' + arrify(invitee).join(', '))
      return
    }

    room.say('请勿私自拉人。需要拉人请加我', inviter)
    room.say('请先加我好友，然后我来拉你入群。先把你移出啦。', invitee)

    arrify(invitee).forEach(c => {
      room.del(c)
    })

    /**
     *
     * 到这里结束修改^^^^^^^^^^^^
     *
     *********************************************/

  } catch (e) {
    console.log(e)
  }

  return

}
