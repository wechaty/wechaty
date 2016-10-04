/**
 *
 * wechaty: Wechat for Bot. and for human who talk to bot/robot
 *
 * Class PuppetWeb Events
 *
 * use to control wechat in web browser.
 *
 * Licenst: ISC
 * https://github.com/zixia/wechaty
 *
 */

/**************************************
 *
 * Events for Class PuppetWeb
 *
 * here `this` is a PuppetWeb Instance
 *
 ***************************************/
const util  = require('util')
const fs    = require('fs')
const co    = require('co')

const log = require('../brolog-env')
const Contact = require('../contact')
const Message = require('../message')
const MediaMessage = require('../message-media')
const FriendRequest = require('./friend-request')

const PuppetWebEvent = {
  onBrowserDead

  , onServerLogin
  , onServerLogout

  , onServerConnection
  , onServerDisconnect

  , onServerDing
  , onServerScan
  , onServerUnload
  , onServerLog

  , onServerMessage
}

function onBrowserDead(e) {
  log.verbose('PuppetWebEvent', 'onBrowserDead(%s)', e && e.message || e)
  // because this function is async, so maybe entry more than one times.
  // guard by variable: isBrowserBirthing to prevent the 2nd time entrance.
  // if (this.isBrowserBirthing) {
  //   log.warn('PuppetWebEvent', 'onBrowserDead() is busy, this call will return now. stack: %s', (new Error()).stack)
  //   return
  // }

  if (this.browser && this.browser.targetState() !== 'open') {
    log.verbose('PuppetWebEvent', 'onBrowserDead() will do nothing because browser.targetState(%s) !== open', this.browser.targetState())
    return
  }

  if (this.browser && this.browser.currentState() === 'opening') {
    log.warn('PuppetWebEvent', 'onBrowserDead() will do nothing because browser.currentState = opening. stack: %s', (new Error()).stack)
    return
  }

  this.scan = null

  return co.call(this, function* () {
    // log.verbose('PuppetWebEvent', 'onBrowserDead() co() set isBrowserBirthing true')
    // this.isBrowserBirthing = true

    const TIMEOUT = 180000 // 180s / 3m
    // this.watchDog(`onBrowserDead() set a timeout of ${Math.floor(TIMEOUT / 1000)} seconds to prevent unknown state change`, {timeout: TIMEOUT})
    this.emit('watchdog', {
      data: `onBrowserDead() set a timeout of ${Math.floor(TIMEOUT / 1000)} seconds to prevent unknown state change`
      , timeout: TIMEOUT
    })

    if (!this.browser || !this.bridge) {
      const e = new Error('no browser or no bridge')
      log.error('PuppetWebEvent', 'onBrowserDead() %s', e.message)
      throw e
    }

    log.verbose('PuppetWebEvent', 'onBrowserDead() try to reborn browser')

    yield this.browser.quit()
                      .catch(e => { // fail safe
                        log.warn('PuppetWebEvent', 'browser.quit() exception: %s, %s', e.message, e.stack)
                      })
    log.verbose('PuppetWebEvent', 'onBrowserDead() old browser quited')

    if (this.browser.targetState() !== 'open') {
      log.warn('PuppetWebEvent', 'onBrowserDead() will not init browser because browser.targetState(%s) !== open', this.browser.targetState())
      return
    }

    this.browser = yield this.initBrowser()
    log.verbose('PuppetWebEvent', 'onBrowserDead() new browser inited')

    // this.bridge = yield this.bridge.init()
    this.bridge = yield this.initBridge()
    log.verbose('PuppetWebEvent', 'onBrowserDead() bridge re-inited')

    const dong = yield this.ding()
    if (/dong/i.test(dong)) {
      log.verbose('PuppetWebEvent', 'onBrowserDead() ding() works well after reset')
    } else {
      log.warn('PuppetWebEvent', 'onBrowserDead() ding() get error return after reset: ' + dong)
    }
  })
  .catch(e => { // Exception
    log.error('PuppetWebEvent', 'onBrowserDead() exception: %s', e.message)

    log.warn('PuppetWebEvent', 'onBrowserDead() try to re-init PuppetWeb itself')
    return this.quit()
              .catch(e => log.warn('PuppetWebEvent', 'onBrowserDead() fail safe for this.quit(): %s', e.message))
              .then(_ => this.init())
  })
  .then(() => { // Finally
    log.verbose('PuppetWebEvent', 'onBrowserDead() new browser borned')
    // this.isBrowserBirthing = false

    this.emit('watchdog', {
      data: `onBrowserDead() new browser borned`
      , type: 'POISON'
    })
  })
}

