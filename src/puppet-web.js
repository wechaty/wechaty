/**
 *
 * wechaty: Wechat for Bot. and for human who talk to bot/robot
 *
 * Web Puppet
 * use to control wechat web.
 *
 * Licenst: ISC
 * https://github.com/zixia/wechaty
 *
 */

/**************************************
 *
 * Class PuppetWeb
 *
 ***************************************/
const log = require('npmlog')

const Puppet = require('./puppet')
const Message = require('./message')

const Server  = require('./puppet-web-server')
const Browser = require('./puppet-web-browser')

class PuppetWeb extends Puppet {
  constructor(options) {
    super()
    options = options || {}
    this.port = options.port || 8788 // W(87) X(88), ascii char code ;-]
    this.head = options.head
  }

  toString() { return `Class PuppetWeb({browser:${this.browser},port:${this.port}})` }

  init() {
    this.logined  = false
    this.on('login' , () => this.logined = true)
    this.on('logout', () => this.logined = false)

    this.userId = null

    return Promise.all([
      this.initServer()
      , this.initBrowser()
    ])
  }

  initServer() {
    this.server   = new Server({port: this.port})

    ;[// events. ';' for seprate from the last code line
      'login'
      , 'logout'
    ].map(event =>
      this.server.on(event, data => this.emit(event, data))
    )
    this.server.on('message', data => this.forwardMessage(data))
    /**
     * `unload` event is sent from js@browser to webserver via socketio
     * after received `unload`, we re-inject the Wechaty js code into browser.
     */
    this.server.on('unload', data => {
      log.verbose('PuppetWeb', 'server received unload event')
      this.emit('logout', data)
      this.browser.inject()
      .then(() => log.verbose('PuppetWeb', 're-injected'))
      .catch((e) => log.error('PuppetWeb', 'inject err: ' + e))
    })

    this.server.on('log', s => log.verbose('PuppetWeb', 'log event:' + s))

    return this.server.init()
  }

  initBrowser() {
    this.browser  = new Browser({
      head: this.head
      , port:   this.port
    })
    return this.browser.init()
  }

  forwardMessage(data) {
    const m = new Message(data)
    const fromId = m.get('from')
    if (this.userId)
    this.emit('message', m)
  }
  send(message) {
    const toContact   = message.get('to')
    const toContactId = toContact.getId()
    const content     = message.get('content')

    log.silly('PuppetWeb', `send(${toContactId}, ${content})`)
    return this.proxyWechaty('send', toContactId, content)
  }

  logout() {
    return this.proxyWechaty('logout')
  }

  debugLoop() {
    // XXX
    this.getLoginStatusCode().then((c) => {
      log.verbose('PuppetWeb', `login status code: ${c}`)
      setTimeout(this.debugLoop.bind(this), 3000)
    })
  }

  /**
   *
   *  Interface Methods
   *
   */
  quit() {
    log.verbose('PuppetWeb', 'quit()')
    if (this.server) {
      log.verbose('PuppetWeb', 'server.quit()')
      this.server.quit()
      this.server = null
    }
    if (this.browser) {
      log.verbose('PuppetWeb', 'browser.quit()')
      this.browser.quit()
      this.browser = null
    }
  }

  /**
   *
   * Proxy Call to Wechaty in Browser
   *
   */
  proxyWechaty(wechatyFunc, ...args) {
    //const args      = Array.prototype.slice.call(arguments, 1)
    const argsJson  = JSON.stringify(args)
    const wechatyScript = `return (Wechaty && Wechaty.${wechatyFunc}.apply(undefined, JSON.parse('${argsJson}')))`

    log.silly('PuppetWeb', 'proxyWechaty: ' + wechatyScript)
    return this.browser.execute(wechatyScript)
  }

  /**
   *
   *  Public Methods
   *
   */
  getLoginQrImgUrl()    { 
    log.silly('PuppetWeb', 'getLoginQrImgUrl()')
    return this.proxyWechaty('getLoginQrImgUrl') 
  }
  getLoginStatusCode()  { return this.proxyWechaty('getLoginStatusCode') }
  getContact(id)        { return this.proxyWechaty('getContact', id) }
  isLogined()           { return !!(this.logined) }

}

module.exports = PuppetWeb
