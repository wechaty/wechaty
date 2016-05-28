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
  toString() { return `Class Bridge({browser: ${this.options.browser}, port: ${this.options.port}})` }

  init() {
    log.verbose('Bridge', 'init()')
    return this.inject()
  }

  logout()                  { return this.proxyWechaty('logout') }
  quit()                    {
    log.verbose('Bridge', 'quit()')
    return this.proxyWechaty('quit')
  }
  
  // @Deprecated
  // getLoginStatusCode()      { return this.proxyWechaty('getLoginStatusCode') }
  // getLoginQrImgUrl()        { return this.proxyWechaty('getLoginQrImgUrl') }
  
  getUserName()             { return this.proxyWechaty('getUserName') }

  getContact(id)            {
    // TODO: use retry-promise instead of waitData
    return this.waitData(r => {
      return this.proxyWechaty('getContact', id)
    }, 3000)
  }

  /**
  * Call a function repeatly untill it return a resolved promise
  *
  * @param {Function} pfunc
  * @param {Number}   timeout
  * 
  * @TODO: change waitData to retry-promise
  */
  waitData(pfunc, timeout) {
    log.silly('Bridge', 'waitData()')
    const waitTime  = 50
    let totalTime   = 0
    return new Promise((resolve, reject) => {
      function retry() {
        log.silly('Bridge', 'retry()@waitData()')
        try {
          pfunc().then(data => {
            if (data) {
              log.silly('Bridge', `waitData(${totalTime}/${timeout}) succ`)
              return resolve(data)
            } else if (totalTime > timeout) {
              log.silly('Bridge', `waitData(${totalTime}/${timeout}) timeout`)
              return resolve()
            }
            log.silly('Bridge', `waitData(${totalTime}/${timeout}) retry`)
            totalTime += waitTime
            return setTimeout(retry, waitTime)
          })
        } catch (e) {
          log.silly('Bridge', `waitData(${totalTime}/${timeout}) exception: %s`, e)
          return reject(e)
        }
      }
      return retry()
    })
  }

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
        else          { throw new Error('Wechaty.init() return not true： ' + r) }
        return r
      })
    } catch (e) {
      log.error('Bridge', 'inject() exception: %s', e)
      return Promise.reject('inject exception: ' + e)
    }
    throw new Error('should not run to here')
  }

  /**
   * Proxy Call to Wechaty in Bridge
   */
  proxyWechaty(wechatyFunc, ...args) {
    function escape (key, val) {
     if (typeof(val)!="string") return val;
      return val      
        .replace(/[\\]/g, '\\\\')
        .replace(/[\/]/g, '\\/')
        .replace(/[\b]/g, '\\b')
        .replace(/[\f]/g, '\\f')
        .replace(/[\n]/g, '\\n')
        .replace(/[\r]/g, '\\r')
        .replace(/[\t]/g, '\\t')
        .replace(/[\"]/g, '\\"')
        .replace(/\\'/g, "\\'")
    } // http://stackoverflow.com/a/14137856/1123955
    const argsJson  = JSON.stringify(args, escape)
    
    const wechatyScript = `return (Wechaty && Wechaty.${wechatyFunc}.apply(undefined, JSON.parse('${argsJson}')))`

    log.silly('Bridge', 'proxyWechaty: ' + wechatyScript)
    return this.execute(wechatyScript)
  }
  execute(script, ...args) { return this.browser.execute(script, ...args) }
}

module.exports = Bridge

/*
*
ac = Wechaty.glue.contactFactory.getAllContacts();
Object.keys(ac).filter(function(k) { return /李/.test(ac[k].NickName) }).map(function(k) { var c = ac[k]; return {NickName: c.NickName, Alias: c.Alias, Uin: c.Uin, MMInChatRoom: c.MMInChatRoom} })

Object.keys(window._chatContent).filter(function (k) { return window._chatContent[k].length > 0 }).map(function (k) { return window._chatContent[k].map(function (v) {return v.MMDigestTime}) })

.web_wechat_tab_add
.web_wechat_tab_launch-chat
*
*/