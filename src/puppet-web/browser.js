/**
 * Wechat for Bot. and for human who can talk with bot/robot
 *
 * Interface for puppet
 *
 * Licenst: ISC
 * https://github.com/zixia/wechaty
 *
 */

const fs            = require('fs')
const co            = require('co')
const path          = require('path')
const util          = require('util')
const EventEmitter  = require('events')
const WebDriver     = require('selenium-webdriver')
const retryPromise  = require('retry-promise').default // https://github.com/olalonde/retry-promise

const log = require('../brolog-env')

const Config  = require('../config')

class Browser extends EventEmitter {

  constructor({
    head = process.env.WECHATY_HEAD || Config.DEFAULT_HEAD
    , sessionFile
  } = {}) {
    log.verbose('Browser', 'constructor() with head(%s) sessionFile(%s)', head, sessionFile)
    super()
    log.verbose('PuppetWebBrowser', 'constructor()')
    this.head = head
    this.sessionFile = sessionFile // a file to save session cookies

    // this.live = false
    
    this.targetState('close')
    this.currentState('close')
  }

  // targetState : 'open' | 'close'
  targetState(newState) {
    if (newState) {
      log.verbose('Browser', 'targetState(%s)', newState)
      this._targetState = newState
    }
    return this._targetState
  }

  // currentState : 'opening' | 'open' | 'closing' | 'close'
  currentState(newState) {
    if (newState) {
      log.verbose('Browser', 'currentState(%s)', newState)
      this._currentState = newState
    }
    return this._currentState
  }

  toString() { return `Browser({head:${this.head})` }

  init() {
    this.targetState('open')
    this.currentState('opening')

    // fastUrl is used to open in browser for we can set cookies.
    // backup: 'https://res.wx.qq.com/zh_CN/htmledition/v2/images/icon/ico_loading28a2f7.gif'
    const fastUrl = 'https://wx.qq.com/zh_CN/htmledition/v2/images/webwxgeticon.jpg'

    return co.call(this, function* () {
      yield this.initDriver()
      // this.live = true

      yield this.open(fastUrl)
      yield this.loadSession()
                .catch(e => { // fail safe
                  log.verbose('PuppetWeb', 'browser.loadSession(%s) exception: %s', this.profile, e.message || e)
                })
      yield this.open()

      this.currentState('open')
      return this
    })
    .catch(e => {
      // XXX: must has a `.catch` here, or promise will hang! 2016/6/7
      // XXX: if no `.catch` here, promise will hang!
      // with selenium-webdriver v2.53.2
      // XXX: https://github.com/SeleniumHQ/selenium/issues/2233
      log.error('PuppetWebBrowser', 'init() exception: %s', e.message)

      this.currentState('closing')
      this.quit().then(_ => {
        this.currentState('close')
      })

      throw e
    })
  }

  open(url = 'https://wx.qq.com') {
    log.verbose('PuppetWebBrowser', `open(${url})`)

    // TODO: set a timer to guard driver.get timeout, then retry 3 times 201607
    return this.driver.get(url)
    .catch(e => {
      log.error('PuppetWebBrowser', 'open() exception: %s', e.message)
      this.dead(e.message)
      throw e
    })
  }

  initDriver() {
    log.verbose('PuppetWebBrowser', 'initDriver(head: %s)', this.head)

    switch (true) {
      case !this.head: // no head default to phantomjs
      case /phantomjs/i.test(this.head):
      case /phantom/i.test(this.head):
        this.driver = this.getPhantomJsDriver()
        break

      case /firefox/i.test(this.head):
        this.driver = new WebDriver.Builder()
        .setAlertBehavior('ignore')
        .forBrowser('firefox')
        .build()
        break

      case /chrome/i.test(this.head):
        this.driver = this.getChromeDriver()
        break

      default: // unsupported browser head
        throw new Error('unsupported head: ' + this.head)
    }

    // XXX: if no `setTimeout()` here, promise will hang forever!
    // with a confirmed bug in selenium-webdriver v2.53.2:
    // https://github.com/SeleniumHQ/selenium/issues/2233
    // FIXED: selenium v3 released 20160807
    // setTimeout(() => { resolve(this.driver) }, 0)
    return Promise.resolve(this.driver)
  }

  refresh() {
    log.verbose('PuppetWebBrowser', 'refresh()')
    return this.driver.navigate().refresh()
  }

