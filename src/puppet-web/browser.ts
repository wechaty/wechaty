/**
 * Wechat for Bot. and for human who can talk with bot/robot
 *
 * Interface for puppet
 *
 * Licenst: ISC
 * https://github.com/zixia/wechaty
 *
 */
/* tslint:disable:no-var-requires */
const arrify = require('arrify')
// import arrify = require('arrify')

import * as fs from 'fs'
import { EventEmitter } from 'events'
import {
  Builder
  , Capabilities
  , WebDriver
} from 'selenium-webdriver'

/* tslint:disable:no-var-requires */
const retryPromise  = require('retry-promise').default // https://github.com/olalonde/retry-promise

import log    from'../brolog-env'

import Config from'../config'

export type BrowserSetting = {
  head?:        string
  sessionFile?: string
}

export type DriverCookie = {
  [index: string]: string | number | boolean
  name: string
  value: string
  path: string
  domain: string
  secure: boolean
  expiry: number
}

class Browser extends EventEmitter {

  private _targetState: string
  private _currentState: string

  public _driver: WebDriver | null

  constructor(private setting: BrowserSetting = {}) {
    super()
    log.verbose('PuppetWebBrowser', 'constructor() with head(%s) sessionFile(%s)', setting.head, setting.sessionFile)

    setting.head = setting.head || process.env['WECHATY_HEAD'] || Config.DEFAULT_HEAD

    this.targetState('close')
    this.currentState('close')
  }

  // targetState : 'open' | 'close'
  public targetState(newState?: string) {
    if (newState) {
      log.verbose('PuppetWebBrowser', 'targetState(%s)', newState)
      this._targetState = newState
    }
    return this._targetState
  }

  // currentState : 'opening' | 'open' | 'closing' | 'close'
  public currentState(newState?: string) {
    if (newState) {
      log.verbose('PuppetWebBrowser', 'currentState(%s)', newState)
      this._currentState = newState
    }
    return this._currentState
  }

  public toString() { return `Browser({head:${this.setting.head})` }

  public async init(): Promise<Browser> {
    this.targetState('open')
    this.currentState('opening')

    // fastUrl is used to open in browser for we can set cookies.
    // backup: 'https://res.wx.qq.com/zh_CN/htmledition/v2/images/icon/ico_loading28a2f7.gif'
    const fastUrl = 'https://wx.qq.com/zh_CN/htmledition/v2/images/webwxgeticon.jpg'

    // return co.call(this, function* () {
    try {
      await this.initDriver()
      // this.live = true

      await this.open(fastUrl)
      await this.loadSession()
                .catch(e => { // fail safe
                  log.verbose('PuppetWeb', 'browser.loadSession(%s) exception: %s', this.setting.sessionFile, e && e.message || e)
                })
      await this.open()
      /**
       * when open url, there could happen a quit() call.
       * should check here: if we are in `close` target state, we should clean up
       */
      if (this.targetState() !== 'open') {
        throw new Error('init() finished but found targetState() is close. quit().')
      }

      this.currentState('open')
      return this

    } catch (e) {
      log.error('PuppetWebBrowser', 'init() exception: %s', e.message)

      await this.quit()

      throw e
    }
  }

  public async open(url: string = 'https://wx.qq.com'): Promise<void> {
    log.verbose('PuppetWebBrowser', `open(${url})`)

    // TODO: set a timer to guard driver.get timeout, then retry 3 times 201607
    try {
      await this.driver().get(url)
    } catch (e) {
      log.error('PuppetWebBrowser', 'open() exception: %s', e.message)
      this.dead(e.message)
      throw e
    }
  }

  public async initDriver(): Promise<WebDriver> {
    log.verbose('PuppetWebBrowser', 'initDriver(head: %s)', this.setting.head)

    let driver: WebDriver
    const head = <string>this.setting.head

    switch (true) {
      case !head: // no head default to phantomjs
      case /phantomjs/i.test(head):
      case /phantom/i.test(head):
        driver = this.getPhantomJsDriver()
        break

      case /firefox/i.test(head):
        driver = new Builder()
        .setAlertBehavior('ignore')
        .forBrowser('firefox')
        .build()
        break

      case /chrome/i.test(head):
        driver = this.getChromeDriver()
        break

      default: // unsupported browser head
        throw new Error('unsupported head: ' + head)
    }

    driver.manage()
          .timeouts()
          .setScriptTimeout(10000)

    return this.driver(driver)
  }

  public driver(): WebDriver
  public driver(empty: null): void
  public driver(newDriver: WebDriver): WebDriver

