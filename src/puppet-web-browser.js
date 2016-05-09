/****************************************
 *
 * Class Browser
 *
header cookie

BaseRequest
Uin
Sid
Skey
DeviceId

 ***************************************/
const fs        = require('fs')
const path      = require('path')
const WebDriver = require('selenium-webdriver')
const log       = require('npmlog')
//log.disableColor()

class Browser {
  constructor(options) {
    options = options || {}

    this.browser  = options.browser || 'chrome' //'phantomjs'
    this.port     = options.port    || 8788 // 'W' 'X' Ascii Code
  }

  toString() { return `Class Wechaty.Puppet.Browser(${this.browser}, ${this.port})` }

  init() {
    return this.open()
    .then(this.inject.bind(this))
  }

  open() {
    const WX_URL = 'https://wx.qq.com'

    log.verbose('Browser', `init ${this.browser}:${this.port}`)
    this.driver = new WebDriver.Builder().forBrowser(this.browser).build()

    /*
    this.driver = new WebDriver.Builder()//.forBrowser(this.browser).build()
    .withCapabilities(
      WebDriver.Capabilities.phantomjs()
      .set('phantomjs.binary.path', 'D:\\cygwin64\\home\\zixia\\git\\wechaty\\node_modules\\phantomjs-prebuilt\\lib\\phantom\\bin\\phantomjs.exe')
    ).build()
   */

    return this.driver.get(WX_URL)
  }

  getInjectio() {
    return fs.readFileSync(
      path.join(path.dirname(__filename), 'puppet-web-injectio.js')
      , 'utf8'
    )    
  }
  inject() {
    const injectio = this.getInjectio()
    log.verbose('Browser', 'injecting')
    return this.execute(injectio, this.port)
    .then(() => {
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
    if (!this.driver) 
      throw new Error('driver not found')
    // return promise
    return this.driver.executeScript.apply(this.driver, arguments)
  }
}

module.exports = Browser
