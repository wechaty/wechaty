/**
 * Wechat for Bot. and for human who can talk with bot/robot
 *
 * Interface for puppet
 *
 * Licenst: ISC
 * https://github.com/zixia/wechaty
 *
 */

const fs        = require('fs')
const path      = require('path')
const WebDriver = require('selenium-webdriver')
const log       = require('npmlog')
//log.disableColor()

class Browser {
  constructor(options) {
    options   = options       || {}
    this.head = options.head  || false // default to headless
  }

  toString() { return `Class Browser({head:${this.head})` }

  init() {
    log.verbose('Browser', 'init()')
    return this.initDriver()
    .then(this.open.bind(this))
    .then(r => {
      log.verbose('Browser', 'inited: ' + this.toString())
    })
  }

  open() {
    const WX_URL = 'https://wx.qq.com'
    log.verbose('Browser', `open() at ${WX_URL}`)
    try {
      return this.driver.get(WX_URL)
    } catch (e) { // WebDriver exception
      // TODO: try to fix this by re-open webdriver 3 times
      log.error('Browser', 'open be rejected: %s', e)
      return Promise.reject(e)
    }
  }

  initDriver() {
    log.verbose('Browser', 'initDriver()')
    if (this.head) {
      this.driver = new WebDriver.Builder().forBrowser('chrome').build()
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
    .set('phantomjs.binary.path', phantomjsExe)
    .set('phantomjs.cli.args', [
      '--ignore-ssl-errors=true' // this help socket.io connect with localhost
      , '--load-images=false'
      // , '--webdriver-logfile=/tmp/wd.log'
      // , '--webdriver-loglevel=DEBUG'
      // , '--remote-debugger-port=9000'
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
      log.verbose('Browser', 'no need to quite because no driver')
      return Promise.resolve('no driver')
    }
    log.verbose('Browser', 'driver.quit')
    this.driver.close() // http://stackoverflow.com/a/32341885/1123955
    this.driver.quit()
    this.driver = null
    return Promise.resolve()
  }

  execute(script, ...args) {
    //log.verbose('Browser', `Browser.execute(${script})`)
    if (!this.driver) {
      throw new Error('driver not found')
    }
    // return promise
    return this.driver.executeScript.apply(this.driver, arguments)
  }
}

module.exports = Browser
