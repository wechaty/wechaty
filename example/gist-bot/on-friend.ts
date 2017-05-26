/**
 * Wechaty - Wechat for Bot. Connecting ChatBots
 *
 * Licenst: ISC
 * https://github.com/wechaty/wechaty
 *
 */

/**
 * Change `import { ... } from '../../'`
 * to     `import { ... } from 'wechaty'`
 * when you are runing with Docker or NPM instead of Git Source.
 */
import {
  Contact,
  FriendRequest,
  Room,
} from '../../'

export async function onFriend(contact: Contact, request?: FriendRequest): Promise<void> {
  try {
    if (!request) {
      console.log('New friend ' + contact.name() + ' relationship confirmed!')
      return
    }
    /********************************************
     *
     * 从这里开始修改 vvvvvvvvvvvv
     *
     */
    await request.accept()

    setTimeout(
      _ => {
        contact.say('thank you for adding me')
      },
      3000,
    )

    if (request.hello === 'ding') {
      const myRoom = await Room.find({ topic: 'ding' })
      if (!myRoom) return
      setTimeout(
        _ => {
          myRoom.add(contact)
          myRoom.say('welcome ' + contact.name())
        },
        3000,
      )
    }

    /**
     *
     * 到这里结束修改 ^^^^^^^^^^^^
     *
     */
    /*******************************************/
 } catch (e) {
    console.log(e)
  }
}
