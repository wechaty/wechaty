/**
 * Wechat for Bot. and for human who can talk with bot/robot
 *
 * Interface for puppet
 *
 * Class Puppet
 *
 * Licenst: ISC
 * https://github.com/zixia/wechaty
 *
 */

const EventEmitter = require('events')
const log = require('./npmlog-env')

class Puppet extends EventEmitter {
  constructor() {
    super()

    /*
     * connected / disconnected
     * connecting / disconnecting
     */
    this._readyStatus = 'disconnected'
  }

  readyStatus(newStatus) {
    if (newStatus) {
      log.verbose('Puppet', 'readyStatus(%s)', newStatus)
      this._readyStatus = newStatus
    }
    return this._readyStatus
  }

  /**
   * let puppet send message
   *
   * @param <Message> message - the message to be sent
   * @return <Promise>
   */
  send(message)         { throw new Error('To Be Implemented') }
  reply(message, reply) { throw new Error('To Be Implemented') }

  logout()      { throw new Error('To Be Implementsd') }
  quit()        { throw new Error('To Be Implementsd') }
  ding()        { throw new Error('To Be Implementsd') }

  getContact(id)  { // for unit testing
    log.verbose('Puppet', `Interface method getContact(${id})`)
    return Promise.resolve({UserName: 'WeChaty', NickName: 'Puppet'})
  }

  // () { throw new Error('To Be Implemented')  }
}

Object.assign(Puppet, {
  Message:    require('./message')
  , Contact:  require('./contact')
  , Room:     require('./room')
})

module.exports = Puppet
