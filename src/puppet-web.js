/**
 *
 * wechaty: Wechat for Bot. and for human who talk to bot/robot
 *
 * Class PuppetWeb
 *
 * use to control wechat web.
 *
 * Licenst: ISC
 * https://github.com/zixia/wechaty
 *
 */

/**************************************
 *
 * Class PuppetWeb
 *
 ***************************************/
const util = require('util')
const log = require('npmlog')
const co  = require('co')

const Puppet = require('./puppet')
const Message = require('./message')
const Contact = require('./contact')
const Room    = require('./room')

const Server  = require('./puppet-web-server')
const Browser = require('./puppet-web-browser')
const Bridge  = require('./puppet-web-bridge')

class PuppetWeb extends Puppet {
  constructor(options) {
    super()
    options = options || {}
    this.port = options.port || 8788 // W(87) X(88), ascii char code ;-]
    this.head = options.head

    this.user = null  // <Contact> of user self
  }

  toString() { return `Class PuppetWeb({browser:${this.browser},port:${this.port}})` }

  init() {
    log.verbose('PuppetWeb', 'init()')

    return co.call(this, function* () {

      yield this.initAttach(this)
      log.verbose('PuppetWeb', 'initAttach() done')

      yield this.initServer()
      log.verbose('PuppetWeb', 'initServer() done')

      yield this.initBrowser()
      log.verbose('PuppetWeb', 'initBrowser() done')

      yield this.initBridge()
      log.verbose('PuppetWeb', 'initBridge() done')

      return this
    })
    .catch(e => {                 // Reject
      log.error('PuppetWeb', e)
      throw e
    })
    .then(() => {                  // Finally
      log.verbose('PuppetWeb', 'init() done')
      return this   // for Chaining
    })


    // return this.initAttach()
    // .then(r => {
    //   log.verbose('PuppetWeb', 'initAttach done: %s', r)
    //   return this.initBrowser()
    // })
    // .then(r => {
    //   log.verbose('PuppetWeb', 'initBrowser done: %s', r)
    //   return this.initBridge()
    // })
    // .then(r => {
    //   log.verbose('PuppetWeb', 'initBridge done: %s', r)
    //   return this.initServer()
    // })
    // .then(r => {
    //   log.verbose('PuppetWeb', 'initServer done: %s', r)
    //   return r
    // })
    // .catch(e => {                 // Reject
    //   log.error('PuppetWeb', e)
    //   throw e
    // })
    // .then(r => {                  // Finally
    //   log.verbose('PuppetWeb', 'all initXXX done.')
    //   return this   // for Chaining
    // })
  }

  quit() {
    log.verbose('PuppetWeb', 'quit()')

    return co.call(this, function* () {

      if (this.bridge)  {
        yield this.bridge.quit()
        this.bridge = null
      } else { log.warn('PuppetWeb', 'quit() without bridge') }

      if (this.browser) {
        yield this.browser.quit()
        this.browser = null
      } else { log.warn('PuppetWeb', 'quit() without browser') }

      if (this.server) {
        yield this.server.quit()
        this.server = null
      } else { log.warn('PuppetWeb', 'quit() without server') }

      yield this.initAttach(null)
    })
    .catch(e => {                 // Reject
      log.error('PuppetWeb', e)
      throw e
    })
    .then(() => {                  // Finally
      log.verbose('PuppetWeb', 'quit() done')
      return this   // for Chaining
    })

    // let p = Promise.resolve(true)

    // if (this.bridge)  {
    //   p.then(this.bridge.quit.bind(this.bridge))
    //   this.bridge = null
    // } else {
    //   log.warn('PuppetWeb', 'quit() without bridge')
    // }

    // if (this.browser) {
    //   p.then(this.browser.quit.bind(this.browser))
    //   this.browser = null
    // } else {
    //   log.warn('PuppetWeb', 'quit() without browser')
    // }

    // if (this.server) {
    //   p.then(this.server.quit.bind(this.server))
    //   this.server = null
    // } else {
    //   log.warn('PuppetWeb', 'quit() without server')
    // }

    // return p // return Promise
  }