  getChromeDriver() {
    const options = {
      args: ['--no-sandbox']  // issue #26 for run inside docker
    }
    if (Config.isDocker) {
      options.binary = Config.BINARY_CHROMIUM
    }

    const customChrome = WebDriver.Capabilities.chrome()
                                  .set('chromeOptions', options)

    return new WebDriver.Builder()
                        .setAlertBehavior('ignore')
                        .forBrowser('chrome')
                        .withCapabilities(customChrome)
                        .build()
  }
 
  getPhantomJsDriver() {
    // setup custom phantomJS capability https://github.com/SeleniumHQ/selenium/issues/2069
    const phantomjsExe = require('phantomjs-prebuilt').path
    // const phantomjsExe = require('phantomjs2').path

    const phantomjsArgs = [
      '--load-images=false'
      , '--ignore-ssl-errors=true'  // this help socket.io connect with localhost
      , '--web-security=false'      // https://github.com/ariya/phantomjs/issues/12440#issuecomment-52155299
      , '--ssl-protocol=any'        // http://stackoverflow.com/a/26503588/1123955
      //, '--ssl-protocol=TLSv1'    // https://github.com/ariya/phantomjs/issues/11239#issuecomment-42362211

      // issue: Secure WebSocket(wss) do not work with Self Signed Certificate in PhantomJS #12 
      // , '--ssl-certificates-path=D:\\cygwin64\\home\\zixia\\git\\wechaty' // http://stackoverflow.com/a/32690349/1123955
      // , '--ssl-client-certificate-file=cert.pem' // 
    ]

    if (process.env.WECHATY_DEBUG) {
      phantomjsArgs.push('--remote-debugger-port=8080') // XXX: be careful when in production env.
      phantomjsArgs.push('--webdriver-loglevel=DEBUG')
      // phantomjsArgs.push('--webdriver-logfile=webdriver.debug.log')
    } else {
      if (log && log.level === 'silent') {
        phantomjsArgs.push('--webdriver-loglevel=NONE')
      } else {
        phantomjsArgs.push('--webdriver-loglevel=ERROR')
      }
    }

    const customPhantom = WebDriver.Capabilities.phantomjs()
                                  .setAlertBehavior('ignore')
                                  .set('phantomjs.binary.path', phantomjsExe)
                                  .set('phantomjs.cli.args', phantomjsArgs)

    log.silly('PuppetWebBrowser', 'phantomjs binary: ' + phantomjsExe)
    log.silly('PuppetWebBrowser', 'phantomjs args: ' + phantomjsArgs.join(' '))

    const driver = new WebDriver.Builder()
                                .withCapabilities(customPhantom)
                                .build()
    
		/**
		 *  FIXME: ISSUE #21 - https://github.com/zixia/wechaty/issues/21
	 	 *
 	 	 *	http://phantomjs.org/api/webpage/handler/on-resource-requested.html
		 *	http://stackoverflow.com/a/29544970/1123955
		 *  https://github.com/geeeeeeeeek/electronic-wechat/pull/319
		 *
		 */
  	driver.executePhantomJS(`
this.onResourceRequested = function(request, net) {
   console.log('REQUEST ' + request.url);
   blockRe = /wx\.qq\.com\/\?t=v2\/fake/i
   if (blockRe.test(request.url)) {
       console.log('Abort ' + request.url);
       net.abort();
   }
}
`)

    // https://github.com/detro/ghostdriver/blob/f976007a431e634a3ca981eea743a2686ebed38e/src/session.js#L233
    // driver.manage().timeouts().pageLoadTimeout(2000)
    
    return driver
  }

