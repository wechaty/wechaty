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
    this.options.puppet     = this.options.puppet   || process.env.WECHATY_PUPPET   || 'web'
    this.options.head       = this.options.head     || process.env.WECHATY_HEAD     || false
    this.options.port       = this.options.port     || process.env.WECHATY_PORT     || 8788 // W(87) X(88), ascii char code ;-]
    this.options.session    = this.options.session  || process.env.WECHATY_SESSION          // no session, no session save/restore

    this.npmVersion = require('../package.json').version

    this.inited = false
  }
  toString() { return 'Class Wechaty(' + this.puppet + ')'}
  version()  { return this.npmVersion }

  init() {
    log.info('Wechaty', 'v%s initializing...', this.npmVersion)
    log.verbose('Wechaty', 'puppet: %s' , this.options.puppet)
    log.verbose('Wechaty', 'head: %s'   , this.options.head)
    log.verbose('Wechaty', 'session: %s', this.options.session)

    if (this.inited) {
      log.error('Wechaty', 'init() already inited. return and do nothing.')
      return Promise.resolve(this)
    }

    return co.call(this, function* () {
      const okPort = yield this.getPort(this.options.port)

      if (okPort != this.options.port) {
        log.info('Wechaty', 'port: %d not available, changed to %d', this.options.port, okPort)
        this.options.port = okPort
      } else {
        log.verbose('Wechaty', 'port: %d', this.options.port)
      }

      yield this.initPuppet()
      yield this.initEventHook()
      yield this.puppet.init()

      this.inited = true
      return this // for chaining
    })
    .catch(e => {
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
    this.puppet.on('error', (e) => {
      this.emit('error', e)
    })

    /**
     * TODO: support more events:
     * 2. send
     * 3. reply
     * 4. quit
     * 5. ...
     */

    return Promise.resolve()
  }

  quit() {
    const puppetBeforeDie = this.puppet
    this.puppet = null
    this.inited = false

    return puppetBeforeDie.quit()
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

  self(message) {
    return this.puppet.self(message)
  }
  send(message) {
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
  ding(data) {
    if (!this.puppet) {
      return Promise.reject(new Error('wechaty cant ding coz no puppet'))
    }

    return this.puppet.ding(data)
    .catch(e => {
      log.error('Wechaty', 'ding() exception: %s', e.message)
      throw e
    })
  }

  getPort(port) {
    return new Promise((resolve, reject) => {
      port = port || 8788
      // https://gist.github.com/mikeal/1840641
      function getPort (cb) {
        var tryPort = port
        port += 1
        var server = require('net').createServer()
        server.on('error', function (err) {
          if (err) {}
          getPort(cb)
        })
        server.listen(tryPort, function (err) {
          if (err) {}
          server.once('close', function () {
            cb(tryPort)
          })
          server.close()
        })
      }
      getPort(okPort => resolve(okPort))
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
