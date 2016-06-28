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
 * Class PuppetWeb
 *
 ***************************************/
const util  = require('util')
const fs    = require('fs')
const co    = require('co')

const log = require('./npmlog-env')

const Puppet  = require('./puppet')
const Contact = require('./contact')
const Room    = require('./room')

const Message = require('./message')
const MediaMessage = require('./message-media')

const Server  = require('./puppet-web-server')
const Browser = require('./puppet-web-browser')
const Bridge  = require('./puppet-web-bridge')

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
  log.verbose('PuppetWebEvent', 'onBrowserDead()')
  // because this function is async, so maybe entry more than one times.
  // guard by variable: onBrowserBirthing to prevent the 2nd time entrance.
  if (this.onBrowserBirthing) {
    log.warn('PuppetWebEvent', 'onBrowserDead() Im busy, dont call me again before I return. this time will return and do nothing')
    return
  }
  this.onBrowserBirthing = true

  const TIMEOUT = 180000 // 180s / 3m
  this.watchDog(`onBrowserDead() set a timeout of ${Math.floor(TIMEOUT / 1000)} seconds to prevent unknown state change`, {timeout: TIMEOUT})

  log.verbose('PuppetWebEvent', 'onBrowserDead(%s)', e.message || e)
  if (!this.browser || !this.bridge) {
    log.error('PuppetWebEvent', 'onBrowserDead() browser or bridge not found. do nothing')
    return
  }

  return co.call(this, function* () {
    log.verbose('PuppetWebEvent', 'onBrowserDead() try to reborn browser')

    yield this.browser.quit()
    .catch(e => { // fail safe
      log.warn('PuppetWebEvent', 'browser.quit() exception: %s', e.message)
    })
    log.verbose('PuppetWebEvent', 'old browser quited')

    yield this.initBrowser()
    log.verbose('PuppetWebEvent', 'new browser inited')

    yield this.bridge.init()
    log.verbose('PuppetWebEvent', 'bridge re-inited')

    const dong = yield this.ding()
    if (/dong/i.test(dong)) {
      log.verbose('PuppetWebEvent', 'ding() works well after reset')
    } else {
      log.warn('PuppetWebEvent', 'ding() get error return after reset: ' + dong)
    }
  })
  .catch(e => { // Exception
    log.error('PuppetWebEvent', 'onBrowserDead() exception: %s', e.message)

    log.warn('PuppetWebEvent', 'onBrowserDead() try to re-init PuppetWeb itself')
    return this.quit().then(() => this.init())
  })
  .then(() => { // Finally
    log.verbose('PuppetWebEvent', 'onBrowserDead() new browser borned')
    this.onBrowserBirthing = false
  })
}

function onServerDing(data) {
  log.silly('PuppetWebEvent', 'onServerDing(%s)', data)
  this.watchDog(data)
}

function onServerScan(data) {
  log.verbose('PuppetWebEvent', 'onServerScan(%d)', data && data.code)

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
  this.watchDog(data, {type: 'scan'})

  this.emit('scan', data)
}

function onServerConnection(data) {
  log.verbose('PuppetWebEvent', 'onServerConnection: %s', typeof data)
}

