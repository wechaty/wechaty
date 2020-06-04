import { log } from '../config'

import { Mocker } from './mocker'
import { ScanStatus } from 'wechaty-puppet'

type MockerBehaviorStop  = () => void
type MockerBehaviorStart = (mocker: Mocker) => MockerBehaviorStop

export type MockerBehavior = MockerBehaviorStart

const SimpleBehavior: () => MockerBehavior = () => {
  log.verbose('SimpleBehavior', '()')

  return function SimpleBehaviorStart (mocker: Mocker): MockerBehaviorStop {
    log.verbose('SimpleBehavior', 'SimpleBehaviorStart(%s)', mocker)

    const taskList: (() => void)[] = []
    const loop = () => taskList.forEach(task => task())

    let timer = setInterval(loop, 5000)

    const SimpleBehaviorStop = () => {
      log.verbose('SimpleBehavior', 'SimpleBehaviorStop()')
      clearInterval(timer)
    }

    mocker.scan('https://github.com/wechaty/wechaty-puppet-mock', ScanStatus.Waiting)

    const user = mocker.createContact()
    mocker.login(user)

    const contactList = mocker.createContacts(3)
    mocker.createRoom({
      memberIdList: [
        user.id,
        ...contactList.map(c => c.id),
      ],
    })

    taskList.push(() => {
      const contact = mocker.randomContact()
      if (contact) {
        contact.say().to()
      }
    })

    return SimpleBehaviorStop
  }
}

export {
  SimpleBehavior,
}
