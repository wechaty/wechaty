import { Puppet, ContactPayload } from 'wechaty-puppet'

import { log } from './config'

class Mocker {

  constructor (
    public puppet: Puppet,
  ) {
    log.verbose('Mocker', 'constructor(%s)', puppet)
  }

  createContact (payload: ContactPayload)

}

export { Mocker }
