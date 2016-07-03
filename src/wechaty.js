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
    type        = process.env.WECHATY_PUPPET   || 'web'
    , head      = process.env.WECHATY_HEAD     || false
    , port      = process.env.WECHATY_PORT     || 8788  // W(87) X(88), ascii char code ;-]
    , endpoint  = process.env.WECHATY_ENDPOINT          // wechaty.io api endpoint
    , token     = process.env.WECHATY_TOKEN             // token for wechaty.io auth
    , profile   = process.env.WECHATY_PROFILE           // no profile, no session save/restore
  } = {}) {
    super()
    this.type     = type
    this.head     = head
    this.port     = port
    this.token    = token
    this.endpoint = endpoint

    this.profile  = /\.wechaty\.json$/i.test(profile)
                    ? profile
                    : profile + '.wechaty.json'

    this.npmVersion = require('../package.json').version

    this.inited = false
  }

  toString() { return 'Class Wechaty(' + this.type + ')'}

  version()  { return this.npmVersion }

  init() {
    log.info('Wechaty', 'v%s initializing...', this.npmVersion)
    log.verbose('Wechaty', 'puppet: %s' , this.type)
    log.verbose('Wechaty', 'head: %s'   , this.head)
    log.verbose('Wechaty', 'profile: %s', this.profile)

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

      this.io = yield this.initIo()
      .catch(e => { // fail safe
        log.error('WechatyIo', 'initIo failed: %s', e.message)
        this.emit('error', e)
      })

      this.puppet = yield this.initPuppet()

      this.inited = true
      return this // for chaining
    })
    .catch(e => {
      log.error('Wechaty', 'init() exception: %s', e.message)
      throw e
    })
  }

  initIo() {
    if (!this.token) {
      log.verbose('Wechaty', 'initIo() skiped for no token set')
      return Promise.resolve('no token')
    } else {
      log.verbose('Wechaty', 'initIo(%s)', this.token)
    }

    const WechatyIo = require('./wechaty-io')
    const io = new WechatyIo({
      wechaty: this
      , token: this.token
      , endpoint: this.endpoint
    })

    return io.init()
    .catch(e => {
      log.verbose('Wechaty', 'Wechaty.IO init fail: %s', e.message)
      throw e
    })
  }

  initPuppet() {
    let puppet
    switch (this.type) {
      case 'web':
        puppet = new PuppetWeb( {
          head:       this.head
          , port:     this.port
          , profile:  this.profile
        })
        break
      default:
        throw new Error('Puppet unsupport(yet): ' + this.type)
    }

    ;[
      'scan'
      , 'message'
      , 'login'
      , 'logout'
      , 'error'
      , 'heartbeat'
    ].map(e => {
      puppet.on(e, data => {
        this.emit(e, data)
      })
    })
    /**
     * TODO: support more events:
     * 2. send
     * 3. reply
     * 4. quit
     * 5. ...
     */

    return puppet.init()
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

// const Puppet  = require('./puppet')
const PuppetWeb     = require('./puppet-web')

Object.assign(Wechaty, {
  Message
  , Contact
  , Room

  , log // for convenionce use npmlog with environment variable LEVEL
  // Puppet
})

Wechaty.version = require('../package.json').version
/**
 * Expose `Wechaty`.
 */
module.exports = Wechaty.default = Wechaty.Wechaty = Wechaty
