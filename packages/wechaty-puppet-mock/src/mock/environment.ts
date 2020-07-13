import { ScanStatus } from 'wechaty-puppet'

import { log } from '../config'

import { Mocker } from './mocker'

type EnvironmentStop  = () => void
type EnvironmentStart = (mocker: Mocker) => EnvironmentStop

export type MockEnvironment = EnvironmentStart

const SimpleEnvironment: () => MockEnvironment = () => {
  log.verbose('SimpleEnvironment', '()')

  return function SimpleEnvironmentStart (mocker: Mocker): EnvironmentStop {
    log.verbose('SimpleEnvironment', 'SimpleEnvironmentStart(%s)', mocker)

    const taskList: (() => void)[] = []
    const loop = () => taskList.forEach(task => task())

    let timer = setInterval(loop, 5000)

    const SimpleEnvironmentStop = () => {
      log.verbose('SimpleEnvironment', 'SimpleEnvironmentStop()')
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

    return SimpleEnvironmentStop
  }
}

export {
  SimpleEnvironment,
}
