/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   @copyright 2016-2017 Huan LI <zixia@zixia.net>
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */
import { EventEmitter } from 'events'
import * as fs          from 'fs'
import * as path        from 'path'

import {
  Browser,
  Cookie,
  Dialog,
  ElementHandle,
  launch,
  Page,
}                       from 'puppeteer'
import StateSwitch      from 'state-switch'
import { parseString }  from 'xml2js'

/* tslint:disable:no-var-requires */
const retryPromise  = require('retry-promise').default

import { log }        from '../config'
import Profile        from '../profile'
import Misc           from '../misc'
import {
  MediaData,
  MsgRawObj,
}                     from './schema'

export interface InjectResult {
  code:    number,
  message: string,
}

export interface BridgeOptions {
  head?   : boolean,
  profile : Profile,
}

declare const WechatyBro

export class Bridge extends EventEmitter {
  private browser : Browser
  private page    : Page
  private state   : StateSwitch

  constructor(
    public options: BridgeOptions,
  ) {
    super()
    log.verbose('PuppetWebBridge', 'constructor()')

    this.state = new StateSwitch('PuppetWebBridge', log)
  }

  public async init(): Promise<void> {
    log.verbose('PuppetWebBridge', 'init()')

    this.state.on('pending')
    try {
      this.browser = await this.initBrowser()
      log.verbose('PuppetWebBridge', 'init() initBrowser() done')

      this.on('load', this.onLoad.bind(this))

      const ready = new Promise(resolve => this.once('ready', resolve))
      this.page = await this.initPage(this.browser)
      await ready

      this.state.on(true)
      log.verbose('PuppetWebBridge', 'init() initPage() done')
    } catch (e) {
      log.error('PuppetWebBridge', 'init() exception: %s', e)
      this.state.off(true)

      try {
        if (this.page) {
          await this.page.close()
        }
        if (this.browser) {
          await this.browser.close()
        }
      } catch (e2) {
        log.error('PuppetWebBridge', 'init() exception %s, close page/browser exception %s', e, e2)
      }

      this.emit('error', e)
      throw e
    }
  }

  public async initBrowser(): Promise<Browser> {
    log.verbose('PuppetWebBridge', 'initBrowser()')

    const headless = this.options.head ? false : true
    const browser = await launch({
      headless,
      args: [
        '--audio-output-channels=0',
        '--disable-default-apps',
        '--disable-extensions',
        '--disable-translate',
        '--disable-gpu',
        '--disable-setuid-sandbox',
        '--disable-sync',
        '--hide-scrollbars',
        '--mute-audio',
        '--no-sandbox',
      ],
    })

    const version = await browser.version()
    log.verbose('PUppetWebBridge', 'initBrowser() version: %s', version)

    return browser
  }

  public async onDialog(dialog: Dialog) {
    log.warn('PuppetWebBridge', 'init() page.on(dialog) type:%s message:%s',
                                dialog.type, dialog.message())
    try {
      // XXX: Which ONE is better?
      await dialog.accept()
      // await dialog.dismiss()
    } catch (e) {
      log.error('PuppetWebBridge', 'init() dialog.dismiss() reject: %s', e)
    }
    this.emit('error', new Error(`${dialog.type}(${dialog.message()})`))
  }

  public async onLoad(page: Page): Promise<void> {
    log.verbose('PuppetWebBridge', 'initPage() on(load) %s', page.url())

    if (this.state.off()) {
      log.verbose('PuppetWebBridge', 'initPage() onLoad() OFF state detected. NOP')
      return // reject(new Error('onLoad() OFF state detected'))
    }

    try {
      const emitExist = await page.evaluate(() => {
        return typeof window['emit'] === 'function'
      })
      if (!emitExist) {
        await page.exposeFunction('emit', this.emit.bind(this))
      }

      await this.readyAngular(page)
      await this.inject(page)
      await this.clickSwitchAccount(page)

      this.emit('ready')

    } catch (e) {
      log.error('PuppetWebBridge', 'init() initPage() onLoad() exception: %s', e)
      await page.close()
      this.emit('error', e)
    }
  }