  public driver(newDriver?: WebDriver | null): WebDriver | void {
    if (typeof newDriver !== 'undefined') {
      if (newDriver) {
        this._driver = newDriver
        return this._driver
      } else {
        this._driver = newDriver
        return
      }
    }

    if (!this._driver || !this._driver.getSession()) {
      const e = new Error('no driver session')
      log.warn('PuppetWebBrowser', 'driver() exception: %s', e.message)
      this._driver = null
      throw e
    }

    return this._driver
  }

  public async refresh(): Promise<any> {
    log.verbose('PuppetWebBrowser', 'refresh()')
    return await this.driver()
                      .navigate()
                      .refresh()
  }

  private getChromeDriver(): WebDriver {
    log.verbose('PuppetWebBrowser', 'getChromeDriver()')

    const options = {
      args: ['--no-sandbox']  // issue #26 for run inside docker
      , binary: ''  // XXX is it ok?
    }
    if (Config.isDocker) {
      options.binary = Config.CMD_CHROMIUM
    }

    const customChrome = Capabilities.chrome()
                                    .set('chromeOptions', options)

    return new Builder()
                .setAlertBehavior('ignore')
                .forBrowser('chrome')
                .withCapabilities(customChrome)
                .build()
  }

  private getPhantomJsDriver(): WebDriver {
    // setup custom phantomJS capability https://github.com/SeleniumHQ/selenium/issues/2069
    const phantomjsExe = require('phantomjs-prebuilt').path
    // const phantomjsExe = require('phantomjs2').path

    const phantomjsArgs = [
      '--load-images=false'
      , '--ignore-ssl-errors=true'  // this help socket.io connect with localhost
      , '--web-security=false'      // https://github.com/ariya/phantomjs/issues/12440#issuecomment-52155299
      , '--ssl-protocol=any'        // http://stackoverflow.com/a/26503588/1123955
      // , '--ssl-protocol=TLSv1'    // https://github.com/ariya/phantomjs/issues/11239#issuecomment-42362211

      // issue: Secure WebSocket(wss) do not work with Self Signed Certificate in PhantomJS #12
      // , '--ssl-certificates-path=D:\\cygwin64\\home\\zixia\\git\\wechaty' // http://stackoverflow.com/a/32690349/1123955
      // , '--ssl-client-certificate-file=cert.pem' //
    ]

    if (Config.debug) {
      phantomjsArgs.push('--remote-debugger-port=8080') // XXX: be careful when in production env.
      phantomjsArgs.push('--webdriver-loglevel=DEBUG')
      // phantomjsArgs.push('--webdriver-logfile=webdriver.debug.log')
    } else {
      if (log && log.level() === 'silent') {
        phantomjsArgs.push('--webdriver-loglevel=NONE')
      } else {
        phantomjsArgs.push('--webdriver-loglevel=ERROR')
      }
    }

    const customPhantom = Capabilities.phantomjs()
                                      .setAlertBehavior('ignore')
                                      .set('phantomjs.binary.path', phantomjsExe)
                                      .set('phantomjs.cli.args', phantomjsArgs)

    log.silly('PuppetWebBrowser', 'phantomjs binary: ' + phantomjsExe)
    log.silly('PuppetWebBrowser', 'phantomjs args: ' + phantomjsArgs.join(' '))

    const driver = new Builder()
                        .withCapabilities(customPhantom)
                        .build()

    /* tslint:disable:jsdoc-format */
		/**
		 *  FIXME: ISSUE #21 - https://github.com/zixia/wechaty/issues/21
	 	 *
 	 	 *	http://phantomjs.org/api/webpage/handler/on-resource-requested.html
		 *	http://stackoverflow.com/a/29544970/1123955
		 *  https://github.com/geeeeeeeeek/electronic-wechat/pull/319
		 *
		 */
    //   	driver.executePhantomJS(`
    // this.onResourceRequested = function(request, net) {
    //    console.log('REQUEST ' + request.url);
    //    blockRe = /wx\.qq\.com\/\?t=v2\/fake/i
    //    if (blockRe.test(request.url)) {
    //        console.log('Abort ' + request.url);
    //        net.abort();
    //    }
    // }
    // `)

    // https://github.com/detro/ghostdriver/blob/f976007a431e634a3ca981eea743a2686ebed38e/src/session.js#L233
    // driver.manage().timeouts().pageLoadTimeout(2000)

    return driver
  }

  public async restart(): Promise<void> {
    log.verbose('PuppetWebBrowser', 'restart()')

    await this.quit()

    if (this.currentState() === 'opening') {
      log.warn('PuppetWebBrowser', 'restart() found currentState === opening')
      return
    }

    await this.init()
  }

