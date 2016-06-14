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
const co = require('co')
const retryPromise  = require('retry-promise').default

const log = require('./npmlog-env')

class Bridge {
  constructor(options) {
    if (!options || !options.puppet) { throw new Error('Bridge need a puppet')}
    log.verbose('PuppetWebBridge', 'new Bridge({puppet: %s, port: %s})'
      , options.puppet.constructor.name
      , options.port)

    this.options = {
      puppet: options.puppet
      , port: options.port || 8788 // W(87) X(88), ascii char code ;-]
    }
  }
  toString() { return `Bridge({puppet: ${this.options.puppet.constructor.name}, port: ${this.options.port}})` }

  init() {
    log.verbose('PuppetWebBridge', 'init()')
    return this.inject()
    .then(r => {
      log.verbose('PuppetWebBridge', 'init() inject() return %s', r)
      return this
    })
    .catch(e => {
      log.error('PuppetWebBridge', 'init() inject() exception: %s', e.message)
      throw e
    })
  }

  logout() {
    log.verbose('PuppetWebBridge', 'quit()')
    return this.proxyWechaty('logout')
    .catch(e => {
      log.error('PuppetWebBridge', 'logout() exception: %s', e.message)
      throw e
    })
  }
  quit()                    {
    log.verbose('PuppetWebBridge', 'quit()')
    return this.proxyWechaty('quit')
    .catch(e => {
      log.error('PuppetWebBridge', 'quit() exception: %s', e.message)
      throw e
    })
  }

  // @Deprecated: use `scan` event instead
  // getLoginStatusCode()      { return this.proxyWechaty('getLoginStatusCode') }
  // @Deprecated: use `scan` event instead
  // getLoginQrImgUrl()        { return this.proxyWechaty('getLoginQrImgUrl') }

  getUserName() {
    return this.proxyWechaty('getUserName')
    .catch(e => {
      log.error('PuppetWebBridge', 'getUserName() exception: %s', e.message)
      throw e
    })
  }

  send(toUserName, content) {
    return this.proxyWechaty('send', toUserName, content)
    .catch(e => {
      log.error('PuppetWebBridge', 'send() exception: %s', e.message)
      throw e
    })
  }

  getMsgImg(id) {
    return this.proxyWechaty('getMsgImg', id)
    .catch(e => {
      log.silly('PuppetWebBridge', 'proxyWechaty(getMsgImg, %d) exception: %s', id, e.message)
      throw e
    })
  }
  getContact(id) {
    if (id!==id) { // NaN
      const err = new Error('NaN! where does it come from?')
      log.error('PuppetWebBridge', 'getContact(NaN): %s', err)
      return Promise.reject(err)
    }
    const max = 35
    const backoff = 500

    // max = (2*totalTime/backoff) ^ (1/2)
    // timeout = 11,250 for {max: 15, backoff: 100}
    // timeout = 45,000 for {max: 30, backoff: 100}
    // timeout = 30,6250 for {max: 35, backoff: 500}
    const timeout = max * (backoff * max) / 2

    return retryPromise({ max: max, backoff: backoff }, function (attempt) {
      log.silly('PuppetWebBridge', 'getContact() retryPromise: attampt %s/%s time for timeout %s'
        , attempt, max, timeout)

      return this.proxyWechaty('getContact', id)
      .then(r => {
        if (!r) {
          throw new Error('got empty return')
        }
        return r
      })
      .catch(e => {
        log.silly('PuppetWebBridge', 'proxyWechaty(getContact, %s) exception: %s', id, e.message)
        throw e
      })
    }.bind(this))
    .catch(e => {
      log.warn('PuppetWebBridge', 'retryPromise() getContact() finally FAIL: %s', e.message)
      throw e
    })
    /////////////////////////////////
  }