  public async initPage(browser: Browser): Promise<Page> {
    log.verbose('PuppetWebBridge', 'initPage()')

    // set this in time because the following callbacks
    // might be called before initPage() return.
    const page = this.page =  await browser.newPage()

    page.on('error',  e => this.emit('error', e))

    page.on('dialog', this.onDialog.bind(this))

    const cookieList = this.options.profile.get('cookies') as Cookie[]
    const url        = this.entryUrl(cookieList)

    log.verbose('PuppetWebBridge', 'initPage() before page.goto(url)')
    await page.goto(url) // Does this related to(?) the CI Error: exception: Navigation Timeout Exceeded: 30000ms exceeded
    log.verbose('PuppetWebBridge', 'initPage() after page.goto(url)')

    if (cookieList && cookieList.length) {
      await page.setCookie(...cookieList)
      log.silly('PuppetWebBridge', 'initPage() page.setCookie() %s cookies set back', cookieList.length)
    }

    page.on('load', () => this.emit('load', page))
    await page.reload() // reload page to make effect of the new cookie.

    return page
  }

  public async readyAngular(page: Page): Promise<void> {
    log.verbose('PuppetWebBridge', 'readyAngular()')

    try {
      await page.waitForFunction(`typeof window.angular !== 'undefined'`)
    } catch (e) {
      log.verbose('PuppetWebBridge', 'readyAngular() exception: %s', e)

      const blockedMessage = await this.testBlockedMessage()
      if (blockedMessage) {  // Wechat Account Blocked
        throw new Error(blockedMessage)
      } else {
        throw e
      }
    }
  }

  public async inject(page: Page): Promise<void> {
    log.verbose('PuppetWebBridge', 'inject()')

    const WECHATY_BRO_JS_FILE = path.join(
      __dirname,
      'wechaty-bro.js',
    )

    try {
      const sourceCode = fs.readFileSync(WECHATY_BRO_JS_FILE)
                            .toString()

      let retObj = await page.evaluate(sourceCode) as any as InjectResult

      if (retObj && /^(2|3)/.test(retObj.code.toString())) {
        // HTTP Code 2XX & 3XX
        log.silly('PuppetWebBridge', 'inject() eval(Wechaty) return code[%d] message[%s]',
                                      retObj.code, retObj.message)
      } else {  // HTTP Code 4XX & 5XX
        throw new Error('execute injectio error: ' + retObj.code + ', ' + retObj.message)
      }

      retObj = await this.proxyWechaty('init')
      if (retObj && /^(2|3)/.test(retObj.code.toString())) {
        // HTTP Code 2XX & 3XX
        log.silly('PuppetWebBridge', 'inject() Wechaty.init() return code[%d] message[%s]',
                                      retObj.code, retObj.message)
      } else {  // HTTP Code 4XX & 5XX
        throw new Error('execute proxyWechaty(init) error: ' + retObj.code + ', ' + retObj.message)
      }

      const SUCCESS_CIPHER = 'ding() OK!'
      const r = await this.ding(SUCCESS_CIPHER)
      if (r !== SUCCESS_CIPHER) {
        throw new Error('fail to get right return from call ding()')
      }
      log.silly('PuppetWebBridge', 'inject() ding success')

    } catch (e) {
      log.verbose('PuppetWebBridge', 'inject() exception: %s. stack: %s', e.message, e.stack)
      throw e
    }
  }

  public async logout(): Promise<any> {
    log.verbose('PuppetWebBridge', 'logout()')
    try {
      return await this.proxyWechaty('logout')
    } catch (e) {
      log.error('PuppetWebBridge', 'logout() exception: %s', e.message)
      throw e
    }
  }

