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

  inject() {
    const injectio = fs.readFileSync(
      path.join(path.dirname(__filename), 'puppet-web-injectio.js')
      , 'utf8'
    )

    const socketio = fs.readFileSync(
      // 'https://cdnjs.cloudflare.com/ajax/libs/socket.io/1.4.5/socket.io.min.js'
      path.join(path.dirname(__filename), '/socket.io.min.js')
      , 'utf8'
    )

    console.error('injecting')
    return this.execute(socketio)
    .then(() => {
      console.error('injected socketio')
      this.execute(injectio, this.port)
    })
    .then(() => {
      console.error('injected injectio')
      return this.execute('return Wechaty.init()')
    })
    .then(() => {
      console.error('injected Wechaty()')
      return new Promise((resolve, reject) => resolve())
    })
  }

  quit() { 
    // console.error('Browser.quit')
    if (this.driver) {
      console.error('Browser.driver.quit')
      // this.driver.quit() 
      delete this.driver
    }
  }

  execute(script, ...args) {
    // console.error(`Browser.execute(${script})`)
    if (!this.driver) 
      throw new Error('driver not found')
    // a promise
    return this.driver.executeScript(script, args)
  }
}

module.exports = Browser