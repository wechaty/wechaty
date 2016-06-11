/**
 *
 * wechaty: Wechat for Bot. and for human who talk to bot/robot
 *
 * Class Wechaty
 *
 * Licenst: ISC
 * https://github.com/zixia/wechaty
 *
 */
const EventEmitter  = require('events')
const co            = require('co')

const log         = require('./npmlog-env')

const Puppet      = require('./puppet')
const PuppetWeb   = require('./puppet-web')

const Message     = require('./message')
const Contact     = require('./contact')
const Room        = require('./room')

class Wechaty extends EventEmitter {
  constructor(options) {
    super()
    this.options = options || {}
    this.options.puppet     = this.options.puppet   || process.env.WECHATY_PUPPET || 'web'
    this.options.head       = this.options.head     || process.env.WECHATY_HEAD || false
    this.options.session    = this.options.session  || process.env.WECHATY_SESSION // no session, no session save/estore

    this.VERSION = require('../package.json').version
  }
  toString() { return 'Class Wechaty(' + this.puppet + ')'}
  init() {
    log.info('Wechaty', 'v%s initializing...', this.VERSION)
    log.verbose('Wechaty', 'puppet: %s' , this.options.puppet)
    log.verbose('Wechaty', 'head: %s'   , this.options.head)
    log.verbose('Wechaty', 'session: %s', this.options.session)

    return co.call(this, function* () {
      yield this.initPuppet()
      yield this.initEventHook()
      yield this.puppet.init()

      return this // for chaining

    }).catch(e => {
      log.error('Wechaty', 'init() exception: %s', e.message)
      throw e
    })
  }
  initPuppet() {
    switch (this.options.puppet) {
      case 'web':
        this.puppet = new Puppet.Web({
          head:       this.options.head
          , port:     this.options.port
          , session:  this.options.session
        })
        break
      default:
        throw new Error('Puppet unsupport(yet): ' + this.options.puppet)
    }
    return Promise.resolve(this.puppet)
  }
  initEventHook() {
    this.puppet.on('scan', (e) => {
      this.emit('scan', e)    // Scan QRCode
    })
    this.puppet.on('message', (e) => {
      this.emit('message', e) // Receive Message
    })
    this.puppet.on('login', (e) => {
      this.emit('login', e)
    })
    this.puppet.on('logout', (e) => {
      this.emit('logout', e)
    })

    /**
     * TODO: support more events:
     * 1. error
     * 2. send
     * 3. reply
     * 4. quit
     * 5. ...
     */

    return Promise.resolve()
  }

  quit()    {
    return this.puppet.quit()
    .catch(e => {
      log.error('Wechaty', 'quit() exception: %s', e.message)
      throw e
    })
  }
  logout()  {
    return this.puppet.logout()
    .catch(e => {
      log.error('Wechaty', 'logout() exception: %s', e.message)
      throw e
    })

  }

  send(message)   {
    return this.puppet.send(message)
    .catch(e => {
      log.error('Wechaty', 'send() exception: %s', e.message)
      throw e
    })
  }
  reply(message, reply) {
    return this.puppet.reply(message, reply)
    .catch(e => {
      log.error('Wechaty', 'reply() exception: %s', e.message)
      throw e
    })
  }
  ding(data)          {
    return this.puppet.ding(data)
    .catch(e => {
      log.error('Wechaty', 'ding() exception: %s', e.message)
      throw e
    })
  }
}

Puppet.Web = PuppetWeb

Object.assign(Wechaty, {
  Puppet:     Puppet
  , Message:  Message
  , Contact:  Contact
  , Room:     Room
})

/**
 * Expose `Wechaty`.
 */
Wechaty.log = log // for convenionce use npmlog with environment variable LEVEL
module.exports = Wechaty.default = Wechaty.Wechaty = Wechaty