  initAttach(puppet) {
    log.verbose('PuppetWeb', 'initAttach()')
    Contact.attach(puppet)
    Room.attach(puppet)
    return Promise.resolve(true)
  }
  initBrowser() {
    log.verbose('PuppetWeb', 'initBrowser')
    this.browser  = new Browser({ head: this.head })
    return this.browser.init()
  }
  initBridge() {
    log.verbose('PuppetWeb', 'initBridge()')
    this.bridge = new Bridge({
      browser:  this.browser
      , port:   this.port
    })
    return this.bridge.init()
  }
  initServer() {
    log.verbose('PuppetWeb', 'initServer()')
    const server = new Server({port: this.port})

    server.on('login',   this.onServerLogin.bind(this))
    server.on('logout',  this.onServerLogout.bind(this))
    server.on('message', this.onServerMessage.bind(this))
    server.on('unload',  this.onServerUnload.bind(this))

    server.on('connection', this.onServerConnection.bind(this))
    server.on('disconnect', this.onServerDisconnect.bind(this))
    server.on('log', this.onServerLog.bind(this))

    ;[  // Public events to end user
      , 'scan'
      , 'dong'
    ].map(e => {
      server.on(e, data => {
        log.verbose('PuppetWeb', 'Server event[%s]: %s', e, data)
        this.emit(e, data)
      })
    })

    this.server = server
    return this.server.init()
  }

  onServerConnection(data) {
    log.verbose('PuppetWeb', 'onServerConnection: %s', data.constructor.name)
  }
  onServerDisconnect(data) {
    log.verbose('PuppetWeb', 'onServerDisconnect: %s', data)
    log.verbose('PuppetWeb', 'onServerDisconnect: unloaded? call onServerUnload to try to fix connection')
    this.onServerUnload(data)
  }
  onServerLog(data) {
    log.verbose('PuppetWeb', 'onServerLog: %s', data)
  }

  onServerLogin(data) {
    co.call(this, function* () {
      // co.call to make `this` context work inside generator.
      // See also: https://github.com/tj/co/issues/274
      const userName = yield this.bridge.getUserName()
      if (!userName) {
        log.silly('PuppetWeb', 'onServerLogin: browser not full loaded, retry later.')
        setTimeout(this.onServerLogin.bind(this), 100)
        return
      }
      log.silly('PuppetWeb', 'userName: %s', userName)
      this.user = yield Contact.load(userName).ready()
      log.verbose('PuppetWeb', `user ${this.user.name()} logined`)
      this.emit('login', this.user)
    })
    .catch(e => log.error('PuppetWeb', 'onServerLogin rejected: %s', e))
  }
  onServerLogout(data) {
    this.emit('logout', this.user)
    this.user = null
  }
  onServerMessage(data) {
    const m = new Message(data)
    if (!this.user) {
      log.warn('PuppetWeb', 'onServerMessage() without this.user')
    }
    m.set('self', this.user.id)
    this.emit('message', m)
  }
  onServerUnload(data) {
    /**
     * `unload` event is sent from js@browser to webserver via socketio
     * after received `unload`, we re-inject the Wechaty js code into browser.
     */
    log.verbose('PuppetWeb', 'server received unload event')
    this.emit('logout', data) // XXX: should emit event[logout] from browser

    if (!this.browser || !this.bridge) {
      log.verbose('PuppetWeb', 'bridge gone, should be quiting now')
      return
    }

    return this.browser.quit()
    .then(r  => log.verbose('PuppetWeb', 'browser.quit()ed:' + r))
    .then(r => this.browser.init())
    .then(r  => log.verbose('PuppetWeb', 'browser.re-init()ed:' + r))
    .then(r => this.bridge.init())
    .then(r  => log.verbose('PuppetWeb', 'bridge.re-init()ed:' + r))
    .catch(e => log.error('PuppetWeb', 'onServerUnload() err: ' + e))
  }

  send(message) {
    const to      = message.get('to')
    const room    = message.get('room')

    let content     = message.get('content')
    let destination = to

    if (room) {
      destination = room
      if (to && to!==room) {
        content = `@[${to}] ${content}`
      }
    }

    log.silly('PuppetWeb', `send(${destination}, ${content})`)
    return this.bridge.send(destination, content)
  }

  logout()        { return this.bridge.logout() }
  getContact(id)  { return this.bridge.getContact(id) }
  getLoginQrImgUrl() {
    if (!this.bridge) {
      log.error('PuppetWeb', 'bridge not found')
      return
    }
    return this.bridge.getLoginQrImgUrl()
  }
  logined() { return !!(this.user) }
}

module.exports = PuppetWeb
