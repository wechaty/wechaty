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

/* tslint:disable:no-var-requires */
const retryPromise  = require('retry-promise').default // https://github.com/olalonde/retry-promise

import {
    Config
  , HeadName
}                   from '../config'
import StateMonitor from '../state-monitor'
import log          from '../brolog-env'

import {
    CookieType
  , BrowserCookie
}                     from './browser-cookie'
import BrowserDriver  from './browser-driver'

export type BrowserSetting = {
  head:         HeadName
  sessionFile?: string
}

export class Browser extends EventEmitter {

  private cookie: BrowserCookie
  public driver: BrowserDriver

  public state = new StateMonitor<'open', 'close'>('Browser', 'close')

  constructor(private setting: BrowserSetting = {
      head: Config.head
    , sessionFile: ''
  }) {
    super()
    log.verbose('PuppetWebBrowser', 'constructor() with head(%s) sessionFile(%s)', setting.head, setting.sessionFile)

    this.driver = new BrowserDriver(this.setting.head)
    this.cookie = new BrowserCookie(this.driver, this.setting.sessionFile)
  }

  public toString() { return `Browser({head:${this.setting.head})` }

  public async init(): Promise<void> {
    this.state.target('open')
    this.state.current('open', false)

    // jumpUrl is used to open in browser for we can set cookies.
    // backup: 'https://res.wx.qq.com/zh_CN/htmledition/v2/images/icon/ico_loading28a2f7.gif'
    const jumpUrl = 'https://wx.qq.com/zh_CN/htmledition/v2/images/webwxgeticon.jpg'

    try {
      await this.driver.init()
      await this.open(jumpUrl)
      await this.loadCookie()
                .catch(e => { // fail safe
                  log.verbose('PuppetWeb', 'browser.loadSession(%s) exception: %s'
                                          , this.setting.sessionFile
                                          , e && e.message || e
                  )
                })
      await this.open()

      /**
       * when open url, there could happen a quit() call.
       * should check here: if we are in `close` target state, we should clean up
       */
      if (this.state.target() !== 'open') {
        throw new Error('init() finished but found state.target() is changed to close. has to quit().')
      }

      this.state.current('open')

      return

    } catch (e) {
      log.error('PuppetWebBrowser', 'init() exception: %s', e.message)

      this.state.current('close')
      await this.quit()

      throw e
    }
  }

  public async open(url: string = 'https://wx.qq.com'): Promise<void> {
    log.verbose('PuppetWebBrowser', `open(${url})`)

    // TODO: set a timer to guard driver.get timeout, then retry 3 times 201607
    try {
      await this.driver.get(url)
    } catch (e) {
      log.error('PuppetWebBrowser', 'open() exception: %s', e.message)
      throw e
    }
  }

  public async refresh(): Promise<void> {
    log.verbose('PuppetWebBrowser', 'refresh()')
    await this.driver
              .navigate()
              .refresh()
    return
  }

  public async restart(): Promise<void> {
    log.verbose('PuppetWebBrowser', 'restart()')

    await this.quit()

    if (this.state.current() === 'open' && this.state.inprocess()) {
      log.warn('PuppetWebBrowser', 'restart() found state.current() === open and inprocess()')
      return
    }

    await this.init()
  }

  public async quit(): Promise<void> {
    log.verbose('PuppetWebBrowser', 'quit()')

    if (this.state.current() === 'close' && this.state.inprocess()) {
      const e = new Error('quit() be called when state.current() is close with inprocess()?')
      log.warn('PuppetWebBrowser', e.message)
      throw e
    }

    this.state.current('close', false)

    try {
      await this.driver.close().catch(e => { /* fail safe */ }) // http://stackoverflow.com/a/32341885/1123955
      log.silly('PuppetWebBrowser', 'quit() driver.close()-ed')
      await this.driver.quit()
      log.silly('PuppetWebBrowser', 'quit() driver.quit()-ed')

      /**
       *
       * if we use AVA test runner, then this.clean might cause problems
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

    // this.currentState('close')
    this.state.current('close')

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
                                  , attempt,  timeout
      )

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

    const head = this.setting.head

    return new Promise((resolve, reject) => {
      require('ps-tree')(process.pid, (err, children) => {
        if (err) {
          reject(err)
          return
        }
        let browserRe

        switch (head) {
          case 'phantomjs':
            browserRe = 'phantomjs'
            break

          case 'chrome':
            browserRe = 'chrome(?!driver)|chromium'
            break

          default:
            const e = new Error('unsupported head: ' + head)
            log.warn('PuppetWebBrowser', 'getBrowserPids() for %s', e.message)
            throw e
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
    // log.verbose('PuppetWebBrowser', `Browser.execute() driver.getSession: %s`, util.inspect(this.driver.getSession()))
    if (this.dead()) { throw new Error('browser dead') }

    try {
      return await this.driver.executeScript.apply(this.driver, arguments)
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
      return await this.driver.executeAsyncScript.apply(this.driver, arguments)
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
    } else if (this.state.target() !== 'open') {
      dead = true
      msg = 'state.target() not open'
    } else if (!this.driver) { // FIXME: this.driver is BrowserDriver, should add a method to check if availble 201610
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

      if (   this.state.target()  === 'open'
          && this.state.current() === 'open'
          && this.state.stable()
      ) {
        log.verbose('PuppetWebBrowser', 'dead() emit a `dead` event because %s', msg)
        this.emit('dead', msg)
      } else {
        log.warn('PuppetWebBrowser', 'dead() wil not emit `dead` event because states are: target(%s), current(%s), stable(%s)'
                                    , this.state.target(), this.state.current(), this.state.stable()
        )
      }

    }
    return dead
  }

  public addCookie(cookies: CookieType[]):            Promise<void>
  public addCookie(cookie:  CookieType):              Promise<void>
  public addCookie(cookie:  CookieType|CookieType[]): Promise<void> {
    return this.cookie.add(cookie)
  }

  public saveCookie()   { return this.cookie.save()   }
  public loadCookie()   { return this.cookie.load()   }
  public readCookie()   { return this.cookie.read()   }
  public cleanCookie()  { return this.cookie.clean()  }
}

export default Browser
