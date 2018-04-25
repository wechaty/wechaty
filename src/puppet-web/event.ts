/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   @copyright 2016-2018 Huan LI <zixia@zixia.net>
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
}                 from 'watchdog'

import {
  log,
}                 from '../config'
import {
  ScanData,
}                 from '../abstract-puppet/'

import WebContact from './web-contact'
import WebMessage from './web-message'

import Firer      from './firer'
import PuppetWeb  from './puppet-web'
import {
  MsgType,
  MsgRawObj,
}                 from './schema'

/* tslint:disable:variable-name */
export const Event = {
  onDing,

  onLog,
  onLogin,
  onLogout,

  onMessage,
  onScan,
  onUnload,

}

function onDing(this: PuppetWeb, data): void {
  log.silly('PuppetWebEvent', 'onDing(%s)', data)
  this.emit('watchdog', { data })
}

async function onScan(this: PuppetWeb, data: ScanData): Promise<void> {
  log.verbose('PuppetWebEvent', 'onScan({code: %d, url: %s})', data.code, data.url)

  if (this.state.off()) {
    log.verbose('PuppetWebEvent', 'onScan(%s) state.off()=%s, NOOP',
                                  data, this.state.off())
    return
  }

  this.scanInfo = data

  /**
   * When wx.qq.com push a new QRCode to Scan, there will be cookie updates(?)
   */
  await this.saveCookie()

  if (this.user) {
    log.verbose('PuppetWebEvent', 'onScan() there has user when got a scan event. emit logout and set it to null')

    const currentUser = this.user
    this.user = undefined
    this.emit('logout', currentUser)
  }

  // feed watchDog a `scan` type of food
  const food: WatchdogFood = {
    data,
    type: 'scan',
  }
  this.emit('watchdog', food)
  this.emit('scan'    , data.url, data.code)
}

function onLog(data: any): void {
  log.silly('PuppetWebEvent', 'onLog(%s)', data)
}

async function onLogin(this: PuppetWeb, note: string, ttl = 30): Promise<void> {
  log.verbose('PuppetWebEvent', 'onLogin(%s, %d)', note, ttl)

  const TTL_WAIT_MILLISECONDS = 1 * 1000
  if (ttl <= 0) {
    log.verbose('PuppetWebEvent', 'onLogin(%s) TTL expired')
    this.emit('error', new Error('TTL expired.'))
    return
  }

  if (this.state.off()) {
    log.verbose('PuppetWebEvent', 'onLogin(%s, %d) state.off()=%s, NOOP',
                                  note, ttl, this.state.off())
    return
  }

  this.scanInfo = null

  if (this.user) {
    log.warn('PuppetWebEvent', 'onLogin(%s) user had already set: "%s"', note, this.user)
  }

  try {
    /**
     * save login user id to this.userId
     *
     * issue #772: this.bridge might not inited if the 'login' event fired too fast(because of auto login)
     */
    const userId = await this.bridge.getUserName()

    if (!userId) {
      log.verbose('PuppetWebEvent', 'onLogin() browser not fully loaded(ttl=%d), retry later', ttl)
      const html = await this.bridge.innerHTML()
      log.silly('PuppetWebEvent', 'onLogin() innerHTML: %s', html.substr(0, 500))
      setTimeout(onLogin.bind(this, note, ttl - 1), TTL_WAIT_MILLISECONDS)
      return
    }

    log.silly('PuppetWebEvent', 'bridge.getUserName: %s', userId)
    this.user = WebContact.load(userId)
    this.user.puppet = this

    await this.user.ready()
    log.silly('PuppetWebEvent', `onLogin() user ${this.user.name()} logined`)

    try {
      if (this.state.on() === true) {
        await this.saveCookie()
      }
    } catch (e) { // fail safe
      log.verbose('PuppetWebEvent', 'onLogin() this.saveCookie() exception: %s', e.message)
    }

    // fix issue #668
    try {
      await this.readyStable()
    } catch (e) { // fail safe
      log.warn('PuppetWebEvent', 'readyStable() exception: %s', e && e.message || e)
    }

    this.emit('login', this.user)

  } catch (e) {
    log.error('PuppetWebEvent', 'onLogin() exception: %s', e)
    throw e
  }

  return
}

function onLogout(this: PuppetWeb, data) {
  log.verbose('PuppetWebEvent', 'onLogout(%s)', data)

  const currentUser = this.user
  this.user = undefined

  if (currentUser) {
    this.emit('logout', currentUser)
  } else {
    log.error('PuppetWebEvent', 'onLogout() without this.user initialized')
  }
}

async function onMessage(
  this: PuppetWeb,
  obj:  MsgRawObj,
): Promise<void> {
  let m = new WebMessage(obj)
  m.puppet = this

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
          const joinResult  = await Firer.checkRoomJoin.call(this  , m)
          const leaveResult = await Firer.checkRoomLeave.call(this , m)
          const topicRestul = await Firer.checkRoomTopic.call(this , m)

          if (!joinResult && !leaveResult && !topicRestul) {
            log.warn('PuppetWebEvent', `checkRoomSystem message: <${m.content()}> not found`)
          }
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
        log.verbose('PuppetWebEvent', 'onMessage() EMOTICON/IMAGE/VIDEO/VOICE/MICROVIDEO message')
        m = new WebMessage(obj)
        m.puppet = this
        break

      case MsgType.TEXT:
        if (m.typeSub() === MsgType.LOCATION) {
          log.verbose('PuppetWebEvent', 'onMessage() (TEXT&LOCATION) message')
          m = new WebMessage(obj)
        }
        break
    }

    await m.ready()
    this.emit('message', m)

  } catch (e) {
    log.error('PuppetWebEvent', 'onMessage() exception: %s', e.stack)
    throw e
  }
}

async function onUnload(this: PuppetWeb): Promise<void> {
  log.silly('PuppetWebEvent', 'onUnload()')
  /*
  try {
    await this.quit()
    await this.init()
  } catch (e) {
    log.error('PuppetWebEvent', 'onUnload() exception: %s', e)
    this.emit('error', e)
    throw e
  }
  */
}

export default Event
