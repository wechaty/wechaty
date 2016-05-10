/**
 * Wechat for Bot. and for human who can talk with bot/robot
 *
 * Interface for puppet
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
   * Get current logined user
   * @return <Contact> 
   */
  currentUser() { throw new Error('To Be Implemented')  }

  /**
   * let puppet send message
   *
   * @param <Message> message - the message to be sent
   * @return <Promise> 
   */
  send(message) { throw new Error('To Be Implemented') }

  logout()      { throw new Error('To Be Implementsd') }
  alive()       { throw new Error('To Be Implementsd') }

  getContact(id)  { // for unit testing
    log.silly('Puppet', `Interface method getContact(${id})`)
    return Promise.resolve({UserName: 'WeChaty', NickName: 'Puppet'})
  }

  // () { throw new Error('To Be Implemented')  }

  /**
   *
   * Events .on(...)
   *
   * login   - 
   * logout  -  
   * 
   *
   */
  debug(cb) {
    // List of all events
    [ 'message'   // event data should carry a instance of Message
      , 'login'
      , 'logout'
    ].map(e => { this.on(e, cb) })
  }

}

Object.assign(Puppet, {
  Message:    require('./message')
  , Contact:  require('./contact')
  , Group:    require('./group')
})

module.exports = Puppet
