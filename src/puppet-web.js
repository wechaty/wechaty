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
const Puppet = require('./puppet')
const Message = require('./message')

const WebServer  = require('./puppet-web-server')

class PuppetWeb extends Puppet {
  constructor(options) {
    super()
    options = options || {}
    this.port = options.port || 8788 // W(87) X(88), ascii char code ;-]
  }

  toString() { return `Class PuppetWeb({port:${this.port}})` }

  init() { 
    this.server = new WebServer({port: this.port})

    ;[  // events. ';' for seprate from the last code line
      'login'
      , 'logout'
    ].map( event => 
      this.server.on(event, data => this.emit(event, data) ) 
    )
    
    this.server.on('message', data => {
      const m = new Message(data)
      this.emit('message', m) 
    })

    return this.server.init() 
  }

  send(message) {
    const toContact = message.get('to')
    const content   = message.get('content')

    return this.server.proxyWechaty('send', toContact.getId(), content)
  }

  logout() { 
    return this.server.proxyWechaty('logout')
  }

  getLoginStatusCode() {
    log.verbose('PuppetWeb', 'getLoginStatusCode')
    return this.server.proxyWechaty('getLoginStatusCode')
  }
  getLoginQrImgUrl()   { return this.server.proxyWechaty('getLoginQrImgUrl')   }

  debugLoop() {
    this.getLoginStatusCode().then((c) => {
      log.verbose('PuppetWeb', `login status code: ${c}`)
      setTimeout(this.debugLoop.bind(this), 3000)
    })
  }

  /*
  sendByServer(message) {
    this.server.send(message)
  }
  */

  /**
   *
   *  Interface Methods
   *
   */
  alive()   { return this.server && this.server.isLogined() }
  destroy() {
    if (this.server) {
      this.server.quit()
      delete this.server
    }
  }

  /**
   *
   *  Public Methods
   *
   */
  getLoginQrImgUrl()    { return this.server.proxyWechaty('getLoginQrImgUrl') }
  getLoginStatusCode()  { return this.server.proxyWechaty('getLoginStatusCode') }
  getContact(id)        { return this.server.proxyWechaty('getContact', id) }
}

module.exports = PuppetWeb
