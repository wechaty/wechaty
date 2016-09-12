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
const log = require('./brolog-env')

class Puppet extends EventEmitter {
  constructor() {
    super()

    /*
     * @deprecated
     * connected / disconnected
     * connecting / disconnecting
     */
    // this._readyState = 'disconnected'

    this.targetState('dead')
    this.currentState('dead')
  }

  // targetState : 'live' | 'dead'
  targetState(newState) {
    if (newState) {
      log.verbose('Puppet', 'targetState(%s)', newState)
      this._targetState = newState
    }
    return this._targetState
  }

  // currentState : 'birthing' | 'killing'
  currentState(newState) {
    if (newState) {
      log.verbose('Puppet', 'currentState(%s)', newState)
      this._currentState = newState
    }
    return this._currentState
  }

  // @deprecated
  // readyState(newState) {
  //   if (newState) {
  //     log.verbose('Puppet', 'readyState() set to "%s"', newState)
  //     this._readyState = newState
  //   }
  //   return this._readyState
  // }

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
    throw new Error('Absolute Interface Method should never to be called')
    // return Promise.resolve({UserName: 'WeChaty', NickName: 'Puppet'})
  }

  // () { throw new Error('To Be Implemented')  }
}

Object.assign(Puppet, {
  Message:    require('./message')
  , Contact:  require('./contact')
  , Room:     require('./room')
})

module.exports = Puppet