  public async quit(): Promise<any> {
    log.verbose('PuppetWebBrowser', 'quit()')

    // this.targetState('close')
    this.currentState('closing')

    try {
      await this.driver().close() // http://stackoverflow.com/a/32341885/1123955
      log.silly('PuppetWebBrowser', 'quit() driver.close()-ed')
      await this.driver().quit()
      log.silly('PuppetWebBrowser', 'quit() driver.quit()-ed')
      this.driver(null)
      log.silly('PuppetWebBrowser', 'quit() this.driver = null')

      /**
       *
       * if we use AVA to test, then this.clean will cause problems
       * because there will be more than one instance of browser with the same nodejs process id
       *
       */
      await this.clean()
      log.silly('PuppetWebBrowser', 'quit() co() end')

    } catch (e) {
      // console.log(e)
      // log.warn('PuppetWebBrowser', 'err: %s %s %s %s', e.code, e.errno, e.syscall, e.message)
      log.warn('PuppetWebBrowser', 'quit() exception: %s', e.message)

      const crashMsgs = [
        'ECONNREFUSED'
        , 'WebDriverError: .* not reachable'
        , 'NoSuchWindowError: no such window: target window already closed'
      ]
      const crashRegex = new RegExp(crashMsgs.join('|'), 'i')

      if (crashRegex.test(e.message)) { log.warn('PuppetWebBrowser', 'driver.quit() browser crashed') }
      else                            { log.warn('PuppetWebBrowser', 'driver.quit() exception: %s', e.message) }

      /* fail safe */
    }

    this.currentState('close')

    return
  }

  public clean(): Promise<any> {
    const max = 30
    const backoff = 100

    /**
     * max = (2*totalTime/backoff) ^ (1/2)
     * timeout = 45000 for {max: 30, backoff: 100}
     * timeout = 11250 for {max: 15, backoff: 100}
     */
    const timeout = max * (backoff * max) / 2

    return retryPromise({ max: max, backoff: backoff }, attempt => {
      log.silly('PuppetWebBrowser', 'clean() retryPromise: attempt %s time for timeout %s'
        , attempt,  timeout)

      return new Promise((resolve, reject) => {
        this.getBrowserPids()
        .then(pids => {
          if (pids.length === 0) {
            log.verbose('PuppetWebBrowser', 'clean() retryPromise() resolved')
            resolve('clean() browser process not found, at attemp#' + attempt)
          } else {
            reject(new Error('clean() found browser process, not clean, dirty'))
          }
        })
        .catch(e => reject(e))
      })
    })
    .catch(e => {
      log.error('PuppetWebBrowser', 'retryPromise failed: %s', e.message)
      throw e
    })
  }

  public getBrowserPids(): Promise<string[]> {
    log.silly('PuppetWebBrowser', 'getBrowserPids()')

    const head = this.setting.head as string

    return new Promise((resolve, reject) => {
      require('ps-tree')(process.pid, (err, children) => {
        if (err) {
          reject(err)
          return
        }
        let browserRe

        switch (true) {
          case !head: // no head default to phantomjs
          case /phantomjs/i.test(head):
          case /phantom/i.test(head):
            browserRe = 'phantomjs'
            break

          case !!(head): // head default to chrome
          case /chrome/i.test(head):
            browserRe = 'chrome(?!driver)|chromium'
            break

          default:
            log.warn('PuppetWebBrowser', 'getBrowserPids() for unsupported head: %s', head)
            browserRe = head
        }

        let matchRegex = new RegExp(browserRe, 'i')
        const pids: string[] = children.filter(child => {
          log.silly('PuppetWebBrowser', 'getBrowserPids() child: %s', JSON.stringify(child))
          // https://github.com/indexzero/ps-tree/issues/18
          return matchRegex.test('' + child.COMMAND + child.COMM)
        }).map(child => child.PID)

        resolve(pids)
        return
      })
    })
  }

  /**
   * only wrap addCookies for convinience
   *
   * use this.driver().manage() to call other functions like:
   * deleteCookie / getCookie / getCookies
   */
  // TypeScript Overloading: http://stackoverflow.com/a/21385587/1123955
  public addCookies(cookies:  DriverCookie[]): Promise<any[]>
  public addCookies(cookie:   DriverCookie): Promise<any>

