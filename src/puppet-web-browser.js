/**
 * Wechat for Bot. and for human who can talk with bot/robot
 *
 * Interface for puppet
 *
 * Licenst: ISC
 * https://github.com/zixia/wechaty
 *
 */

const fs            = require('fs')
const co            = require('co')
const path          = require('path')
const util          = require('util')
const EventEmitter  = require('events')
const WebDriver     = require('selenium-webdriver')
const retryPromise  = require('retry-promise').default // https://github.com/olalonde/retry-promise

const log = require('./npmlog-env')

class Browser extends EventEmitter {
  constructor(options) {
    super()
    log.verbose('PuppetWebBrowser', 'constructor()')
    options   = options       || {}
    if (typeof options.head === 'undefined') {
      this.head = false // default
    } else {
      this.head = options.head
    }

    this.live = false
  }

  toString() { return `Browser({head:${this.head})` }

  init() {
    return this.initDriver()
    .then(() => {
      this.live = true
      return this
    })
    .catch(e => {
      // XXX: must has a `.catch` here, or promise will hang! 2016/6/7
      // XXX: if no `.catch` here, promise will hang!
      // with selenium-webdriver v2.53.2
      // XXX: https://github.com/SeleniumHQ/selenium/issues/2233
      log.error('PuppetWebBrowser', 'init() exception: %s', e.message)
      throw e
    })
  }

  initDriver() {
    log.verbose('PuppetWebBrowser', 'initDriver(head: %s)', this.head)
    return new Promise((resolve, reject) => {
      if (this.head) {
        if (/firefox/i.test(this.head)) {
          this.driver = new WebDriver.Builder()
          .setAlertBehavior('ignore')
          .forBrowser('firefox')
          .build()
        } else if (/chrome/i.test(this.head)) {
          this.driver = new WebDriver.Builder()
          .setAlertBehavior('ignore')
          .forBrowser('chrome')
          .build()
        } else {  // unsupported browser head
          throw new Error('unsupported head: ' + this.head)
        }
      } else { // no head default to phantomjs
        this.driver = this.getPhantomJsDriver()
      }

      // XXX: if no `setTimeout()` here, promise will hang!
      // with selenium-webdriver v2.53.2
      // XXX: https://github.com/SeleniumHQ/selenium/issues/2233
      setTimeout(() => { resolve(this.driver) }, 0)
      // resolve(this.driver)
    })
  }

  open(url) {
    url = url || 'https://wx.qq.com'
    log.verbose('PuppetWebBrowser', `open(${url})`)

    return this.driver.get(url)
    .catch(e => {
      log.error('PuppetWebBrowser', 'open() exception: %s', e.message)
      this.dead(e.message)
      throw e
    })
  }

  refresh() {
    log.verbose('PuppetWebBrowser', 'refresh()')
    return this.driver.navigate().refresh()
  }

  getPhantomJsDriver() {
    // setup custom phantomJS capability https://github.com/SeleniumHQ/selenium/issues/2069
    const phantomjsExe = require('phantomjs-prebuilt').path
    // const phantomjsExe = require('phantomjs2').path

    const phantomjsArgs = [
      '--ignore-ssl-errors=true' // this help socket.io connect with localhost
      , '--load-images=false'
      // , '--webdriver-logfile=/tmp/wd.log'
      // , '--webdriver-loglevel=DEBUG'
    ]
    if (/silly|verbose/i.test(process.env.WECHATY_DEBUG)) {
          phantomjsArgs.push('--remote-debugger-port=8080') // XXX: be careful when in production usage.
    }

    const customPhantom = WebDriver.Capabilities.phantomjs()
    .setAlertBehavior('ignore')
    .set('phantomjs.binary.path', phantomjsExe)
    .set('phantomjs.cli.args', phantomjsArgs)

    log.silly('PuppetWebBrowser', 'phantomjs binary: ' + phantomjsExe)
    log.silly('PuppetWebBrowser', 'phantomjs args: ' + phantomjsArgs.join(' '))

    return new WebDriver.Builder()
    .withCapabilities(customPhantom)
    .build()
  }

  quit() {
    log.verbose('PuppetWebBrowser', 'quit()')
    this.live = false
    if (!this.driver) {
      log.verbose('PuppetWebBrowser', 'driver.quit() skipped because no driver')
      return Promise.resolve('no driver')
    } else if (!this.driver.getSession()) {
      this.driver = null
      log.verbose('PuppetWebBrowser', 'driver.quit() skipped because no driver session')
      return Promise.resolve('no driver session')
    }
    return this.driver.close() // http://stackoverflow.com/a/32341885/1123955
    .then(() => this.driver.quit())
    .catch(e => {
      // console.log(e)
      // log.warn('PuppetWebBrowser', 'err: %s %s %s %s', e.code, e.errno, e.syscall, e.message)
      const crashMsgs = [
        'ECONNREFUSED'
        , 'WebDriverError: .* not reachable'
        , 'NoSuchWindowError: no such window: target window already closed'
      ]
      const crashRegex = new RegExp(crashMsgs.join('|'), 'i')

      if (crashRegex.test(e.message)) { log.warn('PuppetWebBrowser', 'driver.quit() browser crashed') }
      else                            { log.warn('PuppetWebBrowser', 'driver.quit() exception: %s', e.message) }
    })
    .then(() => { this.driver = null })
    .then(() => this.clean())
    .catch(e => {
      log.error('PuppetWebBrowser', 'quit() exception: %s', e.message)
      throw e
    })
  }