  public async quit(): Promise<void> {
    log.verbose('PuppetWebBridge', 'quit()')
    this.state.off('pending')

    try {
      await this.page.close()
      log.silly('PuppetWebBridge', 'quit() page.close()-ed')
    } catch (e) {
      log.warn('PuppetWebBridge', 'quit() page.close() exception: %s', e)
    }

    try {
      await this.browser.close()
      log.silly('PuppetWebBridge', 'quit() browser.close()-ed')
    } catch (e) {
      log.warn('PuppetWebBridge', 'quit() browser.close() exception: %s', e)
    }

    this.state.off(true)
  }

  public async getUserName(): Promise<string> {
    log.verbose('PuppetWebBridge', 'getUserName()')

    try {
      const userName = await this.proxyWechaty('getUserName')
      return userName
    } catch (e) {
      log.error('PuppetWebBridge', 'getUserName() exception: %s', e.message)
      throw e
    }
  }

  public async contactRemark(contactId: string, remark: string|null): Promise<boolean> {
    try {
      return await this.proxyWechaty('contactRemark', contactId, remark)
    } catch (e) {
      log.verbose('PuppetWebBridge', 'contactRemark() exception: %s', e.message)
      // Issue #509 return false instead of throw when contact is not a friend.
      // throw e
      log.warn('PuppetWebBridge', 'contactRemark() does not work on contact is not a friend')
      return false
    }
  }

  public async contactFind(filterFunc: string): Promise<string[]> {
    try {
      return await this.proxyWechaty('contactFind', filterFunc)
    } catch (e) {
      log.error('PuppetWebBridge', 'contactFind() exception: %s', e.message)
      throw e
    }
  }

  public async roomFind(filterFunc: string): Promise<string[]> {
    try {
      return await this.proxyWechaty('roomFind', filterFunc)
    } catch (e) {
      log.error('PuppetWebBridge', 'roomFind() exception: %s', e.message)
      throw e
    }
  }

  public async roomDelMember(roomId, contactId): Promise<number> {
    if (!roomId || !contactId) {
      throw new Error('no roomId or contactId')
    }
    try {
      return await this.proxyWechaty('roomDelMember', roomId, contactId)
    } catch (e) {
      log.error('PuppetWebBridge', 'roomDelMember(%s, %s) exception: %s', roomId, contactId, e.message)
      throw e
    }
  }

  public async roomAddMember(roomId, contactId): Promise<number> {
    log.verbose('PuppetWebBridge', 'roomAddMember(%s, %s)', roomId, contactId)

    if (!roomId || !contactId) {
      throw new Error('no roomId or contactId')
    }
    try {
      return await this.proxyWechaty('roomAddMember', roomId, contactId)
    } catch (e) {
      log.error('PuppetWebBridge', 'roomAddMember(%s, %s) exception: %s', roomId, contactId, e.message)
      throw e
    }
  }

  public async roomModTopic(roomId, topic): Promise<string> {
    if (!roomId) {
      throw new Error('no roomId')
    }
    try {
      await this.proxyWechaty('roomModTopic', roomId, topic)
      return topic
    } catch (e) {
      log.error('PuppetWebBridge', 'roomModTopic(%s, %s) exception: %s', roomId, topic, e.message)
      throw e
    }
  }

  public async roomCreate(contactIdList: string[], topic?: string): Promise<string> {
    if (!contactIdList || !Array.isArray(contactIdList)) {
      throw new Error('no valid contactIdList')
    }

    try {
      const roomId = await this.proxyWechaty('roomCreate', contactIdList, topic)
      if (typeof roomId === 'object') {
        // It is a Error Object send back by callback in browser(WechatyBro)
        throw roomId
      }
      return roomId
    } catch (e) {
      log.error('PuppetWebBridge', 'roomCreate(%s) exception: %s', contactIdList, e.message)
      throw e
    }
  }

  public async verifyUserRequest(contactId, hello): Promise<boolean> {
    log.verbose('PuppetWebBridge', 'verifyUserRequest(%s, %s)', contactId, hello)

    if (!contactId) {
      throw new Error('no valid contactId')
    }
    try {
      return await this.proxyWechaty('verifyUserRequest', contactId, hello)
    } catch (e) {
      log.error('PuppetWebBridge', 'verifyUserRequest(%s, %s) exception: %s', contactId, hello, e.message)
      throw e
    }
  }

