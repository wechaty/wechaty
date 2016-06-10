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
const path          = require('path')
const util          = require('util')
const EventEmitter  = require('events')
const WebDriver     = require('selenium-webdriver')
const retryPromise  = require('retry-promise').default // https://github.com/olalonde/retry-promise

const log = require('./npmlog-env')

class Browser extends EventEmitter{
  constructor(options) {
    super()
    log.verbose('Browser', 'constructor()')
    options   = options       || {}
    if (typeof options.head === 'undefined') {
      this.head = false // default
    } else {
      this.head = options.head
    }

    this.live = false
  }

  toString() { return `Class Browser({head:${this.head})` }

  init() {
    return this.initDriver()
    .then(() => {
      this.live = true
      return this
    })
    // XXX: if no `.catch` here, promise will hang!
    // XXX: https://github.com/SeleniumHQ/selenium/issues/2233
    .catch(e => { throw e })

    // console.log(p)
    // return p.catch()
    // .catch(e => {   // XXX: must has a `.catch` here, or promise will hang! 2016/6/7
    //   log.error('Browser', 'init() rejectec: %s', e)
    //   throw e
    // })
  }

  initDriver() {
    log.verbose('Browser', 'initDriver(head: %s)', this.head)
    if (this.head) {
      if (/firefox/i.test(this.head)) {
        this.driver = new WebDriver.Builder()
        .setAlertBehavior('ignore')
        .forBrowser('firefox')
        .build()
      } else { // default to chrome
        this.driver = new WebDriver.Builder()
        .setAlertBehavior('ignore')
        .forBrowser('chrome')
        .build()
      }
    } else {
      this.driver = this.getPhantomJsDriver()
    }
    // console.log(this.driver)
    return new Promise((resolve, reject) => {
      // XXX: if no `setTimeout()` here, promise will hang!
      // XXX: https://github.com/SeleniumHQ/selenium/issues/2233
      setTimeout(() => { resolve(this.driver) }, 0)
      // resolve(this.driver)
    })
  }

  open(url) {
    url = url || 'https://wx.qq.com'
    log.verbose('Browser', `open()ing at ${url}`)

    return this.driver.get(url)
    .catch(e => {
      this.dead(e.message)
      throw e.message
    })
  }

  getPhantomJsDriver() {
    // https://github.com/SeleniumHQ/selenium/issues/2069
    // setup custom phantomJS capability
    const phantomjsExe = require('phantomjs-prebuilt').path
    // const phantomjsExe = require('phantomjs2').path
    const customPhantom = WebDriver.Capabilities.phantomjs()
    .setAlertBehavior('ignore')
    .set('phantomjs.binary.path', phantomjsExe)
    .set('phantomjs.cli.args', [
      '--ignore-ssl-errors=true' // this help socket.io connect with localhost
      , '--load-images=false'
      , '--remote-debugger-port=9000'
      // , '--webdriver-logfile=/tmp/wd.log'
      // , '--webdriver-loglevel=DEBUG'
    ])

    log.silly('Browser', 'phantomjs binary: ' + phantomjsExe)

    return new WebDriver.Builder()
    .withCapabilities(customPhantom)
    .build()
  }

  // selenium-webdriver/lib/capabilities.js
  //  66   BROWSER_NAME: 'browserName',
  // name() { return this.driver.getCapabilities().get('browserName') }

  quit() {
    log.verbose('Browser', 'quit()')
    this.live = false
    if (!this.driver) {
      log.verbose('Browser', 'driver.quit() skipped because no driver')
      return Promise.resolve('no driver')
    } else if (!this.driver.getSession()) {
      this.driver = null
      log.verbose('Browser', 'driver.quit() skipped because no driver session')
      return Promise.resolve('no driver session')
    }
    log.verbose('Browser', 'driver.quit')
    return this.driver.close() // http://stackoverflow.com/a/32341885/1123955
    .then(() => this.driver.quit())
    .catch(e => {
      // console.log(e)
      // log.warn('Browser', 'err: %s %s %s %s', e.code, e.errno, e.syscall, e.message)
      const crashMsgs = [
        'ECONNREFUSED'
        , 'WebDriverError: .* not reachable'
        , 'NoSuchWindowError: no such window: target window already closed'
      ]
      const crashRegex = new RegExp(crashMsgs.join('|'), 'i')
      if (crashRegex.test(e.message)) { log.warn('Browser', 'driver.quit() browser crashed') }
      else                            { log.warn('Browser', 'driver.quit() rejected: %s', e.message) }
    })
    .then(() => { this.driver = null })
    .then(() => this.clean())
  }

