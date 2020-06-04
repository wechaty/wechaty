import { log } from '../config'

import { Mocker } from './mocker'
import { ScanStatus } from 'wechaty-puppet'

export interface MockerBehavior {
  (mocker: Mocker): () => void
}

const SimpleBehavior: () => MockerBehavior = () => {
  log.verbose('Mocker', 'SimpleBehavior()')

  const cleanupCallbackList = [] as (() => void)[]
  const stopFn = () => {
    log.verbose('Mocker', 'SimpleBehavior() SimpleBehaviorStop()')
    cleanupCallbackList.forEach(fn => fn())
    cleanupCallbackList.length = 0
  }

  return function SimpleBehaviorStart (mocker: Mocker) {
    log.verbose('Mocker', 'SimpleBehaviorStart(%s)', mocker)

    async function main () {
      await new Promise(resolve => setTimeout(resolve, 1000))
      mocker.scan('https://github.com/wechaty/wechaty-puppet-mock', ScanStatus.Waiting)

      await new Promise(resolve => setTimeout(resolve, 1000))
      const user = mocker.createContact()
      mocker.login(user)

      mocker.createContacts(4)
      mocker.createRooms(3)

      const sendMockMessage = () => {
        const contact = mocker.randomContact()
        if (contact) {
          contact.say().to()
        }
      }

      const loopTimer = setInterval(sendMockMessage, 5000)
      cleanupCallbackList.push(() => clearInterval(loopTimer))
    }

    main().catch(e => log.error('Mocker', 'SimpleBehaviorStart() main() rejection: %s', e))

    return stopFn
  }
}

export {
  SimpleBehavior,
}