  public async verifyUserOk(contactId, ticket): Promise<boolean> {
    log.verbose('PuppetWebBridge', 'verifyUserOk(%s, %s)', contactId, ticket)

    if (!contactId || !ticket) {
      throw new Error('no valid contactId or ticket')
    }
    try {
      return await this.proxyWechaty('verifyUserOk', contactId, ticket)
    } catch (e) {
      log.error('PuppetWebBridge', 'verifyUserOk(%s, %s) exception: %s', contactId, ticket, e.message)
      throw e
    }
  }

  public async send(toUserName: string, content: string): Promise<boolean> {
    if (!toUserName) {
      throw new Error('UserName not found')
    }
    if (!content) {
      throw new Error('cannot say nothing')
    }

    try {
      return await this.proxyWechaty('send', toUserName, content)
    } catch (e) {
      log.error('PuppetWebBridge', 'send() exception: %s', e.message)
      throw e
    }
  }

  public async getMsgImg(id): Promise<string> {
    log.verbose('PuppetWebBridge', 'getMsgImg(%s)', id)

    try {
      return await this.proxyWechaty('getMsgImg', id)
    } catch (e) {
      log.silly('PuppetWebBridge', 'proxyWechaty(getMsgImg, %d) exception: %s', id, e.message)
      throw e
    }
  }

  public async getMsgEmoticon(id): Promise<string> {
    log.verbose('PuppetWebBridge', 'getMsgEmoticon(%s)', id)

    try {
      return await this.proxyWechaty('getMsgEmoticon', id)
    } catch (e) {
      log.silly('PuppetWebBridge', 'proxyWechaty(getMsgEmoticon, %d) exception: %s', id, e.message)
      throw e
    }
  }

  public async getMsgVideo(id): Promise<string> {
    log.verbose('PuppetWebBridge', 'getMsgVideo(%s)', id)

    try {
      return await this.proxyWechaty('getMsgVideo', id)
    } catch (e) {
      log.silly('PuppetWebBridge', 'proxyWechaty(getMsgVideo, %d) exception: %s', id, e.message)
      throw e
    }
  }

  public async getMsgVoice(id): Promise<string> {
    log.verbose('PuppetWebBridge', 'getMsgVoice(%s)', id)

    try {
      return await this.proxyWechaty('getMsgVoice', id)
    } catch (e) {
      log.silly('PuppetWebBridge', 'proxyWechaty(getMsgVoice, %d) exception: %s', id, e.message)
      throw e
    }
  }

  public async getMsgPublicLinkImg(id): Promise<string> {
    log.verbose('PuppetWebBridge', 'getMsgPublicLinkImg(%s)', id)

    try {
      return await this.proxyWechaty('getMsgPublicLinkImg', id)
    } catch (e) {
      log.silly('PuppetWebBridge', 'proxyWechaty(getMsgPublicLinkImg, %d) exception: %s', id, e.message)
      throw e
    }
  }

  public async getContact(id: string): Promise<object> {
    if (id !== id) { // NaN
      const err = new Error('NaN! where does it come from?')
      log.error('PuppetWebBridge', 'getContact(NaN): %s', err)
      throw err
    }
    const max = 35
    const backoff = 500

    // max = (2*totalTime/backoff) ^ (1/2)
    // timeout = 11,250 for {max: 15, backoff: 100}
    // timeout = 45,000 for {max: 30, backoff: 100}
    // timeout = 30,6250 for {max: 35, backoff: 500}
    const timeout = max * (backoff * max) / 2

    try {
      return await retryPromise({ max: max, backoff: backoff }, async attempt => {
        log.silly('PuppetWebBridge', 'getContact() retryPromise: attampt %s/%s time for timeout %s',
                                      attempt, max, timeout)
        try {
          const r = await this.proxyWechaty('getContact', id)
          if (r) {
            return r
          }
          throw new Error('got empty return value at attempt: ' + attempt)
        } catch (e) {
          log.silly('PuppetWebBridge', 'proxyWechaty(getContact, %s) exception: %s', id, e.message)
          throw e
        }
      })
    } catch (e) {
      log.warn('PuppetWebBridge', 'retryPromise() getContact() finally FAIL: %s', e.message)
      throw e
    }
    /////////////////////////////////
  }

