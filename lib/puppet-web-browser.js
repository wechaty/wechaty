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

class Browser {
  constructor(browser, port) {
    this.browser  = browser || 'chrome'
    this.port     = port    || 8788
  }

  toString() { return `Class Wechaty.Puppet.Browser(${this.browser}, ${this.port})` }

  init() {
    return this.open()
    .then(this.inject.bind(this))
  }

  open() {
    const WX_URL = 'https://wx.qq.com'

    console.error(`browser init ${this.browser}:${this.port}`)
    this.driver = new WebDriver.Builder().forBrowser(this.browser).build()

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
    console.error('injecting')
    return this.execute(injectio, this.port)
    .then(() => {
      console.error('injected / call Wechaty.init()')
      return this.execute('return Wechaty.init()')
    }).then((data) => {
      console.error('Wechaty.init() return: ' + data)
      return new Promise((resolve, reject) => resolve(data))
    })
  }

  quit() { 
    console.error('Browser.quit')
    if (!this.driver) {
      console.error('no need to quite because no driver')
      return new Promise((resolve, reject) => resolve('no driver'))
    }
    console.error('Browser.driver.quit')
    this.execute('return (typeof Wechaty)!=="undefined" && Wechaty.quit()').then(() => {
      this.driver.quit(true) 
      delete this.driver
      return new Promise((resolve, reject) => resolve())
    })
  }

  execute(script, ...args) {
    // console.error(`Browser.execute(${script})`)
    if (!this.driver) 
      throw new Error('driver not found')
    // a promise
    return this.driver.executeScript.apply(this.driver, arguments)
  }
}

module.exports = Browser
