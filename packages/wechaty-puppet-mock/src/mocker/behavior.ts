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

    let running = true

    const SimpleBehaviorStop = () => {
      log.verbose('SimpleBehavior', 'SimpleBehaviorStop()')
      running = false
    }

    async function main () {
      await new Promise(resolve => setTimeout(resolve, 1000))
      mocker.scan('https://github.com/wechaty/wechaty-puppet-mock', ScanStatus.Waiting)

      await new Promise(resolve => setTimeout(resolve, 1000))
      const user = mocker.createContact()
      mocker.login(user)

      mocker.createContacts(4)
      mocker.createRooms(3)

      while (true) {
        const contact = mocker.randomContact()
        if (contact) {
          contact.say().to()
        }

        await new Promise(resolve => setTimeout(resolve, 5000))

        if (!running) {
          break
        }
      }
    }

    main().catch(e => log.error('SimpleBehavior', 'SimpleBehaviorStart() main() rejection: %s', e))

    return SimpleBehaviorStop
  }
}

export {
  SimpleBehavior,
}
