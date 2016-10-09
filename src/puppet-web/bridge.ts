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
 /* tslint:disable:no-var-requires */
const retryPromise  = require('retry-promise').default

import log        from '../brolog-env'

import PuppetWeb  from './puppet-web'

class Bridge {

  constructor(
      private puppet: PuppetWeb
    , private port: number
  ) {
    if (!puppet || !port) {
      throw new Error('Bridge need puppet & port')
    }

    log.verbose('PuppetWebBridge', 'new Bridge({puppet: %s, port: %s})'
      , puppet.constructor.name
      , port
    )
  }

  public toString() { return `Bridge({puppet: ${this.puppet.constructor.name}, port: ${this.port}})` }

  public async init(): Promise<Bridge> {
    log.verbose('PuppetWebBridge', 'init()')

    const max = 15
    const backoff = 100

    // max = (2*totalTime/backoff) ^ (1/2)
    // timeout = 11,250 for {max: 15, backoff: 100}
    // timeout = 45,000 for {max: 30, backoff: 100}
    // timeout = 30,6250 for {max: 35, backoff: 500}
    const timeout = max * (backoff * max) / 2

    return retryPromise({ max: max, backoff: backoff }, attempt => {
      log.silly('PuppetWebBridge', 'init() retryPromise: attampt %s/%s times for timeout %s'
        , attempt, max, timeout)

      return this.inject()
      .then(r => {
        log.silly('PuppetWebBridge', 'init() inject() return %s at attempt %d', r, attempt)
        return this
      })
      .catch(e => {
        log.silly('PuppetWebBridge', 'init() inject() attempt %d exception: %s', attempt, e.message)
        throw e
      })
    })
    .then(_ => {
      log.silly('PuppetWebBridge', 'init()-ed')
      return this
    })
    .catch(e => {
      log.warn('PuppetWebBridge', 'init() inject FINAL fail: %s', e.message)
      throw e
    })
  }

  private inject(): Promise<any> {
    log.verbose('PuppetWebBridge', 'inject()')

    return co.call(this, function* () {
      const injectio = this.getInjectio()

      let retObj = yield this.execute(injectio, this.port)

      if (retObj && /^(2|3)/.test(retObj.code)) {   // HTTP Code 2XX & 3XX
        log.silly('PuppetWebBridge', 'inject() eval(Wechaty) return code[%d] message[%s] port[%d]'
          , retObj.code, retObj.message, retObj.port)
      } else {                                    // HTTP Code 4XX & 5XX
        throw new Error('execute injectio error: ' + retObj.code + ', ' + retObj.message)
      }

      retObj = yield this.proxyWechaty('init')
      if (retObj && /^(2|3)/.test(retObj.code)) {   // HTTP Code 2XX & 3XX
        log.silly('PuppetWebBridge', 'inject() Wechaty.init() return code[%d] message[%s] port[%d]'
          , retObj.code, retObj.message, retObj.port)
      } else {                                    // HTTP Code 4XX & 5XX
        throw new Error('execute proxyWechaty(init) error: ' + retObj.code + ', ' + retObj.message)
      }

      const r = yield this.ding('inject()')
      if (r !== 'inject()') {
        throw new Error('fail to get right return from call ding()')
      }
      log.silly('PuppetWebBridge', 'inject() ding success')

      return true
    })
    .catch (e => {
      log.verbose('PuppetWebBridge', 'inject() exception: %s. stack: %s', e.message, e.stack)
      throw e
    })
  }

  public getInjectio(): string {
    const fs = require('fs')
    const path = require('path')

    /**
     * Do not insert `return` in front of the code.
     * because the new line `\n` will cause return nothing at all
     */
    return 'rejectioReturnValue = '
              + fs.readFileSync(
                path.join(__dirname, 'wechaty-bro.js')
                , 'utf8'
              )
              + '; return rejectioReturnValue'
  }

  public logout(): Promise<all> {
    log.verbose('PuppetWebBridge', 'quit()')
    return this.proxyWechaty('logout')
    .catch(e => {
      log.error('PuppetWebBridge', 'logout() exception: %s', e.message)
      throw e
    })
  }