  public async getBaseRequest(): Promise<string> {
    log.verbose('PuppetWebBridge', 'getBaseRequest()')

    try {
      return await this.proxyWechaty('getBaseRequest')
    } catch (e) {
      log.silly('PuppetWebBridge', 'proxyWechaty(getBaseRequest) exception: %s', e.message)
      throw e
    }
  }

  public async getPassticket(): Promise<string> {
    log.verbose('PuppetWebBridge', 'getPassticket()')

    try {
      return await this.proxyWechaty('getPassticket')
    } catch (e) {
      log.silly('PuppetWebBridge', 'proxyWechaty(getPassticket) exception: %s', e.message)
      throw e
    }
  }

  public async getCheckUploadUrl(): Promise<string> {
    log.verbose('PuppetWebBridge', 'getCheckUploadUrl()')

    try {
      return await this.proxyWechaty('getCheckUploadUrl')
    } catch (e) {
      log.silly('PuppetWebBridge', 'proxyWechaty(getCheckUploadUrl) exception: %s', e.message)
      throw e
    }
  }

  public async getUploadMediaUrl(): Promise<string> {
    log.verbose('PuppetWebBridge', 'getUploadMediaUrl()')

    try {
      return await this.proxyWechaty('getUploadMediaUrl')
    } catch (e) {
      log.silly('PuppetWebBridge', 'proxyWechaty(getUploadMediaUrl) exception: %s', e.message)
      throw e
    }
  }

  public async sendMedia(mediaData: MediaData): Promise<boolean> {
    if (!mediaData.ToUserName) {
      throw new Error('UserName not found')
    }
    if (!mediaData.MediaId) {
      throw new Error('cannot say nothing')
    }
    try {
      return await this.proxyWechaty('sendMedia', mediaData)
    } catch (e) {
      log.error('PuppetWebBridge', 'sendMedia() exception: %s', e.message)
      throw e
    }
  }

  public async forward(baseData: MsgRawObj, patchData: MsgRawObj): Promise<boolean> {
    if (!baseData.ToUserName) {
      throw new Error('UserName not found')
    }
    if (!patchData.MMActualContent && !patchData.MMSendContent && !patchData.Content) {
      throw new Error('cannot say nothing')
    }
    try {
      return await this.proxyWechaty('forward', baseData, patchData)
    } catch (e) {
      log.error('PuppetWebBridge', 'forward() exception: %s', e.message)
      throw e
    }
  }

  /**
   * Proxy Call to Wechaty in Bridge
   */
  public async proxyWechaty(
    wechatyFunc : string,
    ...args     : any[],
  ): Promise<any> {
    log.silly('PuppetWebBridge', 'proxyWechaty(%s%s)',
                                  wechatyFunc,
                                  args.length
                                  ? ' , ' + args.join(', ')
                                  : '',
              )

    try {
      const noWechaty = await this.page.evaluate(() => {
        return typeof WechatyBro === 'undefined'
      })
      if (noWechaty) {
        const e = new Error('there is no WechatyBro in browser(yet)')
        throw e
      }
    } catch (e) {
      log.warn('PuppetWebBridge', 'proxyWechaty() noWechaty exception: %s', e)
      throw e
    }

    const argsEncoded = new Buffer(
      encodeURIComponent(
        JSON.stringify(args),
      ),
    ).toString('base64')
    // see: http://blog.sqrtthree.com/2015/08/29/utf8-to-b64/
    const argsDecoded = `JSON.parse(decodeURIComponent(window.atob('${argsEncoded}')))`

    const wechatyScript = `
      WechatyBro
        .${wechatyFunc}
        .apply(
          undefined,
          ${argsDecoded},
        )
    `.replace(/[\n\s]+/, ' ')
    // log.silly('PuppetWebBridge', 'proxyWechaty(%s, ...args) %s', wechatyFunc, wechatyScript)
    // console.log('proxyWechaty wechatyFunc args[0]: ')
    // console.log(args[0])

    try {
      const ret = await this.page.evaluate(wechatyScript)
      return ret
    } catch (e) {
      log.verbose('PuppetWebBridge', 'proxyWechaty(%s, %s) ', wechatyFunc, args.join(', '))
      log.warn('PuppetWebBridge', 'proxyWechaty() exception: %s', e.message)
      throw e
    }
  }

