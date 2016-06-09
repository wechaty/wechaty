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
    this.options.session    = this.options.session  || process.env.WECHATY_SESSION // no session, no session restore

    this.VERSION = require('../package.json').version
  }
  toString() { return 'Class Wechaty(' + this.puppet + ')'}
  init() {
    log.info('Wechaty', 'v%s initializing...', this.VERSION)
    log.verbose('Wechaty', 'puppet: %s' , this.options.puppet)
    log.verbose('Wechaty', 'head: %s'   , this.options.head)
    log.verbose('Wechaty', 'session: %s', this.options.session)

    this.initPuppet()
    this.initEventHook()

    return this.puppet.init()
    .then(r => {
      return this // for chaining
    })
  }
  initPuppet() {
    switch (this.options.puppet) {
      case 'web':
        this.puppet = new Puppet.Web({
          head:   this.options.head
          , port: this.options.port
          , session: this.options.session
        })
        break
      default:
        throw new Error('Puppet unsupport(yet): ' + this.options.puppet)
    }
    return Promise.resolve(this.puppet)
  }
  initEventHook() {
    // scan qrCode
    this.puppet.on('scan', (e) => {
      this.emit('scan', e)
    })
    this.puppet.on('message', (e) => {
      this.emit('message', e)
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

  quit()   { return this.puppet.quit() }

  send(message)   { return this.puppet.send(message) }
  reply(message, reply) { return this.puppet.reply(message, reply) }

  ding()          {
    // TODO: test through the server & browser
    return 'dong'
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
Wechaty.log = log
module.exports = Wechaty.default = Wechaty.Wechaty = Wechaty
