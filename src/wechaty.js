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

const log           = require('./npmlog-env')

class Wechaty extends EventEmitter {

  constructor({
    puppetType= process.env.WECHATY_PUPPET   || 'web'
    , head    = process.env.WECHATY_HEAD     || false
    , port    = process.env.WECHATY_PORT     || 8788 // W(87) X(88), ascii char code ;-]
    , session = process.env.WECHATY_SESSION          // no session, no session save/restore
    , token   = process.env.WECHATY_TOKEN            // token for wechaty.io auth
  }) {
    super()
    this.puppetType = puppetType
    this.head       = head
    this.port       = port
    this.session    = session
    this.token      = token

    this.npmVersion = require('../package.json').version

    this.inited = false
  }

  toString() { return 'Class Wechaty(' + this.puppetType + ')'}

  version()  { return this.npmVersion }

  init() {
    log.info('Wechaty', 'v%s initializing...', this.npmVersion)
    log.verbose('Wechaty', 'puppet: %s' , this.puppetType)
    log.verbose('Wechaty', 'head: %s'   , this.head)
    log.verbose('Wechaty', 'session: %s', this.session)

    if (this.inited) {
      log.error('Wechaty', 'init() already inited. return and do nothing.')
      return Promise.resolve(this)
    }

    return co.call(this, function* () {
      const okPort = yield this.getPort(this.port)

      if (okPort != this.port) {
        log.info('Wechaty', 'port: %d not available, changed to %d', this.port, okPort)
        this.port = okPort
      } else {
        log.verbose('Wechaty', 'port: %d', this.port)
      }

      yield this.initPuppet()
      yield this.initEventHook()
      yield this.puppet.init()

      yield this.initIo(this.token)

      this.inited = true
      return this // for chaining
    })
    .catch(e => {
      log.error('Wechaty', 'init() exception: %s', e.message)
      throw e
    })
  }

  initIo(token) {
    if (!token) {
      log.verbose('Wechaty', 'initIo() skiped for no token set')
      return Promise.resolve('no token')
    }

    const WechatyIo = require('./wechaty-io')
    this.io = new WechatyIo({token: token})

    return io.init()
    .catch(e => {
      log.verbose('Wechaty', 'Wechaty.IO init fail: %s', e.message)
      throw e
    })
  }

  initPuppet() {
    switch (this.puppetType) {
      case 'web':
        this.puppet = new Puppet.Web({
          head:       this.head
          , port:     this.port
          , session:  this.session
        })
        break
      default:
        throw new Error('Puppet unsupport(yet): ' + this.puppetType)
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
      function getPort(cb) {
        var tryPort = port
        port += 1
        var server = require('net').createServer()
        server.on('error', function(err) {
          if (err) {}
          getPort(cb)
        })
        server.listen(tryPort, function(err) {
          if (err) {}
          server.once('close', function() {
            cb(tryPort)
          })
          server.close()
        })
      }
      getPort(okPort => resolve(okPort))
    })
  }
}

const Message = require('./message')
const Contact = require('./contact')
const Room    = require('./room')

const Puppet  = require('./puppet')
Puppet.Web    = require('./puppet-web')

Object.assign(Wechaty, {
  Puppet

  , Message
  , Contact
  , Room

  , log // for convenionce use npmlog with environment variable LEVEL
})

/**
 * Expose `Wechaty`.
 */
module.exports = Wechaty.default = Wechaty.Wechaty = Wechaty