function onServerDing(data) {
  log.silly('PuppetWebEvent', 'onServerDing(%s)', data)
  // this.watchDog(data)
  this.emit('watchdog', { data })
}

function onServerScan(data) {
  log.verbose('PuppetWebEvent', 'onServerScan(%d)', data && data.code)

  this.scan = data // ScanInfo

  /**
   * When wx.qq.com push a new QRCode to Scan, there will be cookie updates(?)
   */
  this.browser.saveSession()
      .catch(() => {/* fail safe */})

  if (this.userId) {
    log.verbose('PuppetWebEvent', 'onServerScan() there has userId when got a scan event. emit logout and set userId to null')
    this.emit('logout', this.user || this.userId)
    this.userId = this.user = null
  }

  // feed watchDog a `scan` type of food
  // this.watchDog(data, {type: 'scan'})
  this.emit('watchdog', { data, type: 'SCAN' })

  this.emit('scan', data)
}

function onServerConnection(data) {
  log.verbose('PuppetWebEvent', 'onServerConnection: %s', data)
}

function onServerDisconnect(data) {
  log.verbose('PuppetWebEvent', 'onServerDisconnect: %s', data)

  if (this.userId) {
    log.verbose('PuppetWebEvent', 'onServerDisconnect() there has userId set. emit a logout event and set userId to null')
    this.emit('logout', this.user || this.userId ) //'onServerDisconnect(' + data + ')')
    this.userId = null
    this.user = null
  }

  // if (this.readyState() === 'disconnecting') {
  //   log.verbose('PuppetWebEvent', 'onServerDisconnect() be called when readyState is `disconnecting`')
  //   return
  // }
  if (this.currentState() === 'killing') {
    log.verbose('PuppetWebEvent', 'onServerDisconnect() be called when currentState is `killing`')
    return
  }

  if (!this.browser || !this.bridge) {
    const e = new Error('onServerDisconnect() no browser or bridge')
    log.error('PuppetWebEvent', '%s', e.message)
    throw e
  }

  /**
   * conditions:
   * 1. browser crash(i.e.: be killed)
   */
  if (this.browser.dead()) {   // browser is dead
    log.verbose('PuppetWebEvent', 'onServerDisconnect() found dead browser. wait it to restore')
    return
  }

  this.browser.readyLive()
  .then(r => {  // browser is alive, and we have a bridge to it
    log.verbose('PuppetWebEvent', 'onServerDisconnect() re-initing bridge')
    // must use setTimeout to wait a while.
    // because the browser has just refreshed, need some time to re-init to be ready.
    // if the browser is not ready, bridge init will fail,
    // caused browser dead and have to be restarted. 2016/6/12
    setTimeout(_ => {
      if (!this.bridge) {
        throw new Error('bridge gone after setTimeout? why???')  // XXX: sometimes this.bridge gone in this timeout. why? what's happend between the last if(!this.bridge) check and the timeout call?
      }
      this.bridge.init()
      .then(r  => log.verbose('PuppetWebEvent', 'onServerDisconnect() bridge re-inited: %s', r))
      .catch(e => log.error('PuppetWebEvent', 'onServerDisconnect() exception: [%s]', e))
    }, 1000) // 1 second instead of 10 seconds? try. (should be enough to wait)
    return
  })
  .catch(e => { // browser is in indeed dead, or almost dead. readyLive() will auto recover itself.
    log.verbose('PuppetWebEvent', 'onServerDisconnect() browser dead, waiting it recover itself: %s', e.message)
    return
  })
}

/**
 *
 * @depreciated 20160825 zixia
 * when `unload` there should always be a `disconnect` event?
 *
 * `unload` event is sent from js@browser to webserver via socketio
 * after received `unload`, we should fix bridge by re-inject the Wechaty js code into browser.
 * possible conditions:
 * 1. browser refresh
 * 2. browser navigated to a new url
 * 3. browser quit(crash?)
 * 4. ...
 */
