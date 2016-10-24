/**
 * Wechat for Bot. Connecting ChatBots
 *
 * Interface for puppet
 *
 * Licenst: ISC
 * https://github.com/zixia/wechaty
 *
 */
import { EventEmitter } from 'events'
import {
  Builder
  , Capabilities
  , WebDriver
} from 'selenium-webdriver'

/* tslint:disable:no-var-requires */
const retryPromise  = require('retry-promise').default // https://github.com/olalonde/retry-promise

import Config   from  '../config'
import log      from  '../brolog-env'

import {
    CookieType
  , BrowserCookie
}                from './browser-cookie'

export type BrowserSetting = {
  head?:        string
  sessionFile?: string
}

export class Browser extends EventEmitter {

  private _targetState: string
  private _currentState: string
  private cookie: BrowserCookie

  public _driver: WebDriver | null = null

  constructor(private setting: BrowserSetting = {}) {
    super()
    log.verbose('PuppetWebBrowser', 'constructor() with head(%s) sessionFile(%s)', setting.head, setting.sessionFile)

    setting.head = setting.head || process.env['WECHATY_HEAD'] || Config.DEFAULT_HEAD

    this.targetState('close')
    this.currentState('close')

    this.cookie = new BrowserCookie(this, this.setting.sessionFile)
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

  public async init(): Promise<this> {
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
      await this.loadCookie()
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
    log.verbose('PuppetWebBrowser', 'initDriver() for head: %s', this.setting.head)

    if (this._driver) {
      await this._driver.close()
      await this._driver.quit()
      this._driver = null
    }

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
    log.silly('PuppetWebBrowser', 'driver(%s)'
                                , typeof newDriver === 'undefined'
                                  ? ''
                                  : newDriver
    )

    if (typeof newDriver !== 'undefined') {
      if (newDriver) {
        this._driver = newDriver
        return this._driver
      } else { // null
        if (this._driver && this._driver.getSession()) {
          throw new Error('driver still has session, can not set null')
        }
        this._driver = null
        return
      }
    }

    if (!this._driver) {
      const e = new Error('no driver')
      log.warn('PuppetWebBrowser', 'driver() exception: %s', e.message)
      throw e
    }
    // if (!this._driver.getSession()) {
    //   const e = new Error('no driver session')
    //   log.warn('PuppetWebBrowser', 'driver() exception: %s', e.message)
    //   this._driver.quit()
    //   throw e
    // }

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

    /**
     * http://stackoverflow.com/a/27733960/1123955
     * issue #56
     * only need under win32 with cygwin
     * and will cause strange error:
     * `The previously configured ChromeDriver service is still running. You must shut it down before you may adjust its configuration.`

    const chrome = require('selenium-webdriver/chrome')
    const path = require('chromedriver').path

    const service = new chrome.ServiceBuilder(path).build()
    chrome.setDefaultService(service)

     */

    const options = {
      args: ['--no-sandbox']  // issue #26 for run inside docker
      // , binary: require('chromedriver').path
    }
    if (Config.isDocker) {
      options['binary'] = Config.CMD_CHROMIUM
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

    if (this.currentState() === 'closing') {
      const e = new Error('quit() be called when currentState is closing?')
      log.warn('PuppetWebBrowser', e.message)
      throw e
    }

    // this.targetState('close')
    this.currentState('closing')

    try {
      await this.driver().close().catch(e => { /* fail safe */ }) // http://stackoverflow.com/a/32341885/1123955
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

  public clean(): Promise<void> {
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

    try {
      return await this.driver().executeScript.apply(this.driver(), arguments)
    } catch (e) {
      // this.dead(e)
      log.warn('PuppetWebBrowser', 'execute() exception: %s', e.message.substr(0, 99))
      throw e
    }
  }

  public async executeAsync(script, ...args): Promise<any> {
    log.silly('PuppetWebBrowser', 'Browser.executeAsync(%s)', script.slice(0, 80))
    if (this.dead()) { throw new Error('browser dead') }

    try {
      return await this.driver().executeAsyncScript.apply(this.driver(), arguments)
    } catch (e) {
      // this.dead(e)
      log.warn('PuppetWebBrowser', 'executeAsync() exception: %s', e.message.slice(0, 99))
      throw e
    }
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
    // too noisy!
    // log.silly('PuppetWebBrowser', 'dead() checking ... ')

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
      log.warn('PuppetWebBrowser', 'dead(%s) because %s'
                                  , forceReason
                                    ? forceReason
                                    : ''
                                  , msg
      )
      // no need to quit here. dead event listener will do this async job, and do it better than here
      // this.quit()

      // must use nextTick here, or promise will hang... 2016/6/10
      // setImmediate(_ => {
        if (this.targetState() !== 'open' || this.currentState() === 'opening') {
          log.warn('PuppetWebBrowser', 'dead() wil not emit `dead` event because currentState is `opening` or targetState !== open')
        } else {
          log.verbose('PuppetWebBrowser', 'dead() emit a `dead` event because %s', msg)
          this.emit('dead', msg)
        }
      // })
    }
    return dead
  }

  public async addCookie(cookies: CookieType[]):  Promise<void>
  public async addCookie(cookie:  CookieType):    Promise<void>
  public async addCookie(cookie:  CookieType|CookieType[]): Promise<void> {
    await this.cookie.add(cookie)
  }

  public saveCookie()   { return this.cookie.save()   }
  public loadCookie()   { return this.cookie.load()   }
  public readCookie()   { return this.cookie.read()   }
  public cleanCookie()  { return this.cookie.clean()  }
}

export default Browser
