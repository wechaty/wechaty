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
const retryPromise  = require('retry-promise').default
const log           = require('npmlog')

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

  logout()                  {
    log.verbose('Bridge', 'quit()')
    return this.proxyWechaty('logout')
  }
  quit()                    {
    log.verbose('Bridge', 'quit()')
    return this.proxyWechaty('quit')
  }

  // @Deprecated: use `scan` event instead
  getLoginStatusCode()      { return this.proxyWechaty('getLoginStatusCode') }
  // @Deprecated: use `scan` event instead
  getLoginQrImgUrl()        { return this.proxyWechaty('getLoginQrImgUrl') }

  getUserName()             { return this.proxyWechaty('getUserName') }

  getContact(id) {
    const max = 30
    const backoff = 100

    // max = (2*totalTime/backoff) ^ (1/2)
    // timeout = 11250 for {max: 15, backoff: 100}
    // timeout = 45000 for {max: 30, backoff: 100}
    const timeout = max * (backoff * max) / 2

    return retryPromise({ max: max, backoff: backoff }, function (attempt) {
      log.verbose('Bridge', 'getContact() retryPromise: attampt %s/%s time for timeout %s'
        , attempt, max, timeout)
      /**
       * This promise is MUST have here,
       * the reason is as the following NOTICE explained
       */
      return new Promise((resolve, reject) => {
        this.proxyWechaty('getContact', id)
        .then(r => {
          if (r) {
            resolve(r)
          }
          /**
           * NOTICE: the promise that this.proxyWechaty returned will be resolved but be `undefined`
           * which should be treat as `rejected`
           */
          return reject('got empty')
        }).catch(e => {
          reject(e)
        })
      })
    }.bind(this))
    .catch(e => {
      log.error('Bridge', 'getContact() retryPromise FAIL: %s', e)
      throw e
    })
    /////////////////////////////////
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