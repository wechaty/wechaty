/**
 *
 * wechaty: Wechat for Bot. and for human who talk to bot/robot
 *
 * Class PuppetWeb
 *
 * use to control wechat in web browser.
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
const util  = require('util')
const fs    = require('fs')
const co    = require('co')

const log = require('./npmlog-env')

const Puppet  = require('./puppet')
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
    this.port     = options.port || 8788 // W(87) X(88), ascii char code ;-]
    this.head     = options.head
    this.session  = options.session  // if not set session, then dont store session.

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
    })
    .catch(e => {   // Reject
      log.error('PuppetWeb', 'init exception: %s', e.message)
      throw e
    })
    .then(() => {   // Finally
      log.verbose('PuppetWeb', 'init() done')
      return this   // for Chaining
    })
  }

  quit() {
    log.verbose('PuppetWeb', 'quit()')

    return co.call(this, function* () {
      if (this.bridge)  {
        yield this.bridge.quit().catch(e => { // fail safe
          log.warn('PuppetWeb', 'quite() bridge.quit() exception: %s', e.message)
        })
        this.bridge = null
      } else { log.warn('PuppetWeb', 'quit() without a bridge') }

      if (this.server) {
        yield this.server.quit()
        this.server = null
      } else { log.warn('PuppetWeb', 'quit() without a server') }

      if (this.browser) {
        yield (this.browser.quit().catch(e => { // fail safe
          log.warn('PuppetWeb', 'quit() browser.quit() exception: %s', e.message)
        }))
        this.browser = null
      } else { log.warn('PuppetWeb', 'quit() without a browser') }

      yield this.initAttach(null)
    })
    .catch(e => { // Reject
      log.error('PuppetWeb', 'quit() exception: %s', e.message)
      throw e
    })
    .then(() => { // Finally, Fail Safe
      log.verbose('PuppetWeb', 'quit() done')
      return this   // for Chaining
    })
  }

  initAttach(puppet) {
    log.verbose('PuppetWeb', 'initAttach()')
    Contact.attach(puppet)
    Room.attach(puppet)
    return Promise.resolve(!!puppet)
  }
  initBrowser() {
    log.verbose('PuppetWeb', 'initBrowser()')
    this.browser  = new Browser({head: this.head})
    this.browser.on('dead', this.onBrowserDead.bind(this))

    // fastUrl is used to open in browser for we can set cookies.
    const fastUrl = 'https://res.wx.qq.com/zh_CN/htmledition/v2/images/icon/ico_loading28a2f7.gif'
    // const fastUrl = 'https://t.qq.com' // domain??? ssl ca name not match

    return co.call(this, function* () {
      yield this.browser.init()
      yield this.browser.open(fastUrl)
      if (this.session) {
        yield this.browser.loadSession(this.session)
        .catch(e => { // fail safe
          log.verbose('PuppetWeb', 'browser.loadSession() exception: %s', e.message || e)
        })
      }
      yield this.browser.open()
      return this.browser // follow func name meaning
    }).catch(e => {
      log.error('PuppetWeb', 'initBrowser() exception: %s', e.message)
      throw e
    })
  }
  initBridge() {
    log.verbose('PuppetWeb', 'initBridge()')
    this.bridge = new Bridge({
      puppet:   this // use puppet instead of browser, is because browser might change(die) duaring run time
      , port:   this.port
    })

    return this.bridge.init()
    .catch(e => {
      if (this.browser.dead()) {
        log.warn('PuppetWeb', 'initBridge() found browser dead, wait it to restore')
      } else {
        log.error('PuppetWeb', 'initBridge() exception: %s', e.message)
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
    server.on('log'       , this.onServerLog.bind(this))
    server.on('ding'      , this.onServerDing.bind(this))

    this.server = server
    return this.server.init()
    .catch(e => {
      log.error('PuppetWeb', 'initServer() exception: %s', e.message)
      throw e
    })
  }

  onBrowserDead(e) {
    // because this function is async, so maybe entry more than one times.
    // guard by variable: onBrowserDeadBusy to prevent the 2nd time entrance.
    if (this.onBrowserDeadBusy) {
      log.warn('PuppetWeb', 'onBrowserDead() Im busy, dont call me again before I return. this time will return and do nothing')
      return
    }
    this.onBrowserDeadBusy = true

    const TIMEOUT = 180000 // 180s / 3m
    this.watchDog(`onBrowserDead() set a timeout of ${Math.floor(TIMEOUT/1000)} seconds to prevent unknown state change`, {timeout: TIMEOUT})

    log.verbose('PuppetWeb', 'onBrowserDead(%s)', e.message || e)
    if (!this.browser || !this.bridge) {
      log.error('PuppetWeb', 'onBrowserDead() browser or bridge not found. do nothing')
      return
    }

    return co.call(this, function* () {
      log.verbose('PuppetWeb', 'onBrowserDead() try to reborn browser')

      yield this.browser.quit()
      .catch(e => { // fail safe
        log.warn('PuppetWeb', 'browser.quit() exception: %s', e.message)
      })
      log.verbose('PuppetWeb', 'old browser quited')

      yield this.initBrowser()
      log.verbose('PuppetWeb', 'new browser inited')

      yield this.bridge.init()
      log.verbose('PuppetWeb', 'bridge re-inited')

      const dong = yield this.ding()
      if (/dong/i.test(dong)) {
        log.verbose('PuppetWeb', 'ding() works well after reset')
      } else {
        log.warn('PuppetWeb', 'ding() get error return after reset: ' + dong)
      }
    })
    .catch(e => { // Exception
      log.error('PuppetWeb', 'onBrowserDead() exception: %s', e.message)
      throw e
    })
    .then(() => { // Finally
      log.verbose('PuppetWeb', 'onBrowserDead() new browser borned')
      this.onBrowserDeadBusy = false
    })
  }

  // feed me in time(after 1st feed), or I'll restart system
  watchDog(data, options) {
    log.silly('PuppetWeb', 'watchDog(%s)', data)
    options = options || {}
    const TIMEOUT = options.timeout || 60000 // 60s default. can be override in options

    if (this.watchDogTimer) {
      clearTimeout(this.watchDogTimer)
    }
    this.watchDogTimer = setTimeout(() => {
      const err = new Error('watchdog timeout after ' + Math.floor(TIMEOUT/1000) + ' seconds')
      // this.emit('error', err)
      this.onBrowserDead(err)
    }, TIMEOUT)
    this.watchDogTimer.unref() // dont block quit

    const SAVE_SESSION_INTERVAL = 5 * 60 * 1000 // 5 min
    if (this.session) {
      if (!this.watchDogLastSaveSession || Date.now() - this.watchDogLastSaveSession > SAVE_SESSION_INTERVAL) {
        log.verbose('PuppetWeb', 'watchDog() saveSession(%s) after %d minutes', this.session, Math.floor(SAVE_SESSION_INTERVAL/1000/60))
        this.browser.saveSession(this.session)
        this.watchDogLastSaveSession = Date.now()
      }
    }
  }

  onServerDing(data) {
    log.silly('PuppetWeb', 'onServerDing(%s)', data)
    this.watchDog(data)
  }
  onServerScan(data) {
    log.verbose('PuppetWeb', 'onServerScan(%d)', data && data.code)
    if (this.session) {
      this.browser.cleanSession(this.session)
      .catch(() => {/* fail safe */})
    }
    this.emit('scan', data)
  }

  onServerConnection(data) {
    log.verbose('PuppetWeb', 'onServerConnection: %s', typeof data)
  }
  onServerDisconnect(data) {
    log.verbose('PuppetWeb', 'onServerDisconnect: %s', data)
    /**
     * conditions:
     * 1. browser crash(i.e.: be killed)
     * 2. quiting
     */
    if (!this.browser) {                // no browser, quiting?
      log.verbose('PuppetWeb', 'onServerDisconnect() no browser. maybe Im quiting, do nothing')
      return
    } else if (this.browser.dead()) {   // browser is dead
      log.verbose('PuppetWeb', 'onServerDisconnect() found dead browser. wait it to restore')
      return
    } else if (!this.bridge) {          // no bridge, quiting???
      log.verbose('PuppetWeb', 'onServerDisconnect() no bridge. maybe Im quiting, do nothing')
      return
    } else {                            // browser is alive, and we have a bridge to it
      log.verbose('PuppetWeb', 'onServerDisconnect() re-initing bridge')
      process.nextTick(() => {
        this.bridge.init()
        .then(r  => log.verbose('PuppetWeb', 'onServerDisconnect() bridge re-inited: %s', r))
        .catch(e => log.error('PuppetWeb', 'onServerDisconnect() exception: [%s]', e))
      })
      return
    }
  }
  /**
   * `unload` event is sent from js@browser to webserver via socketio
   * after received `unload`, we should fix bridge by re-inject the Wechaty js code into browser.
   * possible conditions:
   * 1. browser refresh
   * 2. browser navigated to a new url
   * 3. browser quit(crash?)
   * 4. ...
   */
  onServerUnload(data) {
    log.warn('PuppetWeb', 'onServerUnload(%s)', typeof data)
    // this.onServerLogout(data) // XXX: should emit event[logout] from browser

    if (!this.browser) {
      log.warn('PuppetWeb', 'onServerUnload() found browser gone, should be quiting now')
      return
    } else if (!this.bridge) {
      log.warn('PuppetWeb', 'onServerUnload() found bridge gone, should be quiting now')
      return
    } else if (this.browser.dead()) {
      log.error('PuppetWeb', 'onServerUnload() found browser dead. wait it to restore itself')
      return
    }
    // re-init bridge after 1 second XXX: better method to confirm unload/reload finished?
    return setTimeout(() => {
      this.bridge.init()
      .then(r  => log.verbose('PuppetWeb', 'onServerUnload() bridge.init() done: %s', r))
      .catch(e => log.error('PuppetWeb', 'onServerUnload() bridge.init() exceptoin: %s', e.message))
    }, 1000)
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
      log.verbose('PuppetWeb', 'bridge.getUserName: %s', userName)
      this.user = yield Contact.load(userName).ready()
      log.verbose('PuppetWeb', `onServerLogin() user ${this.user.name()} logined`)
      this.emit('login', this.user)

      if (this.session) {
        yield this.browser.saveSession(this.session)
        .catch(e => { // fail safe
          log.warn('PuppetWeb', 'browser.saveSession exception: %s', e.message)
        })
      }
    }).catch(e => {
      log.error('PuppetWeb', 'onServerLogin() exception: %s', e.message)
    })
  }
  onServerLogout(data) {
    if (this.user) {
      this.emit('logout', this.user)
      this.user = null
    } else { log.verbose('PuppetWeb', 'onServerLogout() without this.user initialized') }

    if (this.session) {
      this.browser.cleanSession(this.session)
      .catch(e => {
        log.warn('PuppetWeb', 'onServerLogout() browser.cleanSession() exception: %s', e.message)
      })
    }
  }
  onServerMessage(data) {
    const m = new Message(data)
    if (this.user) {
      m.set('self', this.user.id)
    } else {
      log.warn('PuppetWeb', 'onServerMessage() without this.user')
    }
    m.ready() // TODO: EventEmitter2 for video/audio/app/sys....
    .then(() => this.emit('message', m))
    .catch(e => {
      log.error('PuppetWeb', 'onServerMessage() message ready exception: %s', e)
    })
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
    .catch(e => {
      log.error('PuppetWeb', 'send() exception: %s', e.message)
      throw e
    })
  }
  reply(message, replyContent) {
    if (message.self()) {
      return Promise.reject(new Error('will not to reply message of myself'))
    }

    const m = new Message()
    .set('content'  , replyContent)

    .set('from'     , message.obj.to)
    .set('to'       , message.obj.from)
    .set('room'     , message.obj.room)
    // FIXME: find a alternate way to check a message create by `self`
    .set('self'     , this.user.id)

    // log.verbose('PuppetWeb', 'reply() by message: %s', util.inspect(m))
    return this.send(m)
    .catch(e => {
      log.error('PuppetWeb', 'reply() exception: %s', e.message)
      throw e
    })
  }

  /**
   * logout from browser, then server will emit `logout` event
   */
  logout() {
    return this.bridge.logout()
    .catch(e => {
      log.error('PuppetWeb', 'logout() exception: %s', e.message)
      throw e
    })
  }

  getContact(id) {
    return this.bridge.getContact(id)
    .catch(e => {
      log.error('PuppetWeb', 'getContact(%d) exception: %s', id, e.message)
      throw e
    })
  }
  logined() { return !!(this.user) }
  ding(data) {
    return this.bridge.proxyWechaty('ding', data)
    .catch(e => {
      log.warn('PuppetWeb', 'ding(%s) rejected: %s', data, e.message || e)
      throw e
    })
  }
}

module.exports = PuppetWeb
