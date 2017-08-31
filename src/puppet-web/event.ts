/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   Copyright 2016-2017 Huan LI <zixia@zixia.net>
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */
import {
  WatchdogFood,
  ScanInfo,
  log,
}                 from '../config'
import Contact    from '../contact'
import {
  Message,
  MediaMessage,
  MsgType,
  MsgRawObj,
}                 from '../message'

import Firer      from './firer'
import PuppetWeb  from './puppet-web'

/* tslint:disable:variable-name */
export const Event = {
  onBrowserDead,

  onServerLogin,
  onServerLogout,

  onServerConnection,
  onServerDisconnect,

  onServerDing,
  onServerScan,
  onServerLog,

  onServerMessage,
}

async function onBrowserDead(this: PuppetWeb, e: Error): Promise<void> {
  log.verbose('PuppetWebEvent', 'onBrowserDead(%s)', e && e.message || e)

  if (!this.browser || !this.bridge) {
    throw new Error('onBrowserDead() browser or bridge instance not exist in PuppetWeb instance')
  }

  log.verbose('PuppetWebEvent', 'onBrowserDead() Browser:state target(%s) current(%s) stable(%s)',
                                this.browser.state.target(),
                                this.browser.state.current(),
                                this.browser.state.stable(),
  )

  if (this.browser.state.target() === 'close' || this.browser.state.inprocess()) {
    log.verbose('PuppetWebEvent', 'onBrowserDead() will do nothing because %s, or %s',
                                  'browser.state.target() === close',
                                  'browser.state.inprocess()',
              )
    return
  }

  const TIMEOUT = 3 * 60 * 1000 // 3 minutes
  // this.watchDog(`onBrowserDead() set a timeout of ${Math.floor(TIMEOUT / 1000)} seconds to prevent unknown state change`, {timeout: TIMEOUT})
  this.emit('watchdog', {
    data: `onBrowserDead() set a timeout of ${Math.floor(TIMEOUT / 1000)} seconds to prevent unknown state change`,
    timeout: TIMEOUT,
  })

  this.scan = null

  try {
    await this.browser.quit()
                      .catch(err => { // fail safe
                        log.verbose('PuppetWebEvent', 'onBrowserDead() onBrowserDead.quit() soft exception: %s', err.message)
                      })
    log.verbose('PuppetWebEvent', 'onBrowserDead() browser.quit() done')

    /**
     * browser.quit() will set target() to `close`
     */
    // if (this.browser.state.target() === 'close') {
    //   log.warn('PuppetWebEvent', 'onBrowserDead() will not init browser because browser.state.target(%s)'
    //                             , this.browser.state.target()
    //           )
    //   return
    // }

    await this.initBrowser()
    log.verbose('PuppetWebEvent', 'onBrowserDead() new browser inited')

    await this.initBridge()
    log.verbose('PuppetWebEvent', 'onBrowserDead() bridge re-inited')

    const dong = await this.ding()
    if (!/dong/i.test(dong)) {
      const err = new Error('ding() got "' + dong + '", should be "dong" ')
      log.warn('PuppetWebEvent', 'onBrowserDead() %s', err.message)
      throw err
    }
    log.verbose('PuppetWebEvent', 'onBrowserDead() ding() works well after reset')

  } catch (err) {
    log.error('PuppetWebEvent', 'onBrowserDead() exception: %s', err.message)
    try {
      await this.quit()
      await this.init()
    } catch (error) {
      log.warn('PuppetWebEvent', 'onBrowserDead() fail safe for this.quit(): %s', error.message)
    }
  }

  log.verbose('PuppetWebEvent', 'onBrowserDead() new browser borned')

  // why POISON here... forgot, faint. comment it out to treat dog nicer... 20161128
  // this.emit('watchdog', {
  //   data: `onBrowserDead() new browser borned`
  //   , type: 'POISON'
  // })

  return
}

function onServerDing(this: PuppetWeb, data): void {
  log.silly('PuppetWebEvent', 'onServerDing(%s)', data)
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

  if (this.user) {
    log.verbose('PuppetWebEvent', 'onServerScan() there has user when got a scan event. emit logout and set it to null')
    this.emit('logout', this.user)
    this.user = this.userId = null
  }

  // feed watchDog a `scan` type of food
  const food: WatchdogFood = {
    data,
    type: 'SCAN',
  }
  this.emit('watchdog', food)
  this.emit('scan'    , data.url, data.code)
}

