import * as PUPPET from 'wechaty-puppet'
import { log } from '../config.js'

import type { Mocker } from './mocker.js'

type EnvironmentStop  = () => void
type EnvironmentStart = (mocker: Mocker) => EnvironmentStop

export type EnvironmentMock = EnvironmentStart

const SimpleEnvironment: () => EnvironmentMock = () => {
  log.verbose('SimpleEnvironment', '()')

  return function SimpleEnvironmentStart (mocker: Mocker): EnvironmentStop {
    log.verbose('SimpleEnvironment', 'SimpleEnvironmentStart(%s)', mocker)

    const taskList: (() => void)[] = []
    const loop = () => taskList.forEach(task => task())

    const timer = setInterval(loop, 5000)

    const SimpleEnvironmentStop = () => {
      log.verbose('SimpleEnvironment', 'SimpleEnvironmentStop()')
      clearInterval(timer)
    }

    mocker.scan('https://github.com/wechaty/wechaty-puppet-mock', PUPPET.types.ScanStatus.Waiting)

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

    return SimpleEnvironmentStop
  }
}

export {
  SimpleEnvironment,
}