  quit() {
    log.verbose('PuppetWebBrowser', 'quit()')
    this.targetState('close')
    this.currentState('closing')
    // this.live = false

    if (!this.driver) {
      log.verbose('PuppetWebBrowser', 'driver.quit() skipped because no driver')

      this.currentState('close')
      return Promise.resolve('no driver')
    } else if (!this.driver.getSession()) {
      this.driver = null
      log.verbose('PuppetWebBrowser', 'driver.quit() skipped because no driver session')

      this.currentState('close')
      return Promise.resolve('no driver session')
    }

    return co.call(this, function* () {
      log.silly('PuppetWebBrowser', 'quit() co()')
      yield this.driver.close() // http://stackoverflow.com/a/32341885/1123955
      log.silly('PuppetWebBrowser', 'quit() driver.close()-ed')
      yield this.driver.quit()
      log.silly('PuppetWebBrowser', 'quit() driver.quit()-ed')
      this.driver = null
      log.silly('PuppetWebBrowser', 'quit() this.driver = null')

      /**
       * 
       * if we use AVA to test, then this.clean will cause problems 
       * because there will be more than one instance of browser with the same nodejs process id
       * 
       */
      yield this.clean()

      this.currentState('close')
      log.silly('PuppetWebBrowser', 'quit() co() end')
    }).catch(e => {
      // console.log(e)
      // log.warn('PuppetWebBrowser', 'err: %s %s %s %s', e.code, e.errno, e.syscall, e.message)
      log.error('PuppetWebBrowser', 'quit() exception: %s', e.message)

      const crashMsgs = [
        'ECONNREFUSED'
        , 'WebDriverError: .* not reachable'
        , 'NoSuchWindowError: no such window: target window already closed'
      ]
      const crashRegex = new RegExp(crashMsgs.join('|'), 'i')

      if (crashRegex.test(e.message)) { log.warn('PuppetWebBrowser', 'driver.quit() browser crashed') }
      else                            { log.warn('PuppetWebBrowser', 'driver.quit() exception: %s', e.message) }

      // XXX fail safe to `close` ?
      this.currentState('close')
    })
  }