function onServerUnload(data) {
  log.warn('PuppetWebEvent', 'onServerUnload(%s)', data)
  // onServerLogout.call(this, data) // XXX: should emit event[logout] from browser

  // if (this.readyState() === 'disconnecting') {
  //   log.verbose('PuppetWebEvent', 'onServerUnload() will return because readyState is `disconnecting`')
  //   return
  // }
  if (this.currentState() === 'killing') {
    log.verbose('PuppetWebEvent', 'onServerUnload() will return because currentState is `killing`')
    return
  }

  if (!this.browser || !this.bridge) {
    const e = new Error('no bridge or no browser')
    log.warn('PuppetWebEvent', 'onServerUnload() %s', e.message)
    throw e
  }

  if (this.browser.dead()) {
    log.error('PuppetWebEvent', 'onServerUnload() found browser dead. wait it to restore itself')
    return
  }

  // re-init bridge after 1 second XXX: better method to confirm unload/reload finished?
  return setTimeout(() => {
    if (!this.bridge) {
      log.warn('PuppetWebEvent', 'onServerUnload() bridge gone after setTimeout()')
      return
    }
    this.bridge.init()
              .then(r  => log.verbose('PuppetWebEvent', 'onServerUnload() bridge.init() done: %s', r))
              .catch(e => log.error('PuppetWebEvent', 'onServerUnload() bridge.init() exceptoin: %s', e.message))
  }, 1000)
}

function onServerLog(data) {
  log.verbose('PuppetWebEvent', 'onServerLog(%s)', data)
}

function onServerLogin(data, attempt = 0) {
  log.verbose('PuppetWebEvent', 'onServerLogin(%s, %d)', data, attempt)

  this.scan = null

  if (this.userId) {
    log.verbose('PuppetWebEvent', 'onServerLogin() be called but with userId set?')
  }

  co.call(this, function* () {
    // co.call to make `this` context work inside generator.
    // See also: https://github.com/tj/co/issues/274

    /**
     * save login user id to this.userId
     */
    this.userId = yield this.bridge.getUserName()

    if (!this.userId) {
      log.verbose('PuppetWebEvent', 'onServerLogin: browser not full loaded(%d), retry later', attempt)
      setTimeout(onServerLogin.bind(this, data, ++attempt), 500)
      return
    }

    log.verbose('PuppetWebEvent', 'bridge.getUserName: %s', this.userId)
    this.user = yield Contact.load(this.userId).ready()
    log.verbose('PuppetWebEvent', `onServerLogin() user ${this.user.name()} logined`)

    yield this.browser.saveSession()
              .catch(e => { // fail safe
                log.verbose('PuppetWebEvent', 'onServerLogin() browser.saveSession exception: %s', e.message)
              })

    this.emit('login', this.user)

  }).catch(e => {
    log.error('PuppetWebEvent', 'onServerLogin() exception: %s', e)
    console.log(e.stack)
    throw e
  })
}

function onServerLogout(data) {
  this.emit('logout', this.user || this.userId)

  if (!this.user && !this.userId) {
    log.warn('PuppetWebEvent', 'onServerLogout() without this.user or userId initialized')
  }

  this.userId = null
  this.user   = null

  // this.browser.cleanSession()
  // .catch(e => { /* fail safe */
  //   log.verbose('PuppetWebEvent', 'onServerLogout() browser.cleanSession() exception: %s', e.message)
  // })
}

function onServerMessage(data) {
  let m
  // log.warn('PuppetWebEvent', 'MsgType: %s', data.MsgType)
  switch (data.MsgType) {
    /**
     * Message.Type.VERIFYMSG: Received Friend Request
     */
    case Message.Type.VERIFYMSG:
      log.silly('PuppetWebEvent', 'onServerMessage() received VERIFYMSG')

      m = new Message(data)

      const request = new FriendRequest()
      request.receive(data.RecommendInfo)

      this.emit('friend', request.contact, request)
      break

    case Message.Type.SYS:
      log.silly('PuppetWebEvent', 'onServerMessage() received SYSMSG')

      m = new Message(data)

      /**
       * try to find FriendRequest Confirmation Message
       */
      if (/^You have added(.+)as your WeChat contact. Start chatting!$/.test(m.get('content'))) {
        const request = new FriendRequest()
        const contact = Contact.load(m.get('from'))
        request.confirm(contact)

        this.emit('friend', contact)
      }
      break

    case Message.Type.IMAGE:
      // log.verbose('PuppetWebEvent', 'onServerMessage() IMAGE message')
      m = new MediaMessage(data)
      break

    case 'TEXT':
    default:
      m = new Message(data)
      break
  }

  // To Be Deleted: set self...
  if (this.userId) {
    m.set('self', this.userId)
  } else {
    log.warn('PuppetWebEvent', 'onServerMessage() without this.userId')
  }

  m.ready() // TODO: EventEmitter2 for video/audio/app/sys....
  .then(() => this.emit('message', m))
  .catch(e => {
    log.error('PuppetWebEvent', 'onServerMessage() message ready exception: %s', e)
    // console.log(e)
    /**
     * FIXME: add retry here...
     * setTimeout(onServerMessage.bind(this, data, ++attempt), 1000)
     */
  })
}

module.exports = PuppetWebEvent
