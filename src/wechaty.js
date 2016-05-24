/**
 *
 * wechaty: Wechat for Bot. and for human who talk to bot/robot
 *
 * Licenst: ISC
 * https://github.com/zixia/wechaty
 *
 */
const EventEmitter = require('events')

const Puppet      = require('./puppet')
const PuppetWeb   = require('./puppet-web')

const Message     = require('./message')
const Contact     = require('./contact')
const Group       = require('./group')

class Wechaty extends EventEmitter {
  constructor(options) {
    super()
    this.options = options || {}
    this.options.puppet = this.options.puppet || 'web'
  }
  toString() { return 'Class Wechaty(' + this.puppet + ')'}
  init() {
    this.initPuppet()
    this.initEventHook()
    return this.puppet.init()
  }
  initPuppet() {
    switch (this.options.puppet) {
      case 'web':
        this.puppet = new Puppet.Web({
          head:   this.options.head
          , port: this.options.port
        })
        break
      default:
        throw new Error('Puppet unsupport(yet): ' + puppet)
        break
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
    return Promise.resolve()
  }

  currentUser()   { return this.puppet.currentUser() }
  quit()          { return this.puppet.quit() }
  send(message)   { return this.puppet.say(message) }
  reply(message, reply) { return this.puppet.reply(message, reply) }

  ding()          {
    // TODO: test through the server & browser
    return 'dong'
  }

  getLoginQrImgUrl() { return this.puppet.getLoginQrImgUrl() }
}

Puppet.Web = PuppetWeb

Object.assign(Wechaty, {
  Puppet:     Puppet
  , Message:  Message
  , Contact:  Contact
  , Group:    Group
})

module.exports = Wechaty
