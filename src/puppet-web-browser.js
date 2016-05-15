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
    options = options || {}

    this.head = options.head  || false // default to headless
    this.port = options.port  || 8788 // 'W' 'X' Ascii Code
  }

  toString() { return `Class Wechaty.Puppet.Web.Browser({head:${this.head}, port:${this.port}})` }

  init() {
    this.driver = this.getDriver()

    return this.open()
    .then(this.inject.bind(this))
    .then(r => log.verbose('Browser', 'inited: ' + this.toString()))
  }

  open() {
    const WX_URL = 'https://wx.qq.com'
    log.verbose('Browser', `open: ${WX_URL}`)
    return this.driver.get(WX_URL)
  }

  getDriver() {
    if (this.head) {
      return new WebDriver.Builder().forBrowser('chrome').build()
    }
    return Browser.getPhantomJsDriver()
  }

  static getPhantomJsDriver() {
    // https://github.com/SeleniumHQ/selenium/issues/2069
    // setup custom phantomJS capability
    const phantomjsExe = require('phantomjs-prebuilt').path
    // const phantomjsExe = require('phantomjs2').path
    const customPhantom = WebDriver.Capabilities.phantomjs()
    .set('phantomjs.binary.path', phantomjsExe)

    log.verbose('Browser', 'phantomjs path:' + phantomjsExe)

    //build custom phantomJS driver
    return new WebDriver.Builder()
    .withCapabilities(customPhantom)
    .build()
  }

  static getInjectio() {
    return fs.readFileSync(
      path.join(path.dirname(__filename), 'puppet-web-injectio.js')
      , 'utf8'
    )
  }
  inject() {
    const injectio = Browser.getInjectio()
    log.verbose('Browser', 'injecting')
    try {
      var p = this.execute(injectio, this.port)
    } catch (e) {
      return new Promise((rs, rj) => rj('execute exception: ' + e))
    }
    return p.then(() => {
      log.verbose('Browser', 'injected / try Wechaty.init()')
      return this.execute('return (typeof Wechaty)==="undefined" ? false : Wechaty.init()')
    }).then((data) => {
      log.verbose('Browser', 'Wechaty.init() return: ' + data)
      return new Promise((resolve, reject) => resolve(data))
    })
  }

  quit() {
    log.verbose('Browser', 'quit()')
    if (!this.driver) {
      log.verbose('Browser', 'no need to quite because no driver')
      return Promise.resolve('no driver')
    }
    return this.execute('return (typeof Wechaty)!=="undefined" && Wechaty.quit()').then(() => {
      log.verbose('Browser', 'Browser.driver.quit')
      this.driver.quit()
      this.driver = null
    })
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