  clean() {
    const max = 15
    const backoff = 100

    /**
     * max = (2*totalTime/backoff) ^ (1/2)
     * timeout = 11250 for {max: 15, backoff: 100}
     * timeout = 45000 for {max: 30, backoff: 100}
     */
    const timeout = max * (backoff * max) / 2

    return retryPromise({ max: max, backoff: backoff }, attempt => {
      log.silly('PuppetWebBrowser', 'clean() retryPromise: attampt %s time for timeout %s'
        , attempt,  timeout)

      return new Promise((resolve, reject) => {
        this.getBrowserPids()
        .then(pids => {
          if (pids.length === 0) {
            resolve('clean() no browser process, confirm clean')
          } else {
            reject(new Error('clean() found browser process, not clean, dirty'))
          }
        })
        .catch(e => reject(e))
      })
    })
    .catch(e => {
      log.error('PuppetWebBrowser', 'retryPromise failed: %s', e.message)
      throw e
    })
  }

  getBrowserPids() {
    return new Promise((resolve, reject) => {
      require('ps-tree')(process.pid, (err, children) => {
        if (err) {
          reject(err)
          return
        }
        let browserRe
        switch (this.head) {
          case true:
          case 'chrome':
            browserRe = 'chrome(?!driver)'
            break
          case false:
          case 'phantomjs':
            browserRe = 'phantomjs'
            break

          default:
            log.warn('PuppetWebBrowser', 'getBrowserPids() for unsupported head: %s', this.head)
            browserRe = this.head
        }
        let matchRegex = new RegExp(browserRe, 'i')
        const pids = children.filter(child => matchRegex.test(child.COMMAND))
        .map(child => child.PID)
        resolve(pids)
        return
      })
    })
  }

  /**
   * only wrap addCookies for convinience
   *
   * use this.driver.manage() to call other functions like:
   * deleteCookie / getCookie / getCookies
   */
  addCookies(cookie) {
    if (this.dead()) { return Promise.reject(new Error('addCookies() - browser dead'))}

    if (cookie.map) {
      return cookie.map(c => {
        return this.addCookies(c)
      })
    }
    /**
     * convert expiry from seconds to milliseconds. https://github.com/SeleniumHQ/selenium/issues/2245
     * with selenium-webdriver v2.53.2
     * NOTICE: the lastest branch of selenium-webdriver for js has changed the interface of addCookie:
     * https://github.com/SeleniumHQ/selenium/commit/02f407976ca1d516826990f11aca7de3c16ba576
     */
    if (cookie.expiry) { cookie.expiry = cookie.expiry * 1000 /* XXX: be aware of new version of webdriver */}

    log.silly('PuppetWebBrowser', 'addCookies("%s", "%s", "%s", "%s", "%s", "%s")'
      , cookie.name, cookie.value, cookie.path, cookie.domain, cookie.secure, cookie.expiry
    )

    return this.driver.manage()
    .addCookie(cookie.name, cookie.value, cookie.path
      , cookie.domain, cookie.secure, cookie.expiry)
    .catch(e => {
      log.warn('PuppetWebBrowser', 'addCookies() exception: %s', e.message)
      throw e
    })
  }

  execute(script, ...args) {
    //log.verbose('PuppetWebBrowser', `Browser.execute(${script})`)
    // log.verbose('PuppetWebBrowser', `Browser.execute() driver.getSession: %s`, util.inspect(this.driver.getSession()))
    if (this.dead()) { return Promise.reject(new Error('browser dead')) }

    return this.driver.executeScript.apply(this.driver, arguments)
    .catch(e => {
      // this.dead(e)
      log.warn('PuppetWebBrowser', 'execute() exception: %s', e.message)
      throw e
    })
  }

