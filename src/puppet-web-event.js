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
  onBrowserDead: onBrowserDead

  , onServerLogin: onServerLogin
  , onServerLogout: onServerLogout

  , onServerConnection: onServerConnection
  , onServerDisconnect: onServerDisconnect

  , onServerDing: onServerDing
  , onServerScan: onServerScan
  , onServerUnload: onServerUnload
  , onServerLog: onServerLog

  , onServerMessage: onServerMessage
}

function onBrowserDead(e) {
  // because this function is async, so maybe entry more than one times.
  // guard by variable: onBrowserBirthing to prevent the 2nd time entrance.
  if (this.onBrowserBirthing) {
    log.warn('PuppetWeb', 'onBrowserDead() Im busy, dont call me again before I return. this time will return and do nothing')
    return
  }
  this.onBrowserBirthing = true

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

    log.warn('PuppetWeb', 'onBrowserDead() try to re-init PuppetWeb itself')
    return this.quit().then(() => this.init())
  })
  .then(() => { // Finally
    log.verbose('PuppetWeb', 'onBrowserDead() new browser borned')
    this.onBrowserBirthing = false
  })
}

function onServerDing(data) {
  log.silly('PuppetWeb', 'onServerDing(%s)', data)
  this.watchDog(data)
}

function onServerScan(data) {
  log.verbose('PuppetWeb', 'onServerScan(%d)', data && data.code)

  /**
   * When wx.qq.com push a new QRCode to Scan, there will be cookie updates(?)
   */
  if (this.session) {
     this.browser.saveSession(this.session)
     .catch(() => {/* fail safe */})
   }
  this.emit('scan', data)
}

function onServerConnection(data) {
  log.verbose('PuppetWeb', 'onServerConnection: %s', typeof data)
}

function onServerDisconnect(data) {
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
  }

  this.browser.readyLive()
  .then(r => {  // browser is alive, and we have a bridge to it
    log.verbose('PuppetWeb', 'onServerDisconnect() re-initing bridge')
    // must use setTimeout to wait a while.
    // because the browser has just refreshed, need some time to re-init to ready.
    // if the browser is not ready, bridge init will fail,
    // caused browser dead and have to be restarted. 2016/6/12
    setTimeout(() => {
      this.bridge.init()
      .then(r  => log.verbose('PuppetWeb', 'onServerDisconnect() bridge re-inited: %s', r))
      .catch(e => log.error('PuppetWeb', 'onServerDisconnect() exception: [%s]', e))
    }, 1000) // 1 second instead of 10 seconds? try. (should be enough to wait)
    return
  })
  .catch(e => { // browser is in indeed dead, or almost dead. readyLive() will auto recover itself.
    log.verbose('PuppetWeb', 'onServerDisconnect() browser dead, waiting it recover itself: %s', e.message)
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

function onServerLog(data) {
  log.verbose('PuppetWeb', 'onServerLog: %s', data)
}

function onServerLogin(data) {
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
function onServerLogout(data) {
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

function onServerMessage(data) {
  let m
  // log.warn('PuppetWeb', 'MsgType: %s', data.MsgType)
  switch (data.MsgType) {
    case Message.Type.IMAGE:
      // log.verbose('PuppetWeb', 'onServerMessage() IMAGE message')
      m = new MediaMessage(data)
      break;

    case 'TEXT':
    default:
      m = new Message(data)
      break;
  }

  if (this.user) {
    m.set('self', this.user.id)
  } else {
    log.warn('PuppetWeb', 'onServerMessage() without this.user')
  }
  m.ready() // TODO: EventEmitter2 for video/audio/app/sys....
  .then(() => this.emit('message', m))
  .catch(e => {
    log.error('PuppetWeb', 'onServerMessage() message ready exception: %s', e)
    /**
     * FIXME: add retry here...
     * setTimeout(onServerMessage.bind(this, data, ++attempt), 1000)
     */
  })
}

module.exports = PuppetWebEvent