  public async addCookies(cookie: DriverCookie|DriverCookie[]): Promise<any|any[]> {
    if (this.dead()) { return Promise.reject(new Error('addCookies() - browser dead'))}

    if (Array.isArray(cookie)) {
      return cookie.map(c => {
        return this.addCookies(c)
      })
    }
    /**
     * convert expiry from seconds to milliseconds. https://github.com/SeleniumHQ/selenium/issues/2245
     * with selenium-webdriver v2.53.2
     * NOTICE: the lastest branch of selenium-webdriver for js has changed the interface of addCookie:
     * https://github.com/SeleniumHQ/selenium/commit/02f407976ca1d516826990f11aca7de3c16ba576
     */
    // if (cookie.expiry) { cookie.expiry = cookie.expiry * 1000 /* XXX: be aware of new version of webdriver */}

    log.silly('PuppetWebBrowser', 'addCookies(%s)', JSON.stringify(cookie))

    let ret
    // return new Promise((resolve, reject) => {
    try {
      ret = await (this.driver().manage() as any).addCookie(cookie)
                  // this is old webdriver format
                  // .addCookie(cookie.name, cookie.value, cookie.path
                  //   , cookie.domain, cookie.secure, cookie.expiry)
                  // this is new webdriver format
    } catch (e) {
      log.warn('PuppetWebBrowser', 'addCookies() exception: %s', e.message)
      throw e
    }

    return ret
  }

  public async execute(script, ...args): Promise<any> {
    log.silly('PuppetWebBrowser', 'Browser.execute("%s")'
                                , (
                                    script.slice(0, 80)
                                          .replace(/[\n\s]+/g, ' ')
                                    + (script.length > 80 ? ' ... ' : '')
                                )
            )
    // log.verbose('PuppetWebBrowser', `Browser.execute() driver.getSession: %s`, util.inspect(this.driver().getSession()))
    if (this.dead()) { throw new Error('browser dead') }

    let ret
    try {
      ret = await this.driver().executeScript.apply(this.driver(), arguments)
    } catch (e) {
      // this.dead(e)
      log.warn('PuppetWebBrowser', 'execute() exception: %s', e.message.substr(0, 99))
      throw e
    }
    return ret
  }

  public async executeAsync(script, ...args): Promise<any> {
    log.silly('PuppetWebBrowser', 'Browser.executeAsync(%s)', script.slice(0, 80))
    if (this.dead()) { throw new Error('browser dead') }

    let ret
    try {
      ret = await this.driver().executeAsyncScript.apply(this.driver(), arguments)
    } catch (e) {
      // this.dead(e)
      log.warn('PuppetWebBrowser', 'executeAsync() exception: %s', e.message.slice(0, 99))
      throw e
    }
    return ret
  }

  /**
   *
   * check whether browser is full functional
   *
   */
  public async readyLive(): Promise<boolean> {
    log.verbose('PuppetWebBrowser', 'readyLive()')

    if (this.dead()) {
      log.silly('PuppetWebBrowser', 'readyLive() dead() is true')
      return false
    }

    let two

    try {
      two = await this.execute('return 1+1')
    } catch (e) {
      two = e && e.message
    }

    if (two === 2) {
      return true // browser ok, living
    }

    const errMsg = 'found dead browser coz 1+1 = ' + two + ' (not 2)'
    log.warn('PuppetWebBrowser', 'readyLive() %s', errMsg)
    this.dead(errMsg)
    return false // browser not ok, dead
  }

  public dead(forceReason?: string): boolean {
    if (forceReason) {
      log.verbose('PuppetWebBrowser', 'dead(forceReason: %s)', forceReason)
    } else {
      log.silly('PuppetWebBrowser', 'dead() checking ... ')
    }

    let msg
    let dead = false

    if (forceReason) {
      dead = true
      msg = forceReason
    } else if (this.targetState() !== 'open') {
      dead = true
      msg = 'targetState not open'
    } else if (!this.driver()) {
      dead = true
      msg = 'no driver or session'
    }

    if (dead) {
      log.warn('PuppetWebBrowser', 'dead() because %s', msg)
      this.quit()

      // must use nextTick here, or promise will hang... 2016/6/10
      setImmediate(_ => {
        log.verbose('PuppetWebBrowser', 'dead() emit a `dead` event because %s', msg)
        this.emit('dead', msg)
      })
    }
    return dead
  }

