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
const log = require('npmlog')

class Puppet extends EventEmitter {
  constructor() {
    super()
  }

  /**
   * let puppet send message
   *
   * @param <Message> message - the message to be sent
   * @return <Promise>
   */
  send(message) { throw new Error('To Be Implemented') }

  logout()      { throw new Error('To Be Implementsd') }
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
  , Group:    require('./group')
})

module.exports = Puppet