function onServerConnection(data) {
  log.verbose('PuppetWebEvent', 'onServerConnection: %s', typeof data)
}

/**
 * `disconnect` event
 * after received `disconnect`, we should fix bridge by re-inject the Wechaty js code into browser.
 * possible conditions:
 * 1. browser refresh
 * 2. browser navigated to a new url
 * 3. browser quit(crash?)
 * 4. ...
 */
async function onServerDisconnect(this: PuppetWeb, data): Promise<void> {
  log.verbose('PuppetWebEvent', 'onServerDisconnect(%s)', data)

  if (this.user) {
    log.verbose('PuppetWebEvent', 'onServerDisconnect() there has user set. emit a logout event and set it to null')
    this.emit('logout', this.user)
    this.user = this.userId = null
  }

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
                .then(() => log.verbose('PuppetWebEvent', 'onServerDisconnect() setTimeout() bridge.init() done.'))
                .catch(e => log.error('PuppetWebEvent', 'onServerDisconnect() setTimeout() bridge.init() exception: [%s]', e))
  }, 1000) // 1 second instead of 10 seconds? try. (should be enough to wait)
  return

}

function onServerLog(data) {
  log.verbose('PuppetWebEvent', 'onServerLog(%s)', data)
}

async function onServerLogin(this: PuppetWeb, data, attempt = 0): Promise<void> {
  log.verbose('PuppetWebEvent', 'onServerLogin(%s, %d)', data, attempt)

  // issue #772
  // if `login` event fired before this.bridge inited, we delay the event for 1 second.
  if (!this.bridge) {
    log.verbose('PuppetWebEvent', 'onServerLogin() fired before bridge inited. delay for 1 second.')
    setTimeout(() => {
      onServerLogin.apply(this, arguments)
    }, 1000)
    return
  }

  this.scan = null

  if (this.userId) {
    log.verbose('PuppetWebEvent', 'onServerLogin() be called but with userId set?')
  }
  try {
    /**
     * save login user id to this.userId
     *
     * issue #772: this.bridge might not inited if the 'login' event fired too fast(because of auto login)
     */
    this.userId = await this.bridge.getUserName()

    if (!this.userId) {
      log.verbose('PuppetWebEvent', 'onServerLogin: browser not fully loaded(%d), retry later', attempt)
      setTimeout(onServerLogin.bind(this, data, ++attempt), 500)
      return
    }

    log.silly('PuppetWebEvent', 'bridge.getUserName: %s', this.userId)
    this.user = Contact.load(this.userId)
    await this.user.ready()
    log.silly('PuppetWebEvent', `onServerLogin() user ${this.user.name()} logined`)

    try {
      await this.browser.saveCookie()
    } catch (e) { // fail safe
      log.verbose('PuppetWebEvent', 'onServerLogin() browser.saveSession() exception: %s', e.message)
    }

    // fix issue #668
    try {
      await this.readyStable()
    } catch (e) { // fail safe
      log.warn('PuppetWebEvent', 'readyStable() exception: %s', e && e.message || e)
    }

    this.emit('login', this.user)

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
}

async function onServerMessage(this: PuppetWeb, obj: MsgRawObj): Promise<void> {
  let m = new Message(obj)

  try {
    await m.ready()

    /**
     * Fire Events if match message type & content
     */
    switch (m.type()) {

      case MsgType.VERIFYMSG:
        Firer.checkFriendRequest.call(this, m)
        break

      case MsgType.SYS:
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
      case MsgType.EMOTICON:
      case MsgType.IMAGE:
      case MsgType.VIDEO:
      case MsgType.VOICE:
      case MsgType.MICROVIDEO:
      case MsgType.APP:
        log.verbose('PuppetWebEvent', 'onServerMessage() EMOTICON/IMAGE/VIDEO/VOICE/MICROVIDEO message')
        m = new MediaMessage(obj)
        break

      case MsgType.TEXT:
        if (m.typeSub() === MsgType.LOCATION) {
          log.verbose('PuppetWebEvent', 'onServerMessage() (TEXT&LOCATION) message')
          m = new MediaMessage(obj)
        }
        break
    }

    await m.ready() // TODO: EventEmitter2 for video/audio/app/sys....
    this.emit('message', m)

  } catch (e) {
    log.error('PuppetWebEvent', 'onServerMessage() exception: %s', e.stack)
    throw e
  }

  return
}

export default Event
