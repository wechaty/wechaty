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
 *
 * Events for Class PuppetWeb
 *
 * here `this` is a PuppetWeb Instance
 *
 */
import {
    WatchdogFood
  , ScanInfo
}                   from '../config'
import Contact      from '../contact'
import {
    Message
  , MediaMessage
}                   from '../message'
import log          from '../brolog-env'

import Firer        from './firer'
import PuppetWeb    from './puppet-web'

/* tslint:disable:variable-name */
export const PuppetWebEvent = {
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

async function onBrowserDead(this: PuppetWeb, e): Promise<void> {
  log.verbose('PuppetWebEvent', 'onBrowserDead(%s)', e && e.message || e)

  if (!this.browser || !this.bridge) {
    throw new Error('browser or bridge instance not exist in PuppetWeb instance')
  }

  const browser = this.browser
  // because this function is async, so maybe entry more than one times.
  // guard by variable: isBrowserBirthing to prevent the 2nd time entrance.
  // if (this.browser.targetState() !== 'open'
  //     || this.browser.currentState() === 'opening') {
  if ((browser.state.current() === 'open' && browser.state.inprocess())
      || browser.state.target() !== 'open'
  ) {
    log.verbose('PuppetWebEvent', 'onBrowserDead() will do nothing because %s, or %s'
                                , 'browser.state.target() !== open'
                                , 'browser.state.current() === open & inprocess'
              )
    return
  }

  const TIMEOUT = 180000 // 180s / 3m
  // this.watchDog(`onBrowserDead() set a timeout of ${Math.floor(TIMEOUT / 1000)} seconds to prevent unknown state change`, {timeout: TIMEOUT})
  this.emit('watchdog', {
    data: `onBrowserDead() set a timeout of ${Math.floor(TIMEOUT / 1000)} seconds to prevent unknown state change`
    , timeout: TIMEOUT
  })

  this.scan = null

  try {
    await this.browser.quit()
    log.verbose('PuppetWebEvent', 'onBrowserDead() browser.quit() succ')

    if (browser.state.target() !== 'open') {
      log.warn('PuppetWebEvent', 'onBrowserDead() will not init browser because browser.state.target(%s) !== open'
                                , browser.state.target()
              )
      return
    }

    await this.initBrowser()
    log.verbose('PuppetWebEvent', 'onBrowserDead() new browser inited')

    await this.initBridge()
    log.verbose('PuppetWebEvent', 'onBrowserDead() bridge re-inited')

    const dong = await this.ding()
    if (/dong/i.test(dong)) {
      log.verbose('PuppetWebEvent', 'onBrowserDead() ding() works well after reset')
    } else {
      const err = new Error('ding() got "' + dong + '", should be "dong" ')
      log.warn('PuppetWebEvent', 'onBrowserDead() %s', err.message)
      throw err
    }
  } catch (e) {
    log.error('PuppetWebEvent', 'onBrowserDead() exception: %s', e.message)
    try {
      await this.quit()
      await this.init()
    } catch (err) {
      log.warn('PuppetWebEvent', 'onBrowserDead() fail safe for this.quit(): %s', err.message)
    }
  }

  log.verbose('PuppetWebEvent', 'onBrowserDead() new browser borned')

  this.emit('watchdog', {
    data: `onBrowserDead() new browser borned`
    , type: 'POISON'
  })

  return
}

function onServerDing(this: PuppetWeb, data) {
  log.silly('PuppetWebEvent', 'onServerDing(%s)', data)
  // this.watchDog(data)
  this.emit('watchdog', { data })
}

async function onServerScan(this: PuppetWeb, data: ScanInfo) {
  log.verbose('PuppetWebEvent', 'onServerScan(%d)', data && data.code)

  this.scan = data

  /**
   * When wx.qq.com push a new QRCode to Scan, there will be cookie updates(?)
   */
  await this.browser.saveCookie()
                    .catch(() => {/* fail safe */})

  if (this.userId) {
    log.verbose('PuppetWebEvent', 'onServerScan() there has userId when got a scan event. emit logout and set userId to null')
    this.emit('logout', this.user || this.userId)
    this.userId = this.user = null
  }

  // feed watchDog a `scan` type of food
  // this.watchDog(data, {type: 'scan'})
  const food: WatchdogFood = {
      data
    , type: 'SCAN'
  }
  this.emit('watchdog', food)
  this.emit('scan'    , data.url, data.code)
}

function onServerConnection(data) {
  log.verbose('PuppetWebEvent', 'onServerConnection: %s', data)
}

async function onServerDisconnect(this: PuppetWeb, data): Promise<void> {
  log.verbose('PuppetWebEvent', 'onServerDisconnect(%s)', data)

  if (this.userId) {
    log.verbose('PuppetWebEvent', 'onServerDisconnect() there has userId set. emit a logout event and set userId to null')
    this.emit('logout', this.user || this.userId) // 'onServerDisconnect(' + data + ')')
    this.userId = null
    this.user = null
  }

  // if (this.currentState() === 'killing') {
  if (this.state.current() === 'dead' && this.state.inprocess()) {
    log.verbose('PuppetWebEvent', 'onServerDisconnect() be called when state.current() is `dead` and inprocess()')
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

  const live = await this.browser.readyLive()

  if (!live) { // browser is in indeed dead, or almost dead. readyLive() will auto recover itself.
    log.verbose('PuppetWebEvent', 'onServerDisconnect() browser dead after readyLive() check. waiting it recover itself')
    return
  }

  // browser is alive, and we have a bridge to it
  log.verbose('PuppetWebEvent', 'onServerDisconnect() re-initing bridge')
  // must use setTimeout to wait a while.
  // because the browser has just refreshed, need some time to re-init to be ready.
  // if the browser is not ready, bridge init will fail,
  // caused browser dead and have to be restarted. 2016/6/12
  setTimeout(_ => {
    if (!this.bridge) {
      // XXX: sometimes this.bridge gone in this timeout. why?
      // what's happend between the last if(!this.bridge) check and the timeout call?
      const e = new Error('bridge gone after setTimeout? why???')
      log.warn('PuppetWebEvent', 'onServerDisconnect() setTimeout() %s', e.message)
      throw e
    }
    this.bridge.init()
                .then(ret => log.verbose('PuppetWebEvent', 'onServerDisconnect() setTimeout() bridge re-inited: %s', ret))
                .catch(e  => log.error('PuppetWebEvent', 'onServerDisconnect() setTimeout() exception: [%s]', e))
  }, 1000) // 1 second instead of 10 seconds? try. (should be enough to wait)
  return

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
function onServerUnload(this: PuppetWeb, data): void {
  log.warn('PuppetWebEvent', 'onServerUnload(%s)', data)
  // onServerLogout.call(this, data) // XXX: should emit event[logout] from browser

  if (this.state.current() === 'dead' && this.state.inprocess()) {
    log.verbose('PuppetWebEvent', 'onServerUnload() will return because state.current() is `dead` and inprocess()')
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
  setTimeout(() => {
    if (!this.bridge) {
      log.warn('PuppetWebEvent', 'onServerUnload() bridge gone after setTimeout()')
      return
    }
    this.bridge.init()
              .then(r  => log.verbose('PuppetWebEvent', 'onServerUnload() bridge.init() done: %s', r))
              .catch(e => log.error('PuppetWebEvent', 'onServerUnload() bridge.init() exceptoin: %s', e.message))
  }, 1000)

  return
}

function onServerLog(data) {
  log.silly('PuppetWebEvent', 'onServerLog(%s)', data)
}

async function onServerLogin(this: PuppetWeb, data, attempt = 0): Promise<void> {
  log.verbose('PuppetWebEvent', 'onServerLogin(%s, %d)', data, attempt)

  this.scan = null

  if (this.userId) {
    log.verbose('PuppetWebEvent', 'onServerLogin() be called but with userId set?')
  }

  // co.call(this, function* () {
  try {
    // co.call to make `this` context work inside generator.
    // See also: https://github.com/tj/co/issues/274

    /**
     * save login user id to this.userId
     */
    this.userId = await this.bridge.getUserName()

    if (!this.userId) {
      log.verbose('PuppetWebEvent', 'onServerLogin: browser not full loaded(%d), retry later', attempt)
      setTimeout(onServerLogin.bind(this, data, ++attempt), 500)
      return
    }

    log.silly('PuppetWebEvent', 'bridge.getUserName: %s', this.userId)
    this.user = Contact.load(this.userId)
    if (!this.user) {
      throw new Error('no user')
    }
    await this.user.ready()
    log.silly('PuppetWebEvent', `onServerLogin() user ${this.user.name()} logined`)

    await this.browser.saveCookie()
                      .catch(e => { // fail safe
                        log.verbose('PuppetWebEvent', 'onServerLogin() browser.saveSession exception: %s', e.message)
                      })

    this.emit('login', this.user)

  // }).catch(e => {
  } catch (e) {
    log.error('PuppetWebEvent', 'onServerLogin() exception: %s', e)
    console.log(e.stack)
    throw e
  }

  return
}

function onServerLogout(this: PuppetWeb, data) {
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

async function onServerMessage(this: PuppetWeb, data): Promise<void> {
  let m = new Message(data)

  // co.call(this, function* () {
  try {
    await m.ready()

    /**
     * Fire Events if match message type & content
     */
    switch (m.type()) { // data.MsgType

      case Message.TYPE['VERIFYMSG']:
        Firer.checkFriendRequest.call(this, m)
        break

      case Message.TYPE['SYS']:
        if (m.room()) {
          Firer.checkRoomJoin.call(this  , m)
          Firer.checkRoomLeave.call(this , m)
          Firer.checkRoomTopic.call(this , m)
        } else {
          Firer.checkFriendConfirm.call(this, m)
        }
        break
    }

    /**
     * Check Type for special Message
     * reload if needed
     */
    switch (m.type()) {
      case Message.TYPE['IMAGE']:
        // log.verbose('PuppetWebEvent', 'onServerMessage() IMAGE message')
        m = new MediaMessage(data)
        break
    }

    // To Be Deleted: set self...
    if (!this.userId) {
      log.warn('PuppetWebEvent', 'onServerMessage() without this.userId')
    }

    await m.ready() // TODO: EventEmitter2 for video/audio/app/sys....
    this.emit('message', m)

    // .catch(e => {
    //   log.error('PuppetWebEvent', 'onServerMessage() message ready exception: %s', e.stack)
    //   // console.log(e)
    //   /**
    //    * FIXME: add retry here...
    //    * setTimeout(onServerMessage.bind(this, data, ++attempt), 1000)
    //    */
    // })
  } catch (e) {
    log.error('PuppetWebEvent', 'onServerMessage() exception: %s', e.stack)
    throw e
  }

  return
}

export default PuppetWebEvent
