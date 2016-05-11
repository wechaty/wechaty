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
    options         = options || {}
    options.puppet  = options.puppet || 'web'

    switch(options.puppet) {
      case 'web':
        this.puppet = new Puppet.Web({port: options.port})
        break
      default:
        throw new Error('Puppet unknown: ' + puppet)
        break
    }
    Contact.attach(this.puppet)
    Group.attach(this.puppet)

    this.puppet.on('message', (e) => {
      this.emit('message', e)
    })
    this.puppet.on('login', (e) => {
      this.emit('login', e)
    })
    this.puppet.on('logout', (e) => {
      this.emit('logout', e)
    })
  }

  init()          { return this.puppet.init() }
  currentUser()   { return this.puppet.currentUser() }
  send(message)   { return this.puppet.send(message) }

  ding()          { return 'dong' }

  getLoginQrImgUrl() { return puppet.getLoginQrImgUrl() }
}

Puppet.Web = PuppetWeb

Object.assign(Wechaty, {
  Puppet:     Puppet
  , Message:  Message
  , Contact:  Contact
  , Group:    Group
})

module.exports = Wechaty