  clean() {
    const max = 15
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

  getBrowserPids() {
    log.silly('Browser', 'getBrowserPids()')
    
    return new Promise((resolve, reject) => {
      require('ps-tree')(process.pid, (err, children) => {
        if (err) {
          reject(err)
          return
        }
        let browserRe

        switch (true) {
          case !this.head: // no head default to phantomjs
          case /phantomjs/i.test(this.head):
          case /phantom/i.test(this.head):
            browserRe = 'phantomjs'
            break

          case this.head: // head default to chrome
          case /chrome/i.test(this.head):
            browserRe = 'chrome(?!driver)|chromium'
            break

          default:
            log.warn('PuppetWebBrowser', 'getBrowserPids() for unsupported head: %s', this.head)
            browserRe = this.head
        }

        let matchRegex = new RegExp(browserRe, 'i')
        const pids = children.filter(child => {
          log.silly('Browser', 'getBrowserPids() child: %s', JSON.stringify(child))
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
   * use this.driver.manage() to call other functions like:
   * deleteCookie / getCookie / getCookies
   */
  addCookies(cookie) {
    if (this.dead()) { return Promise.reject(new Error('addCookies() - browser dead'))}

    if (typeof cookie.map === 'function') {
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

    return this.driver.manage()
    // this is old webdriver format
    // .addCookie(cookie.name, cookie.value, cookie.path
    //   , cookie.domain, cookie.secure, cookie.expiry)
    // this is new webdriver format
    .addCookie(cookie)
    .catch(e => {
      log.warn('PuppetWebBrowser', 'addCookies() exception: %s', e.message)
      throw e
    })
  }

  execute(script, ...args) {
    log.silly('PuppetWebBrowser', `Browser.execute(${script.slice(0, 80)})`)
    // log.verbose('PuppetWebBrowser', `Browser.execute() driver.getSession: %s`, util.inspect(this.driver.getSession()))
    if (this.dead()) { return Promise.reject(new Error('browser dead')) }

    return this.driver.executeScript.apply(this.driver, arguments)
    .catch(e => {
      // this.dead(e)
      log.warn('PuppetWebBrowser', 'execute() exception: %s', e.message)
      throw e
    })
  }

  /**
   *
   * check whether browser is full functional
   *
   */
  readyLive() {
    log.verbose('PuppetWebBrowser', 'readyLive()')
    if (this.dead()) {
      return Promise.reject(new Error('this.dead() true'))
    }
    return new Promise((resolve, reject) => {
      this.execute('return 1+1')
      .then(r => {
        if (r === 2) {
          resolve(true) // browser ok, living
          return
        }
        const errMsg = 'deadEx() found dead browser coz 1+1 = ' + r + ' (not 2)'
        log.verbose('PuppetWebBrowser', errMsg)
        this.dead(errMsg)
        reject(new Error(errMsg)) // browser not ok, dead
        return
      })
      .catch(e => {
        const errMsg = 'deadEx() found dead browser coz 1+1 = ' + e.message
        log.verbose('PuppetWebBrowser', errMsg)
        this.dead(errMsg)
        reject(new Error(errMsg)) // browser not live
        return
      })
    })
  }

  dead(forceReason) {
    let errMsg
    let dead = false

    if (forceReason) {
      dead = true
      errMsg = forceReason
    // } else if (!this.live) {
    } else if (this.targetState() !== 'open') {
      dead = true
      // errMsg = 'browser not live'
      errMsg = 'targetState not open'
    } else if (!this.driver || !this.driver.getSession()) {
      dead = true
      errMsg = 'no driver or session'
    }

    if (dead) {
      log.warn('PuppetWebBrowser', 'dead() because %s', errMsg)
      // this.live = false
      this.currentState('closing')
      this.quit().then(_ => this.currentState('close'))
      
      // must use nextTick here, or promise will hang... 2016/6/10
      process.nextTick(_ => {
        log.verbose('PuppetWebBrowser', 'dead() emit a `dead` event because %s', errMsg)
        this.emit('dead', errMsg)
      })
    }
    return dead
  }

  checkSession() {
    // just check cookies, no file operation
    log.verbose('PuppetWebBrowser', 'checkSession()')

    if (this.dead()) { return Promise.reject(new Error('checkSession() - browser dead'))}

    return this.driver.manage().getCookies()
    .then(cookies => {
      // log.silly('PuppetWeb', 'checkSession %s', require('util').inspect(cookies.map(c => { return {name: c.name/*, value: c.value, expiresType: typeof c.expires, expires: c.expires*/} })))
      log.silly('PuppetWebBrowser', 'checkSession %s', cookies.map(c => c.name).join(','))
      return cookies
    })
    .catch(e => {
      log.error('PuppetWebBrowser', 'checkSession() getCookies() exception: %s', e.message)
      throw e
    })
  }

  cleanSession() {
    log.verbose('PuppetWebBrowser', `cleanSession(${this.sessionFile})`)
    if (!this.sessionFile) {
      return Promise.reject(new Error('cleanSession() no session'))
    }

    if (this.dead())  { return Promise.reject(new Error('cleanSession() - browser dead'))}

    const filename = this.sessionFile
    return new Promise((resolve, reject) => {
      require('fs').unlink(filename, err => {
        if (err && err.code!=='ENOENT') {
          log.silly('PuppetWebBrowser', 'cleanSession() unlink session file %s fail: %s', filename, err.message)
        }
        resolve()
      })
    })
  }

  saveSession() {
    log.silly('PuppetWebBrowser', `saveSession(${this.sessionFile})`)
    if (!this.sessionFile) {
      return Promise.reject(new Error('saveSession() no session'))
    } else if (this.dead()) {
      return Promise.reject(new Error('saveSession() - browser dead'))
    }

    const filename = this.sessionFile

    function cookieFilter(cookies) {
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
  
    return new Promise((resolve, reject) => {
      this.driver.manage().getCookies()
      .then(cookieFilter)
      .then(cookies => {
        // log.silly('PuppetWeb', 'saving %d cookies for session: %s', cookies.length
        //   , util.inspect(cookies.map(c => { return {name: c.name /*, value: c.value, expiresType: typeof c.expires, expires: c.expires*/} })))
        log.silly('PuppetWebBrowser', 'saving %d cookies for session: %s', cookies.length, cookies.map(c => c.name).join(','))

        const jsonStr = JSON.stringify(cookies)
        fs.writeFile(filename, jsonStr, function(err) {
          if(err) {
            log.error('PuppetWebBrowser', 'saveSession() fail to write file %s: %s', filename, err.Error)
            return reject(err)
          }
          log.silly('PuppetWebBrowser', 'saved session(%d cookies) to %s', cookies.length, filename)
          return resolve(cookies)
        })
      })
      .catch(e => {
        log.error('PuppetWebBrowser', 'saveSession() getCookies() exception: %s', e.message)
        reject(e)
      })
    })
  }

  loadSession() {
    log.verbose('PuppetWebBrowser', `loadSession(${this.sessionFile})`)
    if (!this.sessionFile) {
      return Promise.reject(new Error('loadSession() no sessionFile'))
    } else if (this.dead()) {
      return Promise.reject(new Error('loadSession() - browser dead'))
    }

    const filename = this.sessionFile

    return new Promise((resolve, reject) => {
      fs.readFile(filename, (err, jsonStr) => {
        if (err) {
          if (err) { log.silly('PuppetWebBrowser', 'loadSession(%s) skipped because error code: %s', filename, err.code) }
          return reject(new Error('error code:' + err.code))
        }
        const cookies = JSON.parse(jsonStr)

        const ps = this.addCookies(cookies)
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

module.exports = Browser