  public async checkSession(): Promise<DriverCookie[]> {
    // just check cookies, no file operation
    log.verbose('PuppetWebBrowser', 'checkSession()')

    if (this.dead()) { Promise.reject(new Error('checkSession() - browser dead'))}

    // return new Promise((resolve, reject) => {
    try {
      // `as any as DriverCookie` because selenium-webdriver @types is outdated with 2.x, where we r using 3.0
      const cookies = await this.driver().manage().getCookies() as any as DriverCookie[]
      log.silly('PuppetWebBrowser', 'checkSession %s', cookies.map(c => c.name).join(','))
      return cookies
    } catch (e) {
      log.error('PuppetWebBrowser', 'checkSession() getCookies() exception: %s', e && e.message || e)
      throw e
    }
  }

  public cleanSession() {
    log.verbose('PuppetWebBrowser', `cleanSession(${this.setting.sessionFile})`)
    if (!this.setting.sessionFile) {
      return Promise.reject(new Error('cleanSession() no session'))
    }

    if (this.dead())  { return Promise.reject(new Error('cleanSession() - browser dead'))}

    const filename = this.setting.sessionFile
    return new Promise((resolve, reject) => {
      fs.unlink(filename, err => {
        if (err && err.code !== 'ENOENT') {
          log.silly('PuppetWebBrowser', 'cleanSession() unlink session file %s fail: %s', filename, err.message)
        }
        resolve()
      })
    })
  }

  public async saveSession(): Promise<DriverCookie[]> {
    log.silly('PuppetWebBrowser', `saveSession(${this.setting.sessionFile})`)
    if (!this.setting.sessionFile) {
      throw new Error('saveSession() no session')
    } else if (this.dead()) {
      throw new Error('saveSession() - browser dead')
    }

    const filename = this.setting.sessionFile

    function cookieFilter(cookies: DriverCookie[]) {
      const skipNames = [
        'ChromeDriver'
        , 'MM_WX_SOUND_STATE'
        , 'MM_WX_NOTIFY_STATE'
      ]
      const skipNamesRegex = new RegExp(skipNames.join('|'), 'i')
      return cookies.filter(c => {
        if (skipNamesRegex.test(c.name)) { return false }
        // else if (!/wx\.qq\.com/i.test(c.domain))  { return false }
        else                             { return true }
      })
    }

    try {
    // return new Promise((resolve, reject) => {
      // `as any as DriverCookie` because selenium-webdriver @types is outdated with 2.x, where we r using 3.0
      let cookies: DriverCookie[] = await this.driver().manage().getCookies() as any as DriverCookie[]
      cookies = cookieFilter(cookies)
      // .then(cookies => {
        // log.silly('PuppetWeb', 'saving %d cookies for session: %s', cookies.length
        //   , util.inspect(cookies.map(c => { return {name: c.name /*, value: c.value, expiresType: typeof c.expires, expires: c.expires*/} })))
      log.silly('PuppetWebBrowser', 'saving %d cookies for session: %s', cookies.length, cookies.map(c => c.name).join(','))

      const jsonStr = JSON.stringify(cookies)

      return new Promise((resolve, reject) => {
        fs.writeFile(filename, jsonStr, err => {
          if (err) {
            log.error('PuppetWebBrowser', 'saveSession() fail to write file %s: %s', filename, err.errno)
            reject(err)
          }
          log.silly('PuppetWebBrowser', 'saved session(%d cookies) to %s', cookies.length, filename)
          resolve(cookies)
        })
      }) as Promise<DriverCookie[]> // XXX why need `as` here???

    } catch (e) {
      log.error('PuppetWebBrowser', 'saveSession() getCookies() exception: %s', e.message)
      throw e
    }
  }

  public loadSession(): Promise<any> {
    log.verbose('PuppetWebBrowser', `loadSession(${this.setting.sessionFile})`)
    if (!this.setting.sessionFile) {
      return Promise.reject(new Error('loadSession() no sessionFile'))
    } else if (this.dead()) {
      return Promise.reject(new Error('loadSession() - browser dead'))
    }

    const filename = this.setting.sessionFile

    return new Promise((resolve, reject) => {
      fs.readFile(filename, (err, jsonStr) => {
        if (err) {
          if (err) { log.silly('PuppetWebBrowser', 'loadSession(%s) skipped because error code: %s', filename, err.code) }
          return reject(new Error('error code:' + err.code))
        }
        const cookies = JSON.parse(jsonStr.toString())

        let ps = arrify(this.addCookies(cookies))
        Promise.all(ps)
        .then(() => {
          log.verbose('PuppetWebBrowser', 'loaded session(%d cookies) from %s', cookies.length, filename)
          resolve(cookies)
        })
        .catch(e => {
          log.error('PuppetWebBrowser', 'loadSession() addCookies() exception: %s', e.message)
          reject(e)
        })
      })
    })
  }
}

export default Browser