  readyLive() {
    log.verbose('PuppetWebBrowser', 'readyLive()')
    if (this.dead()) {
      return Promise.reject(new Error('this.dead() true'))
    }
    return new Promise((resolve, reject) => {
      this.execute('return 1+1')
      .then(r => {
        if (r === 2) {
          resolve(true) // browser ok, living
          return
        }
        const errMsg = 'deadEx() found dead browser coz 1+1 = ' + r + ' (not 2)'
        log.verbose('PuppetWebBrowser', errMsg)
        this.dead(errMsg)
        reject(new Error(errMsg)) // browser not ok, dead
        return
      })
      .catch(e => {
        const errMsg = 'deadEx() found dead browser coz 1+1 = ' + e.message
        log.verbose('PuppetWebBrowser', errMsg)
        this.dead(errMsg)
        reject(new Error(errMsg)) // browser not live
        return
      })
    })
  }
  dead(forceReason) {
    let errMsg
    let dead = false

    if (forceReason) {
      dead = true
      errMsg = forceReason
    } else if (!this.live) {
      dead = true
      errMsg = 'browser not live'
    } else if (!this.driver || !this.driver.getSession()) {
      dead = true
      errMsg = 'no driver or session'
    }

    if (dead) {
      log.warn('PuppetWebBrowser', 'dead() because %s', errMsg)
      this.live = false
      // must use nextTick here, or promise will hang... 2016/6/10
      process.nextTick(() => {
        log.verbose('PuppetWebBrowser', 'dead() emit a `dead` event')
        this.emit('dead', errMsg)
      })
    }
    return dead
  }

  checkSession(session) {
    log.verbose('PuppetWebBrowser', `checkSession(${session})`)
    if (this.dead()) { return Promise.reject(new Error('checkSession() - browser dead'))}

    return this.driver.manage().getCookies()
    .then(cookies => {
      // log.silly('PuppetWeb', 'checkSession %s', require('util').inspect(cookies.map(c => { return {name: c.name/*, value: c.value, expiresType: typeof c.expires, expires: c.expires*/} })))
      log.silly('PuppetWebBrowser', 'checkSession %s', cookies.map(c => c.name).join(','))
      return cookies
    })
    .catch(e => {
      log.error('PuppetWebBrowser', 'checkSession() getCookies() exception: %s', e.message)
      throw e
    })
  }

  cleanSession(session) {
    log.verbose('PuppetWebBrowser', `cleanSession(${session})`)
    if (this.dead())  { return Promise.reject(new Error('cleanSession() - browser dead'))}
    if (!session)     { return Promise.reject(new Error('cleanSession() no session')) }

    const filename = session
    return new Promise((resolve, reject) => {
      require('fs').unlink(filename, err => {
        if (err && err.code!=='ENOENT') {
          log.silly('PuppetWebBrowser', 'cleanSession() unlink session file %s fail: %s', filename, err.message)
        }
        resolve()
      })
    })
  }
  saveSession(session) {
    log.silly('PuppetWebBrowser', `saveSession(${session})`)
    if (this.dead()) { return Promise.reject(new Error('saveSession() - browser dead'))}

    if (!session) { return Promise.reject(new Error('saveSession() no session')) }
    const filename = session

    return new Promise((resolve, reject) => {
      this.driver.manage().getCookies()
      .then(allCookies => {
        const skipNames = [
          'ChromeDriver'
          , 'MM_WX_SOUND_STATE'
          , 'MM_WX_NOTIFY_STATE'
        ]
        const skipNamesRegex = new RegExp(skipNames.join('|'), 'i')
        const cookies = allCookies.filter(c => {
          if (skipNamesRegex.test(c.name)) { return false }
          // else if (!/wx\.qq\.com/i.test(c.domain))  { return false }
          else                             { return true }
        })
        // log.silly('PuppetWeb', 'saving %d cookies for session: %s', cookies.length
        //   , util.inspect(cookies.map(c => { return {name: c.name /*, value: c.value, expiresType: typeof c.expires, expires: c.expires*/} })))
        log.silly('PuppetWebBrowser', 'saving %d cookies for session: %s', cookies.length, cookies.map(c => c.name).join(','))

        const jsonStr = JSON.stringify(cookies)
        fs.writeFile(filename, jsonStr, function(err) {
          if(err) {
            log.error('PuppetWebBrowser', 'saveSession() fail to write file %s: %s', filename, err.Error)
            return reject(err)
          }
          log.silly('PuppetWebBrowser', 'saved session(%d cookies) to %s', cookies.length, session)
          return resolve(cookies)
        })
      })
      .catch(e => {
        log.error('PuppetWebBrowser', 'saveSession() getCookies() exception: %s', e.message)
        reject(e)
      })
    })
  }

  loadSession(session) {
    log.verbose('PuppetWebBrowser', `loadSession(${session})`)
    if (this.dead()) { return Promise.reject(new Error('loadSession() - browser dead'))}

    if (!session) { return Promise.reject(new Error('loadSession() no session')) }
    const filename = session

    return new Promise((resolve, reject) => {
      fs.readFile(filename, (err, jsonStr) => {
        if (err) {
          if (err) { log.silly('PuppetWebBrowser', 'loadSession(%s) skipped because error code: %s', session, err.code) }
          return reject(new Error('error code:' + err.code))
        }
        const cookies = JSON.parse(jsonStr)

        const ps = this.addCookies(cookies)
        Promise.all(ps)
        .then(() => {
          log.verbose('PuppetWebBrowser', 'loaded session(%d cookies) from %s', cookies.length, session)
          resolve(cookies)
        })
        .catch(e => {
          log.error('PuppetWebBrowser', 'loadSession() addCookies() exception: %s', e.message)
          reject(e)
        })
      })
    })
  }
}

module.exports = Browser