function onServerDisconnect(data) {
  log.verbose('PuppetWebEvent', 'onServerDisconnect: %s', data)

  if (this.userId) {
    log.verbose('PuppetWebEvent', 'onServerDisconnect() there has userId set. emit a logout event and set userId to null')
    this.emit('logout', this.user || this.userId ) //'onServerDisconnect(' + data + ')')
    this.userId = null
    this.user = null
  }

  /**
   * conditions:
   * 1. browser crash(i.e.: be killed)
   * 2. quiting
   */
  if (!this.browser) {                // no browser, quiting?
    log.verbose('PuppetWebEvent', 'onServerDisconnect() no browser. maybe Im quiting, do nothing')
    return
  } else if (this.browser.dead()) {   // browser is dead
    log.verbose('PuppetWebEvent', 'onServerDisconnect() found dead browser. wait it to restore')
    return
  } else if (!this.bridge) {          // no bridge, quiting???
    log.verbose('PuppetWebEvent', 'onServerDisconnect() no bridge. maybe Im quiting, do nothing')
    return
  }

  this.browser.readyLive()
  .then(r => {  // browser is alive, and we have a bridge to it
    log.verbose('PuppetWebEvent', 'onServerDisconnect() re-initing bridge')
    // must use setTimeout to wait a while.
    // because the browser has just refreshed, need some time to re-init to ready.
    // if the browser is not ready, bridge init will fail,
    // caused browser dead and have to be restarted. 2016/6/12
    setTimeout(() => {
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
 * `unload` event is sent from js@browser to webserver via socketio
 * after received `unload`, we should fix bridge by re-inject the Wechaty js code into browser.
 * possible conditions:
 * 1. browser refresh
 * 2. browser navigated to a new url
 * 3. browser quit(crash?)
 * 4. ...
 */
function onServerUnload(data) {
  log.warn('PuppetWebEvent', 'onServerUnload(%s)', typeof data)
  // onServerLogout.call(this, data) // XXX: should emit event[logout] from browser

  if (!this.browser) {
    log.warn('PuppetWebEvent', 'onServerUnload() found browser gone, should be quiting now')
    return
  } else if (!this.bridge) {
    log.warn('PuppetWebEvent', 'onServerUnload() found bridge gone, should be quiting now')
    return
  } else if (this.browser.dead()) {
    log.error('PuppetWebEvent', 'onServerUnload() found browser dead. wait it to restore itself')
    return
  }
  // re-init bridge after 1 second XXX: better method to confirm unload/reload finished?
  return setTimeout(() => {
    this.bridge.init()
    .then(r  => log.verbose('PuppetWebEvent', 'onServerUnload() bridge.init() done: %s', r))
    .catch(e => log.error('PuppetWebEvent', 'onServerUnload() bridge.init() exceptoin: %s', e.message))
  }, 1000)
}

function onServerLog(data) {
  log.verbose('PuppetWebEvent', 'onServerLog: %s', data)
}

function onServerLogin(data) {
  co.call(this, function* () {
    // co.call to make `this` context work inside generator.
    // See also: https://github.com/tj/co/issues/274

    /**
     * save login user id to this.userId
     */
    this.userId = yield this.bridge.getUserName()

    if (!this.userId) {
      log.verbose('PuppetWebEvent', 'onServerLogin: browser not full loaded, retry later.')
      setTimeout(onServerLogin.bind(this), 500)
      return
    }

    log.verbose('PuppetWebEvent', 'bridge.getUserName: %s', this.userId)
    this.user = yield Contact.load(this.userId).ready()
    log.verbose('PuppetWebEvent', `onServerLogin() user ${this.user.name()} logined`)
    this.emit('login', this.user)

    yield this.browser.saveSession()
              .catch(e => { // fail safe
                log.warn('PuppetWebEvent', 'browser.saveSession exception: %s', e.message)
              })
  }).catch(e => {
    log.error('PuppetWebEvent', 'onServerLogin() exception: %s', e.message)
  })
}

function onServerLogout(data) {
  if (this.user) {
    this.emit('logout', this.user)
  } else { log.verbose('PuppetWebEvent', 'onServerLogout() without this.user initialized') }

  this.user = null
  this.userId = null

  this.browser.cleanSession()
  .catch(e => { /* fail safe */
    log.verbose('PuppetWebEvent', 'onServerLogout() browser.cleanSession() exception: %s', e.message)
  })
}

function onServerMessage(data) {
  let m
  // log.warn('PuppetWebEvent', 'MsgType: %s', data.MsgType)
  switch (data.MsgType) {
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
    /**
     * FIXME: add retry here...
     * setTimeout(onServerMessage.bind(this, data, ++attempt), 1000)
     */
  })
}

module.exports = PuppetWebEvent