  public async ding(data): Promise<any> {
    log.verbose('PuppetWebBridge', 'ding(%s)', data)

    try {
      return await this.proxyWechaty('ding', data)
    } catch (e) {
      log.error('PuppetWebBridge', 'ding(%s) exception: %s', data, e.message)
      throw e
    }
  }

  public preHtmlToXml(text: string): string {
    log.verbose('PuppetWebBridge', 'preHtmlToXml()')

    const preRegex = /^<pre[^>]*>([^<]+)<\/pre>$/i
    const matches = text.match(preRegex)
    if (!matches) {
      return text
    }
    return Misc.unescapeHtml(matches[1])
  }

  public async innerHTML(): Promise<string> {
    const html = await this.evaluate(() => {
      return document.body.innerHTML
    })
    return html
  }

  /**
   * Throw if there's a blocked message
   */
  public async testBlockedMessage(text?: string): Promise<string | false> {
    if (!text) {
      text = await this.innerHTML()
    }
    if (!text) {
      throw new Error('testBlockedMessage() no text found!')
    }

    const textSnip = text.substr(0, 50).replace(/\n/, '')
    log.verbose('PuppetWebBridge', 'testBlockedMessage(%s)',
                                  textSnip)

    // see unit test for detail
    const tryXmlText = this.preHtmlToXml(text)

    interface BlockedMessage {
      error?: {
        ret     : number,
        message : string,
      }
    }

    return new Promise<string | false>((resolve, reject) => {
      parseString(tryXmlText, { explicitArray: false }, (err, obj: BlockedMessage) => {
        if (err) {  // HTML can not be parsed to JSON
          return resolve(false)
        }
        if (!obj) {
          // FIXME: when will this happen?
          log.warn('PuppetWebBridge', 'testBlockedMessage() parseString(%s) return empty obj', textSnip)
          return resolve(false)
        }
        if (!obj.error) {
          return resolve(false)
        }
        const ret     = +obj.error.ret
        const message =  obj.error.message

        log.warn('PuppetWebBridge', 'testBlockedMessage() error.ret=%s', ret)

        if (ret === 1203) {
          // <error>
          // <ret>1203</ret>
          // <message>当前登录环境异常。为了你的帐号安全，暂时不能登录web微信。你可以通过手机客户端或者windows微信登录。</message>
          // </error>
          return resolve(message)
        }
        return resolve(message) // other error message
      })
    })
  }