  clean() {
    const max = 15
    const backoff = 100

    // max = (2*totalTime/backoff) ^ (1/2)
    // timeout = 11250 for {max: 15, backoff: 100}
    // timeout = 45000 for {max: 30, backoff: 100}
    const timeout = max * (backoff * max) / 2

    return retryPromise({ max: max, backoff: backoff }, attempt => {
      log.silly('Browser', 'clean() retryPromise: attampt %s time for timeout %s'
        , attempt,  timeout)

      return new Promise((resolve, reject) => {
        require('ps-tree')(process.pid, (err, children) => {
          if (err) {
            return reject(err)
          }
          const num = children.filter(child => /phantomjs/i.test(child.COMMAND)).length
          if (num==0) {
            return resolve('clean')
          } else {
            return reject('dirty')
          }
        })
      })
    })
    .catch(e => {
      log.error('Browser', 'retryPromise failed: %s', e)
      throw e
    })
  }

  /**
   * only wrap addCookies for convinience
   *
   * use this.driver.manage() to call other functions like:
   * deleteCookie / getCookie / getCookies
   */
  addCookies(cookie) {
    if (this.dead()) { return Promise.reject('addCookies() - browser dead')}

    if (cookie.map) {
      return cookie.map(c => {
        return this.addCookies(c)
      })
    }
    // convert expiry from seconds to milliseconds. https://github.com/SeleniumHQ/selenium/issues/2245
    if (cookie.expiry) { cookie.expiry = cookie.expiry * 1000 }

    log.silly('Browser', 'addCookies("%s", "%s", "%s", "%s", "%s", "%s")'
      , cookie.name, cookie.value, cookie.path, cookie.domain, cookie.secure, cookie.expiry
    )

    return this.driver.manage()
    .addCookie(cookie.name, cookie.value, cookie.path
      , cookie.domain, cookie.secure, cookie.expiry)
    .catch(e => {
      log.warn('Browser', 'addCookies() rejected: %s', e.message)
      throw e
    })
  }

  execute(script, ...args) {
    //log.verbose('Browser', `Browser.execute(${script})`)
    // log.verbose('Browser', `Browser.execute() driver.getSession: %s`, util.inspect(this.driver.getSession()))
    if (this.dead()) { return Promise.reject('browser dead') }

    return this.driver.executeScript.apply(this.driver, arguments)
    .catch(e => {
      this.dead(e.message)
      throw e
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
      log.warn('Browser', 'dead() because %s', errMsg)
      // must use nextTick here, or promise will hang... 2016/6/10
      this.live = false
      process.nextTick(() => {
        this.emit('dead', errMsg)
      })
    }
    return dead
  }

  checkSession(session) {
    log.verbose('Browser', `checkSession(${session})`)
    if (this.dead()) { return Promise.reject('checkSession() - browser dead')}

    return this.driver.manage().getCookies()
    .then(cookies => {
      // log.silly('PuppetWeb', 'checkSession %s', require('util').inspect(cookies.map(c => { return {name: c.name/*, value: c.value, expiresType: typeof c.expires, expires: c.expires*/} })))
      log.silly('Browser', 'checkSession %s', cookies.map(c => c.name).join(','))
      return cookies
    })
  }

  cleanSession(session) {
    log.verbose('Browser', `cleanSession(${session})`)
    if (this.dead())  { return Promise.reject('cleanSession() - browser dead')}
    if (!session)     { return Promise.reject('cleanSession() no session') }

    const filename = session
    return new Promise((resolve, reject) => {
      require('fs').unlink(filename, err => {
        if (err && err.code!=='ENOENT') {
          log.silly('Browser', 'cleanSession() unlink session file %s fail: %s', filename, err.message)
        }
        resolve()
      })
    })
  }
  saveSession(session) {
    log.verbose('Browser', `saveSession(${session})`)
    if (this.dead()) { return Promise.reject('saveSession() - browser dead')}

    if (!session) { return Promise.reject('saveSession() no session') }
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
        log.silly('Browser', 'saving %d cookies for session: %s', cookies.length, cookies.map(c => c.name).join(','))

        const jsonStr = JSON.stringify(cookies)
        fs.writeFile(filename, jsonStr, function(err) {
          if(err) {
            log.error('Browser', 'saveSession() fail to write file %s: %s', filename, err.Error)
            return reject(err)
          }
          log.verbose('Browser', 'saved session(%d cookies) to %s', cookies.length, session)
          return resolve(cookies)
        }.bind(this))
      })
    })
  }

  loadSession(session) {
    log.verbose('Browser', `loadSession(${session})`)
    if (this.dead()) { return Promise.reject('loadSession() - browser dead')}

    if (!session) { return Promise.reject('loadSession() no session') }
    const filename = session

    return new Promise((resolve, reject) => {
      fs.readFile(filename, (err, jsonStr) => {
        if (err) {
          if (err) { log.silly('Browser', 'loadSession(%s) skipped because error code: %s', session, err.code) }
          return reject('error code:' + err.code)
        }
        const cookies = JSON.parse(jsonStr)

        const ps = this.addCookies(cookies)
        return Promise.all(ps)
        .then(() => {
          log.verbose('Browser', 'loaded session(%d cookies) from %s', cookies.length, session)
          resolve(cookies)
        })
        .catch(e => {
          log.error('Browser', 'loadSession rejected: %s', e)
          reject(e)
        })
      })
    })
  }
}

module.exports = Browser
