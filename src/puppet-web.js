/**
 *
 * wechaty: Wechat for Bot. and for human who talk to bot/robot
 *
 * Web Puppet
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
const log = require('npmlog')
const co  = require('co')

const Puppet = require('./puppet')
const Message = require('./message')
const Contact = require('./contact')
const Group   = require('./group')

const Server  = require('./puppet-web-server')
const Browser = require('./puppet-web-browser')
const Bridge  = require('./puppet-web-bridge')

class PuppetWeb extends Puppet {
  constructor(options) {
    super()
    options = options || {}
    this.port = options.port || 8788 // W(87) X(88), ascii char code ;-]
    this.head = options.head

    this.user = null  // <Contact> currentUser
  }

  toString() { return `Class PuppetWeb({browser:${this.browser},port:${this.port}})` }

  init() {
    log.verbose('PuppetWeb', 'init()')
    return this.initAttach()
    .then(this.initBrowser.bind(this))
    .then(this.initBridge.bind(this))
    .then(this.initServer.bind(this))
    .catch(e => {
      log.error('PuppetWeb', e)
      throw e
    })
  }
  initAttach() {
    log.verbose('PuppetWeb', 'initAttach()')
    Contact.attach(this)
    Group.attach(this)
    return Promise.resolve()
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

    ;[  // simple server events forwarding
      'connection'
      , 'disconnect'
      , 'scan'
      , 'log'
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

  onServerLogin(data) {
    co(function* () {
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
    }.bind(this))
    .catch(e => log.error('PuppetWeb', 'onServerLogin rejected: %s', e))
  }
  onServerLogout(data) {
    this.user = null
    this.emit('logout', data)
  }
  onServerMessage(data) {
    const m = new Message(data)
    if (!this.user) {
      log.warn('PuppetWeb', 'onServerMessage() without this.user')
    } else if (this.user.id==m.from().id) {
      log.silly('PuppetWeb', 'onServerMessage skip msg send by self')
      return
    }
    this.emit('message', m)
  }
  onServerUnload(data) {
    /**
     * `unload` event is sent from js@browser to webserver via socketio
     * after received `unload`, we re-inject the Wechaty js code into browser.
     */
    log.verbose('PuppetWeb', 'server received unload event')
    this.emit('logout', data) // XXX: should emit event[logout] from browser
    this.bridge.inject()
    .then(r  => log.verbose('PuppetWeb', 're-injected:' + r))
    .catch(e => log.error('PuppetWeb', 'inject err: ' + e))
  }

  send(message) {
    const userName    = message.get('to').id
    const content     = message.content()

    log.silly('PuppetWeb', `send(${userName}, ${content})`)
    return this.bridge.send(userName, content)
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

  debugLoop() {
    // XXX
    this.bridge.getLoginStatusCode().then((c) => {
      log.verbose('PuppetWeb', `login status code: ${c}`)
      setTimeout(this.debugLoop.bind(this), 3000)
    })
  }

  /**
   *  Interface Methods
   */
  quit() {
    log.verbose('PuppetWeb', 'quit()')
    if (this.server)  { this.server.quit() }
    if (this.bridge)  { this.bridge.quit() }
    if (this.browser) { this.browser.quit() }
  }
  isLogined()           { return !!(this.user) }
}

module.exports = PuppetWeb