  public async clickSwitchAccount(page: Page): Promise<boolean> {
    log.verbose('PuppetWebBridge', 'clickSwitchAccount()')

    // TODO: use page.$x() (with puppeteer v1.1 or above) to replace DIY version of listXpath() instead.
    // See: https://github.com/GoogleChrome/puppeteer/blob/v1.1.0/docs/api.md#pagexexpression

    // https://github.com/GoogleChrome/puppeteer/issues/537#issuecomment-334918553
    async function listXpath(thePage: Page, xpath: string): Promise<ElementHandle[]> {
      log.verbose('PuppetWebBridge', 'clickSwitchAccount() listXpath()')

      try {
        const nodeHandleList = await (thePage as any).evaluateHandle(xpathInner => {
          const nodeList: Node[] = []
          const query = document.evaluate(xpathInner, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null)
          for (let i = 0, length = query.snapshotLength; i < length; ++i) {
            nodeList.push(query.snapshotItem(i))
          }
          return nodeList
        }, xpath)
        const properties = await nodeHandleList.getProperties()

        const elementHandleList:  ElementHandle[] = []
        const releasePromises:    Promise<void>[] = []

        for (const property of properties.values()) {
          const element = property.asElement()
          if (element)
            elementHandleList.push(element)
          else
            releasePromises.push(property.dispose())
        }
        await Promise.all(releasePromises)
        return elementHandleList
      } catch (e) {
        log.verbose('PuppetWebBridge', 'clickSwitchAccount() listXpath() exception: %s', e)
        return []
      }
    }

    const XPATH_SELECTOR = `//div[contains(@class,'association') and contains(@class,'show')]/a[@ng-click='qrcodeLogin()']`
    try {
      const [button] = await listXpath(page, XPATH_SELECTOR)
      if (button) {
        await button.click()
        log.silly('PuppetWebBridge', 'clickSwitchAccount() clicked!')
        return true

      } else {
        // log.silly('PuppetWebBridge', 'clickSwitchAccount() button not found')
        return false
      }

    } catch (e) {
      log.silly('PuppetWebBridge', 'clickSwitchAccount() exception: %s', e)
      throw e
    }
  }

  public async hostname(): Promise<string | null> {
    log.verbose('PuppetWebBridge', 'hostname()')
    try {
      const hostname = await this.page.evaluate(() => location.hostname) as string
      log.silly('PuppetWebBridge', 'hostname() got %s', hostname)
      return hostname
    } catch (e) {
      log.error('PuppetWebBridge', 'hostname() exception: %s', e)
      this.emit('error', e)
      return null
    }
  }

  public async cookies(cookieList: Cookie[]): Promise<void>
  public async cookies(): Promise<Cookie[]>

  public async cookies(cookieList?: Cookie[]): Promise<void | Cookie[]> {
    if (cookieList) {
      try {
        await this.page.setCookie(...cookieList)
      } catch (e) {
        log.error('PuppetWebBridge', 'cookies(%s) reject: %s', cookieList, e)
        this.emit('error', e)
      }
      return
    } else {
      // FIXME: puppeteer typing bug
      cookieList = await this.page.cookies() as any as Cookie[]
      return cookieList
    }
  }

  /**
   * name
   */
  public entryUrl(cookieList?: Cookie[]): string {
    log.verbose('PuppetWebBridge', 'cookieDomain(%s)', cookieList)

    const DEFAULT_URL = 'https://wx.qq.com'

    if (!cookieList || cookieList.length === 0) {
      log.silly('PuppetWebBridge', 'cookieDomain() no cookie, return default %s', DEFAULT_URL)
      return DEFAULT_URL
    }

    const wxCookieList = cookieList.filter(c => /^webwx_auth_ticket|webwxuvid$/.test(c.name))
    if (!wxCookieList.length) {
      log.silly('PuppetWebBridge', 'cookieDomain() no valid cookie, return default hostname')
      return DEFAULT_URL
    }
    let domain = wxCookieList[0].domain
    if (!domain) {
      log.silly('PuppetWebBridge', 'cookieDomain() no valid domain in cookies, return default hostname')
      return DEFAULT_URL
    }

    domain = domain.slice(1)
    if (domain === 'wechat.com') {
      domain = 'web.wechat.com'
    }

    let url
    if (/^http/.test(url)) {
      url = domain
    } else {
      // Protocol error (Page.navigate): Cannot navigate to invalid URL undefined
      url = `https://${domain}`
    }
    log.silly('PuppetWebBridge', 'cookieDomain() got %s', url)

    return url
  }

  public async reload(): Promise<void> {
    log.verbose('PuppetWebBridge', 'reload()')
    await this.page.reload()
    return
  }

  public async evaluate(fn: () => any, ...args: any[]): Promise<any> {
    log.silly('PuppetWebBridge', 'evaluate()')
    try {
      return await this.page.evaluate(fn, ...args)
    } catch (e) {
      log.error('PuppetWebBridge', 'evaluate() exception: %s', e)
      this.emit('error', e)
      return null
    }
  }
}

export {
  Cookie,
}
export default Bridge
