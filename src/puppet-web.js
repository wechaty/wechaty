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
const fs  = require('fs')
const co  = require('co')

const log = require('./npmlog-env')

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
    this.session = options.session  // if not set session, then dont store session.

    this.user = null  // <Contact> of user self
  }

  toString() { return `Class PuppetWeb({browser:${this.browser},port:${this.port}})` }

  init() {
    log.verbose('PuppetWeb', `init() with port:${this.port}, head:${this.head}, session:${this.session}`)

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
  }

  quit() {
    log.verbose('PuppetWeb', 'quit()')

    return co.call(this, function* () {
      if (this.bridge)  {
        yield this.bridge.quit().catch(e => {
          log.warn('PuppetWeb', 'quite() bridge.quite() rejected: %s', e)
        })
        this.bridge = null
      } else { log.warn('PuppetWeb', 'quit() without bridge') }

      if (this.server) {
        yield this.server.quit()
        this.server = null
      } else { log.warn('PuppetWeb', 'quit() without server') }

      if (this.browser) {
        yield (this.browser.quit().catch(e => { // fall safe
          log.warn('PuppetWeb', 'quit() browser.quit() fail: %s', e)
        }))
        this.browser = null
      } else { log.warn('PuppetWeb', 'quit() without browser') }

      yield this.initAttach(null)
    })
    .catch(e => {                 // Reject
      log.error('PuppetWeb', 'quit() co rejected: %s', e)
      throw e
    })
    .then(() => {                  // Finally, Fall Safe
      log.verbose('PuppetWeb', 'quit() done')
      return this   // for Chaining
    })
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

    this.browser.on('dead', this.onBrowserDead.bind(this))

    // fastUrl is used to open in browser for we can set cookies.
    const fastUrl = 'https://res.wx.qq.com/zh_CN/htmledition/v2/images/icon/ico_loading28a2f7.gif'
    // const fastUrl = 'https://t.qq.com' // domain??? ssl ca name not match

    return co.call(this, function* () {
      yield this.browser.init()
      yield this.browser.open(fastUrl)
      if (this.session) {
        yield this.browser.loadSession(this.session)
        .catch(e => { log.verbose('PuppetWeb', 'loadSession rejected: %s', e) /* fail safe */ })
      }
      yield this.browser.open()
    }).catch(e => {
      log.error('PuppetWeb', 'initBrowser rejected: %s', e)
      throw e
    })
  }
  initBridge() {
    log.verbose('PuppetWeb', 'initBridge()')
    this.bridge = new Bridge({
      puppet:   this // use puppet instead of browser, is because browser might be changed duaring run time
      , port:   this.port
    })

    return this.bridge.init()
    .catch(e => {
      if (this.browser.dead()) {
        log.warn('PuppetWeb', 'initBridge() found browser dead, wait to restore')
      } else {
        log.error('PuppetWeb', 'initBridge() init fail: %s', e.message)
        throw e
      }
    })
  }
  initServer() {
    log.verbose('PuppetWeb', 'initServer()')
    const server = new Server({port: this.port})

    server.on('scan'    , this.onServerScan.bind(this))
    server.on('login'   , this.onServerLogin.bind(this))
    server.on('logout'  , this.onServerLogout.bind(this))
    server.on('message' , this.onServerMessage.bind(this))
    server.on('unload'  , this.onServerUnload.bind(this))

    server.on('connection', this.onServerConnection.bind(this))
    server.on('disconnect', this.onServerDisconnect.bind(this))
    server.on('log', this.onServerLog.bind(this))

    ;[  // Public events to end user
      'dong'
    ].map(e => {
      server.on(e, data => {
        log.verbose('PuppetWeb', 'Server event[%s]: %s', e, data)
        this.emit(e, data)
      })
    })

    this.server = server
    return this.server.init()
  }

  onBrowserDead(data) {
    log.verbose('PuppetWeb', 'onBrowserDead(%s)', data)

    return co.call(this, function* () {
      log.verbose('PuppetWeb', 'onBrowserDead() try to fix browser')

      yield this.browser.quit()
      .then(() => {
        log.verbose('PuppetWeb', 'onBrowserDead() browser quited')
      })
      .catch(e => { // fall safe
        log.warn('PuppetWeb', 'quit() browser.quit() fail: %s', e)
      })

      yield this.initBrowser()
      log.verbose('PuppetWeb', 'onBrowserDead() browser inited')

      yield this.bridge.init()
      log.verbose('PuppetWeb', 'onBrowserDead() bridge inited')
    })
    .then(() => {
      log.verbose('PuppetWeb', 'onBrowserDead fixed browser')
    })
    .catch(e => {
      log.error('PuppetWeb', 'onBrowserDead rejected: %s', e)
    })
  }

  onServerScan(data) {
    log.verbose('PuppetWeb', 'onServerScan: %s', Object.keys(data).join(','))
    this.browser.cleanSession().catch(() => {/* fall safe */})
    this.emit('scan', data)
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
        log.verbose('PuppetWeb', 'onServerLogin: browser not full loaded, retry later.')
        setTimeout(this.onServerLogin.bind(this), 500)
        return
      }
      log.silly('PuppetWeb', 'userName: %s', userName)
      this.user = yield Contact.load(userName).ready()
      log.verbose('PuppetWeb', `user ${this.user.name()} logined`)
      this.emit('login', this.user)

      if (this.session) {
        yield this.browser.saveSession(this.session).catch(() => {/* fall safe */})
      }

    }).catch(e => log.error('PuppetWeb', 'onServerLogin co rejected: %s', e))
  }
  onServerLogout(data) {
    if (this.user) {
      this.emit('logout', this.user)
      this.user = null
    } else { log.verbose('PuppetWeb', 'onServerLogout without this.user. still not logined?') }
    // this.browser.cleanSession()
  }
  onServerMessage(data) {
    const m = new Message(data)
    if (this.user) {
      m.set('self', this.user.id)
    } else {
      log.warn('PuppetWeb', 'onServerMessage() without this.user')
    }
    m.ready().then(() => this.emit('message', m))
  }
  /**
   * `unload` event is sent from js@browser to webserver via socketio
   * after received `unload`, we re-inject the Wechaty js code into browser.
   */
  onServerUnload(data) {
    log.warn('PuppetWeb', 'server received unload event')
    // this.onServerLogout(data) // XXX: should emit event[logout] from browser

    if (!this.browser || !this.bridge) {
      log.verbose('PuppetWeb', 'bridge gone, should be quiting now')
      return
    }

    return process.nextTick(() => {
      this.bridge.init()
      .then(r  => log.verbose('PuppetWeb', 'bridge.re-init()ed:' + r))
      .catch(e => log.error('PuppetWeb', 'onServerUnload() err: ' + e.message))
    })

    // return this.quit()
    // .then(this.init.bind(this))
    // .catch(e => {
    //   log.warn('PuppetWeb', 'onServerUnload fail: %s', e)
    //   throw e
    // })
/*
    return this.browser.quit()
    .then(r  => log.verbose('PuppetWeb', 'browser.quit()ed:' + r))
    .then(r => this.browser.init())
    .then(r  => log.verbose('PuppetWeb', 'browser.re-init()ed:' + r))
    .then(r => this.browser.open())
    .then(r  => log.verbose('PuppetWeb', 'browser.re-open()ed:' + r))
    .then(r => this.bridge.init())
    .then(r  => log.verbose('PuppetWeb', 'bridge.re-init()ed:' + r))
    .catch(e => log.error('PuppetWeb', 'onServerUnload() err: ' + e))
*/
  }

  send(message) {
    const to      = message.get('to')
    const room    = message.get('room')

    let content     = message.get('content')
    let destination = to

    if (room) {
      destination = room
      // if (to && to!==room) {
      //   content = `@[${to}] ${content}`
      // }
    }

    log.silly('PuppetWeb', `send(${destination}, ${content})`)
    return this.bridge.send(destination, content)
  }
  reply(message, replyContent) {
    if (message.self()) {
      throw new Error('dont reply message send by myself')
    }
    const m = new Message()
    .set('content'  , replyContent)

    .set('from'     , message.obj.to)
    .set('to'       , message.obj.from)
    .set('room'     , message.obj.room)

    // FIXME: find a alternate way to check a message create by `self`
    .set('self'     , this.user.id)

    log.verbose('PuppetWeb', 'reply() not sending message: %s', util.inspect(m))
    return this.send(m)
  }

  /**
   * logout from browser, then server will emit `logout` event
   */
  logout() { return this.bridge.logout() }

  getContact(id)  { return this.bridge.getContact(id) }
  logined() { return !!(this.user) }

}

module.exports = PuppetWeb
