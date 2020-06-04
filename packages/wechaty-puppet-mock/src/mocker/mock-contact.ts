import { log } from '../config'
import { ContactPayload } from 'wechaty-puppet'
import { Mocker } from './mocker'
import { MockRoom } from './mock-room'

interface To {
  to: (conversation: MockContact | MockRoom) => void
}

class MockContact {

  get id () { return this.payload.id }

  constructor (
    public mocker: Mocker,
    public payload: ContactPayload,
  ) {
    log.verbose('MockContact', 'constructor(%s, %s)', mocker, JSON.stringify(payload))
    this.mocker.contactPayload(payload.id, payload)

  }

  say (text: string): To {
    const that = this
    return { to }

    function to (conversation: MockContact | MockRoom) {
      that.mocker.puppet.messageSendText(conversation.id, text)
        .catch(e => log.error('MockContact', 'say(%s).to(%s) rejection: %s', text, conversation.id, e))
    }

  }

}

export { MockContact }
