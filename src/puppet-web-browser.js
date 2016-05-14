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

    this.browser  = options.browser || 'phantomjs'
    this.port     = options.port    || 8788 // 'W' 'X' Ascii Code
  }

  toString() { return `Class Wechaty.Puppet.Browser({browser:${this.browser}, port:${this.port}})` }

  init() {
    return this.open()
    .then(this.inject.bind(this))
  }

  open() {
    const WX_URL = 'https://wx.qq.com'

    log.verbose('Browser', `init ${this.browser}(${this.port})`)
    this.driver = this.getDriver()

    return this.driver.get(WX_URL)
  }

  getDriver() {
    var driver
    switch (this.browser) {
      case 'chrome':
        driver = new WebDriver.Builder().forBrowser(this.browser).build()
        break

      default:
      case 'phantomjs':
        driver = Browser.getPhantomJsDriver()
        break
    }
    return driver
  }

  static getPhantomJsDriver() {
    // https://github.com/SeleniumHQ/selenium/issues/2069
    //setup custom phantomJS capability
    const phantomjsExe = require('phantomjs-prebuilt').path
    const customPhantom = WebDriver.Capabilities.phantomjs()
    .set('phantomjs.binary.path', phantomjsExe)

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
    log.verbose('Browser', 'Browser.quit')
    if (!this.driver) {
      log.verbose('Browser', 'no need to quite because no driver')
      return new Promise((resolve, reject) => resolve('no driver'))
    }
    log.verbose('Browser', 'Browser.driver.quit')
    return this.execute('return (typeof Wechaty)!=="undefined" && Wechaty.quit()').then(() => {
      this.driver.quit()
      this.driver = null
      return new Promise((resolve, reject) => resolve())
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
