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
const WebDriver     = require('selenium-webdriver')
const log           = require('npmlog')
const retryPromise  = require('retry-promise').default // https://github.com/olalonde/retry-promise

class Browser {
  constructor(options) {
    log.verbose('Browser', 'constructor()')
    options   = options       || {}
    if (typeof options.head === 'undefined') {
      this.head = false // default
    } else {
      this.head = options.head
    }
  }

  toString() { return `Class Browser({head:${this.head})` }

  init() {
    return this.initDriver()
    .then(() => this)
    // XXX: if no `.catch` here, promise will hang!
    // XXX: https://github.com/SeleniumHQ/selenium/issues/2233
    .catch(e => throw e)

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

  open() {
    const WX_URL = 'https://wx.qq.com'
    log.verbose('Browser', `open()ing at ${WX_URL}`)

    return this.driver.get(WX_URL)
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
    .then(r => this.driver.quit())
    .then(r => this.driver = null)
    .then(r => this.clean())
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

  execute(script, ...args) {
    //log.verbose('Browser', `Browser.execute(${script})`)
    if (!this.driver) {
      // throw new Error('driver not found')
      const errMsg = 'execute() called without driver'
      log.verbose('Browser', errMsg)
      return Promise.reject(errMsg)
    }
    // return promise
    try {
      return this.driver.executeScript.apply(this.driver, arguments)
    } catch (e) {
      log.error('Browser', e)
      return Promise.reject(e)
    }
  }

  getCookies() {
    log.silly('Browser', 'getCookies()')
// console.trace("#################")

    if (!this.driver || !this.driver.getSession()) {
      return Promise.reject('no driver or no session')
    }

    return this.driver.manage().getCookies()
    .then(cookies => {
      log.silly('Browser', 'getCookies() got %s cookies', cookies.length)
      return cookies
    })
    .catch(e => {
      log.error('Browser', 'getCookies %s', e)
      throw e
    })
  }

  setCookies(cookies) { return this.setCookie(cookies) }
  setCookie(cookie) {
    if (cookie.map) {
      return cookie.map(c => {
        return this.setCookie(c)
      })
    }
    return this.driver.manage().addCookie(cookie.name, cookie.value, cookie.path, cookie.domain, cookie.secure, cookie.expiry)
  }
}

module.exports = Browser