  getInjectio() {
    const fs = require('fs')
    const path = require('path')
    return fs.readFileSync(
      path.join(path.dirname(__filename), 'puppet-web-injectio.js')
      , 'utf8'
    )
  }
  inject(attempt) {
    log.verbose('PuppetWebBridge', 'inject()')
    return co.call(this, function* () {
      const injectio = this.getInjectio()
      let r = yield this.execute(injectio, this.options.port)
      log.verbose('PuppetWebBridge', 'inject() injected, got [%s]', r)
      r = yield this.proxyWechaty('init')
      log.verbose('PuppetWebBridge', 'inject() Wechaty.init() return: %s', r)
      return r
    })
    .catch (e => {
      log.warn('PuppetWebBridge', 'inject() exception: %s', e.message)
      attempt = attempt || 0
      if (attempt++ < 3)  {
        log.warn('PuppetWebBridge', 'inject(%d) retry after 1 second: %s', attempt, e.message)
        setTimeout(() => this.inject(attempt), 1000)
        return
      }
      throw e
    })
  }

  /**
   * Proxy Call to Wechaty in Bridge
   */
  proxyWechaty(wechatyFunc, ...args) {
    const argsEncoded = new Buffer(
      encodeURIComponent(
        JSON.stringify(args)
      )
    ).toString('base64')
    // see: http://blog.sqrtthree.com/2015/08/29/utf8-to-b64/
    const argsDecoded = `JSON.parse(decodeURIComponent(window.atob('${argsEncoded}')))`

    const wechatyScript   = `return Wechaty.${wechatyFunc}.apply(undefined, ${argsDecoded})`
    log.silly('PuppetWebBridge', 'proxyWechaty(%s, ...args) %s', wechatyFunc, wechatyScript)
    return this.execute(wechatyScript)
    .catch(e => {
      log.warn('PuppetWebBridge', 'proxyWechaty() exception: %s', e.message)
      throw e
    })
  }

  execute(script, ...args) {
    return this.options.puppet.browser.execute(script, ...args)
    .catch(e => {
      log.warn('PuppetWebBridge', 'execute() exception: %s', e.message)
      throw e
    })
  }
}

module.exports = Bridge

/**
 *
 * some handy browser javascript snips
 *
ac = Wechaty.glue.contactFactory.getAllContacts();
Object.keys(ac).filter(function(k) { return /李/.test(ac[k].NickName) }).map(function(k) { var c = ac[k]; return {NickName: c.NickName, Alias: c.Alias, Uin: c.Uin, MMInChatRoom: c.MMInChatRoom} })

Object.keys(window._chatContent).filter(function (k) { return window._chatContent[k].length > 0 }).map(function (k) { return window._chatContent[k].map(function (v) {return v.MMDigestTime}) })

.web_wechat_tab_add
.web_wechat_tab_launch-chat

contentChatController

e.getMsgImg = function(e, t, o) {
    return o && "undefined" != typeof o.MMStatus && o.MMStatus != u.MSG_SEND_STATUS_SUCC ? void 0 : u.API_webwxgetmsgimg + "?&MsgID=" + e + "&skey=" + encodeURIComponent(c.getSkey()) + (t ? "&type=" + t : "")
}
,
e.getMsgVideo = function(e) {
    return u.API_webwxgetvideo + "?msgid=" + e + "&skey=" + encodeURIComponent(c.getSkey())
}

<div class="picture"
ng-init="imageInit(message,message.MMPreviewSrc || message.MMThumbSrc || getMsgImg(message.MsgId,'slave'))">
<img class="msg-img" ng-style="message.MMImgStyle" ng-click="previewImg(message)"
ng-src="/cgi-bin/mmwebwx-bin/webwxgetmsgimg?&amp;MsgID=6944236226252183282&amp;skey=%40crypt_c117402d_2b2a8c58340c8f4b0a4570cb8f11a1e8&amp;type=slave"
src="/cgi-bin/mmwebwx-bin/webwxgetmsgimg?&amp;MsgID=6944236226252183282&amp;skey=%40crypt_c117402d_2b2a8c58340c8f4b0a4570cb8f11a1e8&amp;type=slave"
style="height: 100px; width: 75px;">


 *
 */