  public quit(): Promise<void> {
    log.verbose('PuppetWebBridge', 'quit()')
    return this.proxyWechaty('quit')
    .catch(e => {
      log.error('PuppetWebBridge', 'quit() exception: %s', e.message)
      throw e
    })
  }

  public getUserName(): Promise<string> {
    return this.proxyWechaty('getUserName')
              .catch(e => {
                log.error('PuppetWebBridge', 'getUserName() exception: %s', e.message)
                throw e
              })
  }

  public contactFind(filterFunction): Promise<string[]> {
    return this.proxyWechaty('contactFindAsync', filterFunction)
                .catch(e => {
                  log.error('PuppetWebBridge', 'contactFindAsync() exception: %s', e.message)
                  throw e
                })
  }

  public roomFind(filterFunction): Promise<string[]> {
    return this.proxyWechaty('roomFind', filterFunction)
                .catch(e => {
                  log.error('PuppetWebBridge', 'roomFind() exception: %s', e.message)
                  throw e
                })
  }

  public roomDelMember(roomId, contactId): Promise<void> {
    if (!roomId || !contactId) {
      throw new Error('no roomId or contactId')
    }

    return this.proxyWechaty('roomDelMember', roomId, contactId)
                .catch(e => {
                  log.error('PuppetWebBridge', 'roomDelMember(%s, %s) exception: %s', roomId, contactId, e.message)
                  throw e
                })
  }

  public roomAddMember(roomId, contactId): Promise<void> {
    log.verbose('PuppetWebBridge', 'roomAddMember(%s, %s)', roomId, contactId)

    if (!roomId || !contactId) {
      throw new Error('no roomId or contactId')
    }
    return this.proxyWechaty('roomAddMember', roomId, contactId)
                .catch(e => {
                  log.error('PuppetWebBridge', 'roomAddMember(%s, %s) exception: %s', roomId, contactId, e.message)
                  throw e
                })
  }

  public roomModTopic(roomId, topic): Promise<void> {
    if (!roomId) {
      throw new Error('no roomId')
    }

    return this.proxyWechaty('roomModTopic', roomId, topic)
                .catch(e => {
                  log.error('PuppetWebBridge', 'roomModTopic(%s, %s) exception: %s', roomId, topic, e.message)
                  throw e
                })
  }

  public roomCreate(contactIdList: string[], topic?: string): Promise<string> {
    if (!contactIdList || !Array.isArray(contactIdList)) {
      throw new Error('no valid contactIdList')
    }

    return this.proxyWechaty('roomCreateAsync', contactIdList, topic)
                .catch(e => {
                  log.error('PuppetWebBridge', 'roomCreate(%s) exception: %s', contactIdList, e.message)
                  throw e
                })
  }

  public verifyUserRequest(contactId, hello): Promise<void> {
    log.verbose('PuppetWebBridge', 'verifyUserRequest(%s, %s)', contactId, hello)

    if (!contactId) {
      throw new Error('no valid contactId')
    }
    return this.proxyWechaty('verifyUserRequest', contactId, hello)
                .catch(e => {
                  log.error('PuppetWebBridge', 'verifyUserRequest(%s, %s) exception: %s', contactId, hello, e.message)
                  throw e
                })
  }

  public verifyUserOk(contactId, ticket): Promise<void> {
    log.verbose('PuppetWebBridge', 'verifyUserOk(%s, %s)', contactId, ticket)

    if (!contactId || !ticket) {
      throw new Error('no valid contactId or ticket')
    }
    return this.proxyWechaty('verifyUserOk', contactId, ticket)
                .catch(e => {
                  log.error('PuppetWebBridge', 'verifyUserOk(%s, %s) exception: %s', contactId, ticket, e.message)
                  throw e
                })
  }

  public send(toUserName, content): Promise<void> {
    return this.proxyWechaty('send', toUserName, content)
              .catch(e => {
                log.error('PuppetWebBridge', 'send() exception: %s', e.message)
                throw e
              })
  }

  public getMsgImg(id): Promise<string> {
    return this.proxyWechaty('getMsgImg', id)
    .catch(e => {
      log.silly('PuppetWebBridge', 'proxyWechaty(getMsgImg, %d) exception: %s', id, e.message)
      throw e
    })
  }

