/**
*
* Wechaty - Wechat for Bot, and human who talk to bot.
*
* Inject this js code to browser,
* in order to interactive with wechat web program.
*
* Licenst: MIT
* https://github.com/zixia/wechaty-lib
*
*/
const log = require('npmlog')

class Bridge {
  constructor(options) {
    if (!options || !options.browser) { throw new Error('Bridge need a browser')}
    log.verbose('Bridge', `new Bridge({browser: ${options.browser}, port: ${options.port}})`)

    this.browser  = options.browser
    this.port     = options.port || 8788 // W(87) X(88), ascii char code ;-]
  }
  toString() { return `Class Bridge({browser: ${options.browser}, port: ${options.port}})` }

  init() {
    log.verbose('Bridge', 'init()')
    return this.inject()
  }

  logout()                  { return this.proxyWechaty('logout') }
  quit()                    { return this.proxyWechaty('quit') }
  getLoginStatusCode()      { return this.proxyWechaty('getLoginStatusCode') }
  getLoginQrImgUrl()        { return this.proxyWechaty('getLoginQrImgUrl') }
  getUserName()             { return this.proxyWechaty('getUserName') }

  getContact(id)            { return this.proxyWechaty('getContact', id) }
  send(toUserName, content) { return this.proxyWechaty('send', toUserName, content) }

  getInjectio() {
    const fs = require('fs')
    const path = require('path')
    return fs.readFileSync(
      path.join(path.dirname(__filename), 'puppet-web-injectio.js')
      , 'utf8'
    )
  }
  inject() {
    log.verbose('Bridge', 'inject()')
    const injectio = this.getInjectio()
    try {
      return this.execute(injectio, this.port)
      .then(r => {
        log.verbose('Bridge', 'injected. initing...')
        return this.proxyWechaty('init')
      })
      .then(r => {
        if (true===r) { log.verbose('Bridge', 'Wechaty.init() return: ' + r) }
        else          { throw new Error('Wechaty.init() return not true') }
        return r
      })
    } catch (e) {
      return Promise.reject('inject exception: ' + e)
    }
    throw new Error('should not run to here')
  }

  /**
   * Proxy Call to Wechaty in Bridge
   */
  proxyWechaty(wechatyFunc, ...args) {
    //const args      = Array.prototype.slice.call(arguments, 1)
    const argsJson  = JSON.stringify(args)
    const wechatyScript = `return (Wechaty && Wechaty.${wechatyFunc}.apply(undefined, JSON.parse('${argsJson}')))`

    log.silly('Bridge', 'proxyWechaty: ' + wechatyScript)
    return this.execute(wechatyScript)
  }
  execute(script, ...args) { return this.browser.execute(script, ...args) }
}

module.exports = Bridge
