/**
 *
 * wechaty: Wechat for Bot. and for human who talk to bot/robot
 *
 * Class PuppetWeb Watchdog
 *
 * monitor puppet
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
const co    = require('co')

const log   = require('../npmlog-env')
const Event = require('./puppet-web-event')

const Watchdog = {
  onFeed
}

// feed me in time(after 1st feed), or I'll restart system
function onFeed({
  data
  , type = 'GARBAGE'
  , timeout = 60000  // 60s default. can be override in options but be careful about the number zero(0)
} = {}) {

  log.verbose('PuppetWebWatchdog', 'onFeed: %s, %d, [%s]', type, timeout, data)

  switch (type) {
    case 'POISON':
      clearWatchDogTimer.call(this)
      return

    case 'GARBAGE':
    case 'SCAN':
      break

    default:
      throw new Error('Watchdog onFeed: unsupport type ' + type)
  }

  setWatchDogTimer.call(this, timeout)

  this.emit('heartbeat', data + '@' + type)

  monitorScan.call(this, type)
  autoSaveSession.call(this)
}

function clearWatchDogTimer() {
  if (this.watchDogTimer) {
    clearTimeout(this.watchDogTimer)
    this.watchDogTimer = null
    log.warn('PuppetWebWatchdog', 'clearWatchDogTimer() cleared')
  } else {
    log.silly('PuppetWebWatchdog', 'clearWatchDogTimer() nothing to clear')
  }
}

function setWatchDogTimer(timeout) {

  clearWatchDogTimer.call(this)

  log.warn('PuppetWebWatchdog', 'setWatchDogTimer(%d)', timeout)

  this.watchDogTimer = setTimeout(watchDogReset.bind(this, timeout), timeout)
  // block quit, force to use quit() // this.watchDogTimer.unref() // dont block quit
}

function watchDogReset(timeout) {
  log.verbose('PuppetWebWatchdog', 'watchDogReset() timeout %d', timeout)
  const e = new Error('watchdog reset after ' + Math.floor(timeout/1000) + ' seconds')
  this.emit('error', e)
  return Event.onBrowserDead.call(this, e)
}

/**
 *
 * Deal with Sessions(cookies)
 * save every 5 mins
 *
 */
function autoSaveSession() {
  const SAVE_SESSION_INTERVAL = 5 * 60 * 1000 // 5 mins
  if (Date.now() - this.watchDogLastSaveSession > SAVE_SESSION_INTERVAL) {
    log.verbose('PuppetWebWatchdog', 'watchDog() saveSession(%s) after %d minutes', this.profile, Math.floor(SAVE_SESSION_INTERVAL/1000/60))
    this.browser.saveSession()
    this.watchDogLastSaveSession = Date.now()
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
function monitorScan(type) {
  log.verbose('PuppetWebWatchdog', 'monitorScan(%s)', type)

  const scanTimeout = 10 * 60 * 1000 // 10 mins

  if (type === 'SCAN') { // watchDog was feed a 'scan' data
    this.lastScanEventTime = Date.now()
  }
  if (this.logined()) { // XXX: login status right?
    this.lastScanEventTime = null
  } else if (this.lastScanEventTime
              && Date.now() - this.lastScanEventTime > scanTimeout) {
    log.warn('PuppetWebWatchdog', 'monirotScan() refresh browser for no food of type scan after %s mins', Math.floor(scanTimeout/1000/60))
    // try to fix the problem
    this.browser.refresh()
    this.lastScanEventTime = Date.now()
  }
}

module.exports = Watchdog