  public getContact(id: string): Promise<string> {
    if (id !== id) { // NaN
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

  /**
   * Proxy Call to Wechaty in Bridge
   */
  private proxyWechaty(wechatyFunc, ...args): Promise<any> {
    const argsEncoded = new Buffer(
      encodeURIComponent(
        JSON.stringify(args)
      )
    ).toString('base64')
    // see: http://blog.sqrtthree.com/2015/08/29/utf8-to-b64/
    const argsDecoded = `JSON.parse(decodeURIComponent(window.atob('${argsEncoded}')))`

    const wechatyScript   = `
      const callback = arguments[arguments.length - 1]
      const isAsync = (typeof callback === 'function')
      return WechatyBro
              .${wechatyFunc}
              .apply(undefined
                      , isAsync
                        ? ${argsDecoded}.concat(callback)
                        : ${argsDecoded}
                    )
    `.replace(/[\n\s]+/, ' ')
    // log.silly('PuppetWebBridge', 'proxyWechaty(%s, ...args) %s', wechatyFunc, wechatyScript)
// console.log('proxyWechaty wechatyFunc args[0]: ')
// console.log(args[0])
    /**
     *
     * WechatyBro method named end with "Async", will be treated as a Async function
     */
    let funcExecuter
    if (/Async$/.test(wechatyFunc)) {
      funcExecuter = this.executeAsync.bind(this)
    } else {
      funcExecuter = this.execute.bind(this)
    }
    return this.execute('return typeof WechatyBro === "undefined"')
      .then(noWechaty => {
        if (noWechaty) {
          throw new Error('there is no WechatyBro in browser(yet)')
        }
      })
      .then(() => funcExecuter(wechatyScript))
      .catch(e => {
        log.warn('PuppetWebBridge', 'proxyWechaty() exception: %s', e.message)
        throw e
      })
  }

  /**
   * call REAL browser excute for other methods
   */
  private execute(script, ...args): Promise<any> {
    if (!this.puppet || !this.puppet.browser) {
      return Promise.reject(new Error('execute(): no puppet or no puppet.browser in bridge'))
    }
    return this.puppet.browser.execute(script, ...args)
    .catch(e => {
      log.warn('PuppetWebBridge', 'execute() exception: %s', e.message)
      throw e
    })
  }

  private executeAsync(script, ...args): Promise<any> {
    if (!this.puppet || !this.puppet.browser) {
      return Promise.reject(new Error('execute(): no puppet or no puppet.browser in bridge'))
    }
    return this.puppet.browser.executeAsync(script, ...args)
    .catch(e => {
      log.warn('PuppetWebBridge', 'executeAsync() exception: %s', e.message)
      throw e
    })
  }

  public ding(data): Promise<any> {
    return this.proxyWechaty('ding', data)
    .catch(e => {
      log.error('PuppetWebBridge', 'ding(%s) exception: %s', data, e.message)
      throw e
    })
  }
}

// module.exports = Bridge
export default Bridge

/* tslint:disable:jsdoc-format */
/* tslint:disable:max-line-length */
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

XMLHttpRequestOrig = XMLHttpRequest
XMLHttpRequest = function() { return new XMLHttpRequestOrig() }

 *
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
 * check the live status of wxapp method 1
 *
appFactory = Wechaty.glue.injector.get('appFactory')
appFactory.syncOrig = appFactory.sync
appFactory.syncCheckOrig = appFactory.syncCheck
appFactory.sync = function() { Wechaty.log('appFactory.sync() !!!'); return appFactory.syncOrig(arguments) }
appFactory.syncCheck = function() { Wechaty.log('appFactory.syncCheck() !!!'); return appFactory.syncCheckOrig(arguments) }

// method 2
$.ajaxOrig = $.ajax
$.ajax = function() { Wechaty.log('$.ajax() !!!'); return $.ajaxOrig(arguments) }

// method 3 - mmHttp
mmHttp = Wechaty.glue.injector.get('mmHttp')
mmHttp.getOrig = mmHttp.get
mmHttp.get = function() { Wechaty.log('mmHttp.get() !!!'); return mmHttp.getOrig(arguments) }
 *
 */
