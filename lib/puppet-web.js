/**
 *
 * wechaty-lib: Wechat for Bot. and for human who can talk with bot/robot
 *
 * Web Soul of Puppet
 * use to control wechat web.
 *
 * Licenst: MIT
 * https://github.com/zixia/wechaty-lib
 *
 */


/**************************************
 *
 * Class PuppetWeb
 *
 ***************************************/
const Puppet = require('./puppet')

const WebServer  = require('./puppet-web-server')

class PuppetWeb extends Puppet {
  constructor(port) {
    super()
    this.port = port || 8788 // W(87) X(88), ascii char code ;-]
  }

  init() { 
    this.server = new WebServer(this.port)

    const EVENTS_IN  = [
      'message'
      , 'login'
      , 'logout'
    ]
    EVENTS_IN.map( event => 
      this.server.on(event, data => this.emit(event, data) ) 
    )
    
    const p = new Promise((resolve, reject) => {
      this.server.init(this.port) 
    })

    return p
  }

  send(message) {
    if (!this.browser) throw new Error('browser not exist!');

    const ToUserName   = message.get('to')
    const Content      = message.get('content')

    const script = `return Wechaty.send('${ToUserName}', '${Content}')`
    return this.browser.execte(script)
  }

  logout() { 
    if (!this.browser) throw new Error('browser not exist!');
    return this.browser.execte('return Wechaty.logout()')
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
  getLoginQrImgUrl()   { return this.server.Wechaty_getLoginQrImgUrl()   }
  getLoginStatusCode() { return this.server.Wechaty_getLoginStatusCode() }
}

module.exports = PuppetWeb
