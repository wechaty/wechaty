/**
 *   Chatie - https://github.com/chatie
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
import * as os from 'os'

import {
  WatchdogFood,
  WatchdogFoodName,
  log,
}                   from '../config'

import PuppetWeb    from './puppet-web'
import Event        from './event'

/* tslint:disable:variable-name */
export const Watchdog = {
  onFeed,
}

/**
 * feed me in time(after 1st feed), or I'll restart system
 */
function onFeed(this: PuppetWeb, food: WatchdogFood): void {
  if (!food.type) {
    food.type = 'HEARTBEAT'
  }
  if (!food.timeout) {
    food.timeout = 60000 // 60s default. can be override in options but be careful about the number zero(0)
  }

  if (!this) {
    throw new Error('onFeed() must has `this` of instanceof PuppetWeb')
  }

  log.silly('PuppetWebWatchdog', 'onFeed: %d, %s[%s]', food.timeout, food.type, food.data)

  if (food.type === 'POISON') {
    log.verbose('PuppetWebWatchdog', 'onFeed(type=POSISON) WANG! I dead!')
    clearWatchDogTimer.call(this)
    return
  }

  /**
   * Disable Watchdog on the following conditions:
   * 1. current state is dead and inprocess
   * 1. target state is dead
   *
   * in other words, watchdog should only work in this condition:
   * 1. target state is live
   * 1. and stable is true
   *
   * this is because we will not want to active watchdog when we are closing a browser, or browser is closed.
   */
  if (this.state.target() === 'dead' || this.state.inprocess()) {
    log.warn('PuppetWebWatchdog', 'onFeed(type=%s, data=%s, timeout=%d) is disabled because state target:`%s` inprocess:`%s`',
                                  food.type, food.data, food.timeout,
                                  this.state.target(), this.state.inprocess(),
            )
    return
  }

  const feed = `${food.type}:[${food.data}]`
  setWatchDogTimer.call(this, food.timeout, feed)

  this.emit('heartbeat', feed)

  monitorScan.call(this, food.type)
  autoSaveSession.call(this)
  memoryCheck.call(this)
}

function clearWatchDogTimer(this: PuppetWeb) {
  if (!this.watchDogTimer) {
    log.verbose('PuppetWebWatchdog', 'clearWatchDogTimer() nothing to clear')
    return
  }
  clearTimeout(this.watchDogTimer)
  this.watchDogTimer = null

  if (this.watchDogTimerTime) {
    const timeLeft = this.watchDogTimerTime - Date.now()
    log.silly('PuppetWebWatchdog', 'clearWatchDogTimer() [%d] seconds left', Math.ceil(timeLeft / 1000))
  }
}

function setWatchDogTimer(this: PuppetWeb, timeout: number, feed) {

  clearWatchDogTimer.call(this)

  log.silly('PuppetWebWatchdog', 'setWatchDogTimer(%d, %s)', timeout, feed)
  this.watchDogTimer = setTimeout(_ => watchDogReset.call(this, timeout, feed), timeout)
  this.watchDogTimerTime = Date.now() + timeout
  // this.watchDogTimer.unref()
  // block quit, force to use quit() // this.watchDogTimer.unref() // dont block quit
}

async function watchDogReset(timeout, lastFeed): Promise<void> {
  log.verbose('PuppetWebWatchdog', 'watchDogReset(%d, %s)', timeout, lastFeed)

  const e = new Error('watchDogReset() watchdog reset after '
                        + Math.floor(timeout / 1000)
                        + ' seconds, last feed:'
                        + '[' + lastFeed + ']',
                    )
  log.verbose('PuppetWebWatchdog', e.message)
  this.emit('error', e)
  Event.onBrowserDead.call(this, e)
  return
}

/**
 *
 * Deal with Sessions(cookies)
 * save every 5 mins
 *
 */
async function autoSaveSession(this: PuppetWeb, force = false) {
  log.silly('PuppetWebWatchdog', 'autoSaveSession()')

  if (!this.userId) {
    log.verbose('PuppetWebWatchdog', 'autoSaveSession() skiped as no this.userId')
    return
  }

  if (force) {
    this.watchDogLastSaveSession = 0 // 0 will cause save session right now
  }

  const SAVE_SESSION_INTERVAL = 3 * 60 * 1000 // 3 mins
  if (Date.now() - this.watchDogLastSaveSession > SAVE_SESSION_INTERVAL) {
    log.verbose('PuppetWebWatchdog', 'autoSaveSession() profile(%s) after %d minutes',
                                     this.setting.profile,
                                     Math.floor(SAVE_SESSION_INTERVAL / 1000 / 60),
              )
    await this.browser.saveCookie()
    this.watchDogLastSaveSession = Date.now()
  }
}

function memoryCheck(this: PuppetWeb, minMegabyte: number = 4) {
  const freeMegabyte = Math.floor(os.freemem() / 1024 / 1024)
  log.silly('PuppetWebWatchdog', 'memoryCheck() free: %d MB, require: %d MB'
                                , freeMegabyte, minMegabyte)

  if (freeMegabyte < minMegabyte) {
    const e = new Error(`memory not enough: free ${freeMegabyte} < require ${minMegabyte} MB`)
    log.warn('PuppetWebWatchdog', 'memoryCheck() %s', e.message)
    this.emit('error', e)
  }

}
/**
 *
 * Deal with SCAN events
 *
 * if web browser stay at login qrcode page long time,
 * sometimes the qrcode will not refresh, leave there expired.
 * so we need to refresh the page after a while
 *
 */
function monitorScan(this: PuppetWeb, type: WatchdogFoodName) {
  log.silly('PuppetWebWatchdog', 'monitorScan(%s)', type)

  const scanTimeout = 4 * 60 * 1000 // 4 mins (before is 10 mins)

  if (type === 'SCAN') { // watchDog was feed a 'scan' data
    this.lastScanEventTime = Date.now()
    // autoSaveSession.call(this, true)
  }
  if (this.logined()) { // XXX: login status right?
    this.lastScanEventTime = 0
  } else if (this.lastScanEventTime
              && Date.now() - this.lastScanEventTime > scanTimeout) {
    log.warn('PuppetWebWatchdog', 'monirotScan() refresh browser for no food of type scan after %s mins'
                                , Math.floor(scanTimeout / 1000 / 60))
    // try to fix the problem
    this.browser.refresh()
    this.lastScanEventTime = Date.now()
  }
}

export default Watchdog
