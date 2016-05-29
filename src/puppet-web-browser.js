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
    options   = options       || {}
    this.head = options.head  || false // default to headless
  }

  toString() { return `Class Browser({head:${this.head})` }

  init() {
    log.verbose('Browser', 'init()')
    
    return this.initDriver()
    .then(r => {
      log.verbose('Browser', 'initDriver() done')
      return this.open()
    })
    .then(r => {
      log.verbose('Browser', 'open() done')
      return true
    })
  }

  open() {
    const WX_URL = 'https://wx.qq.com'
    log.verbose('Browser', `open() at ${WX_URL}`)
    
    return this.driver.get(WX_URL)
  }

  initDriver() {
    log.verbose('Browser', 'initDriver()')
    if (this.head) {
      this.driver = new WebDriver.Builder()
      .setAlertBehavior('ignore')
      .forBrowser('chrome')
      .build()
    } else {
      this.driver = this.getPhantomJsDriver()
    }
    return Promise.resolve(this.driver)
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
      log.verbose('Browser', 'driver.quit() skipped because no driver session')
      return Promise.resolve('no driver session')
    }
    log.verbose('Browser', 'driver.quit')
    this.driver.close() // http://stackoverflow.com/a/32341885/1123955
    this.driver.quit()
    this.driver = null
    
    return this.clean()
  }
  
  clean() {
    const max = 5
    const backoff = 100
    
    // max = (2*totalTime/backoff) ^ (1/2)
    const timeout = max * (backoff * max) / 2

    return retryPromise({ max: max, backoff: backoff }, resolveAfterClean.bind(this))
    .catch(e => {
      log.error('Browser', 'waitClean() retryPromise failed: %s', e)
      throw e
    })
    ////////////////////////////////////////////////
    function resolveAfterClean(attempt) {
      log.verbose('Browser', 'clean() retryPromise: attampt %s time for timeout %s'
        , attempt,  timeout)
      return this.numProcess()
      .then(n => {
        if (n > 0) throw new Error('reject because there has driver process not exited')
        log.verbose('Browser', 'waitClean hit')
        return n
      })
    }
  }
  
  numProcess() {
    return new Promise((resolve, reject) => {
      require('ps-tree')(process.pid, (err, children) => {
        if (err) {
          return reject(err)
        }
        const num = children.filter(child => /phantomjs/i.test(child.COMMAND)).length
        return resolve(num)
      })
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
}

module.exports = Browser
