/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   Copyright 2016-2017 Huan LI <zixia@zixia.net>
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
import {
  Builder,
  Capabilities,
  IWebDriverOptionsCookie,
  logging,
  Navigation,
  Options,
  promise as promiseManager,
  Session,
  WebDriver,
}                             from 'selenium-webdriver'

import {
  config,
  HeadName,
  log,
}                             from '../config'

/**
 * ISSUE #72
 * Introduce the SELENIUM_PROMISE_MANAGER environment variable.
 * When set to 1, selenium-webdriver will use the existing ControlFlow scheduler.
 * When set to 0, the SimpleScheduler will be used.
 */
process.env['SELENIUM_PROMISE_MANAGER'] = '0'
promiseManager.USE_PROMISE_MANAGER = false

export class BrowserDriver {
  private driver: WebDriver

  constructor(
    private head: HeadName,
  ) {
    log.verbose('PuppetWebBrowserDriver', 'constructor(%s)', head)
  }

  public async init(): Promise<void> {
    log.verbose('PuppetWebBrowserDriver', 'init() for head: %s', this.head)

    switch (this.head.toLowerCase()) {
      case 'phantomjs':
        this.driver = await this.getPhantomJsDriver()
        break

      case 'firefox':
        this.driver = new Builder()
                            .setAlertBehavior('ignore')
                            .forBrowser('firefox')
                            .build()
        break

      case 'chrome':
        this.driver = await this.getChromeDriver(false) // headless = false
        break

      case 'chrome-headless':
        this.driver = await this.getChromeDriver(true)  // headless = true
        break

      default: // unsupported browser head
        throw new Error('unsupported head: ' + this.head)
    }

    const WEBDRIVER_TIMEOUT = 60 * 1000
    await this.driver.manage()
                      .timeouts()
                      .setScriptTimeout(WEBDRIVER_TIMEOUT)
  }

  public getWebDriver(): WebDriver {
    return this.driver
  }

  private async getChromeDriver(headless = false): Promise<WebDriver> {
    log.verbose('PuppetWebBrowserDriver', 'getChromeDriver()')

    const HEADLESS_ARGS = [
      // --allow-insecure-localhost: Require Chrome v62
      // https://bugs.chromium.org/p/chromium/issues/detail?id=721739#c26
      '--allow-insecure-localhost',
      '--disable-gpu',
      // --headless: Require Chrome v60
      // https://developers.google.com/web/updates/2017/04/headless-chrome
      '--headless',
    ]

    const options = {
      args: [
        '--homepage=about:blank',
        '--no-sandbox',
        // '--remote-debugging-port=9222',  // will conflict with webdriver
      ],  // issue #26 for run inside docker
      // binary: '/opt/google/chrome-unstable/chrome',
    }

    if (headless)  {
      // ISSUE #739
      // Chrome v62 or above is required
      // because when we are using --headless args,
      // chrome version below 62 will not allow the
      // self-signed certificate to be used when
      // visiting https://localhost.
      options.args.concat(HEADLESS_ARGS)
    }

    if (config.dockerMode) {
      log.verbose('PuppetWebBrowserDriver', 'getChromeDriver() wechaty in docker confirmed(should not show this in CI)')
      options['binary'] = config.CMD_CHROMIUM
    } else {
      /**
       * https://github.com/Chatie/wechaty/pull/416
       * In some circumstances, ChromeDriver could not be found on the current PATH when not in Docker.
       * The chromedriver package always adds directory of chrome driver binary to PATH.
       * So we requires chromedriver here to avoid PATH issue.
       */
      require('chromedriver')
    }

    const customChrome = Capabilities
                          .chrome()
                          .set('chromeOptions', options)

    // TODO: chromedriver --silent
    if (!/^(verbose|silly)$/i.test(log.level())) {
      const prefs = new logging.Preferences()

      prefs.setLevel(logging.Type.BROWSER     , logging.Level.OFF)
      prefs.setLevel(logging.Type.CLIENT      , logging.Level.OFF)
      prefs.setLevel(logging.Type.DRIVER      , logging.Level.OFF)
      prefs.setLevel(logging.Type.PERFORMANCE , logging.Level.OFF)
      prefs.setLevel(logging.Type.SERVER      , logging.Level.OFF)

      customChrome.setLoggingPrefs(prefs)
    }

    /**
     * XXX when will Builder().build() throw exception???
     */
    let ttl = 3
    let driverError = new Error('getChromeDriver() unknown invalid driver error')
    let valid = false

    let driver: WebDriver

    while (ttl--) {
      log.verbose('PuppetWebBrowserDriver', 'getChromeDriver() ttl: %d', ttl)

      try {
        log.verbose('PuppetWebBrowserDriver', 'getChromeDriver() new Builder()')

        driver = new Builder()
                      .setAlertBehavior('ignore')
                      .forBrowser('chrome')
                      .withCapabilities(customChrome)
                      .build()

        log.verbose('PuppetWebBrowserDriver', 'getChromeDriver() new Builder() done')

        valid = await this.valid(driver)
        log.verbose('PuppetWebBrowserDriver', 'getChromeDriver() valid() is %s at ttl %d', valid, ttl)

        if (valid) {
          log.silly('PuppetWebBrowserDriver', 'getChromeDriver() success')

          return driver

        } else {
          const e = new Error('got invalid driver at ttl ' + ttl)
          log.warn('PuppetWebBrowserDriver', 'getChromeDriver() %s', e.message)
          driverError = e

          log.verbose('PuppetWebBrowserDriver', 'getChromeDriver() driver.quit() at ttl %d', ttl)
          driver.close()
                .then(() => driver.quit())  // // do not await, because a invalid driver will always hang when quit()
                .catch(err => {
                  log.warn('PuppetWebBrowserDriver', 'getChromeDriver() driver.{close,quit}() exception: %s', err.message)
                  driverError = err
                })
        } // END if

      } catch (e) {
        if (/could not be found/.test(e.message)) {
          // The ChromeDriver could not be found on the current PATH
          log.error('PuppetWebBrowserDriver', 'getChromeDriver() Wechaty require `chromedriver` to be installed.(try to run: "npm install chromedriver" to fix this issue)')
          throw e
        }
        log.warn('PuppetWebBrowserDriver', 'getChromeDriver() ttl:%d exception: %s', ttl, e.message)
        driverError = e
      }

    } // END while

    log.warn('PuppetWebBrowserDriver', 'getChromeDriver() invalid after ttl expired: %s', driverError.stack)
    throw driverError

  }

  private async getPhantomJsDriver(): Promise<WebDriver> {
    // setup custom phantomJS capability https://github.com/SeleniumHQ/selenium/issues/2069
    const phantomjsExe = require('phantomjs-prebuilt').path
    if (!phantomjsExe) {
      throw new Error('phantomjs binary path not found')
    }
    // const phantomjsExe = require('phantomjs2').path

    const phantomjsArgs = [
      '--load-images=false',
      '--ignore-ssl-errors=true',  // this help socket.io connect with localhost
      '--web-security=false',      // https://github.com/ariya/phantomjs/issues/12440#issuecomment-52155299
      '--ssl-protocol=any',        // http://stackoverflow.com/a/26503588/1123955
      // , '--ssl-protocol=TLSv1'    // https://github.com/ariya/phantomjs/issues/11239#issuecomment-42362211

      // issue: Secure WebSocket(wss) do not work with Self Signed Certificate in PhantomJS #12
      // , '--ssl-certificates-path=D:\\cygwin64\\home\\zixia\\git\\wechaty' // http://stackoverflow.com/a/32690349/1123955
      // , '--ssl-client-certificate-file=cert.pem' //
    ]

    if (config.debug) {
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

    log.silly('PuppetWebBrowserDriver', 'phantomjs binary: ' + phantomjsExe)
    log.silly('PuppetWebBrowserDriver', 'phantomjs args: ' + phantomjsArgs.join(' '))

    const driver = new Builder()
                        .withCapabilities(customPhantom)
                        .build()

    // const valid = await this.valid(driver)

    // if (!valid) {
    //   throw new Error('invalid driver founded')
    // }

    /* tslint:disable:jsdoc-format */
		/**
		 *  FIXME: ISSUE #21 - https://github.com/chatie/wechaty/issues/21
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

  private async valid(driver: WebDriver): Promise<boolean> {
    log.verbose('PuppetWebBrowserDriver', 'valid()')

    if (!await this.validDriverSession(driver)) {
      return false
    }

    if (!await this.validDriverExecute(driver)) {
      return false
    }

    return true

  }

  private async validDriverExecute(driver: WebDriver): Promise<boolean> {
    log.verbose('PuppetWebBrowserDriver', 'validDriverExecute()')

    try {
      const two = await driver.executeScript('return 1+1')
      log.verbose('PuppetWebBrowserDriver', 'validDriverExecute() driver.executeScript() done: two = %s', two)

      if (two === 2) {
        log.silly('PuppetWebBrowserDriver', 'validDriverExecute() driver ok')
        return true
      } else {
        log.warn('PuppetWebBrowserDriver', 'validDriverExecute() fail: two = %s ?', two)
        return false
      }
    } catch (e) {
      log.warn('BrowserDriver', 'validDriverExecute() fail: %s', e.message)
      return false
    }
  }

  private async validDriverSession(driver: WebDriver): Promise<boolean> {
    log.verbose('PuppetWebBrowserDriver', 'validDriverSession()')

    try {
      const session = await new Promise(async (resolve, reject) => {

        /**
         * Be careful about this TIMEOUT, the total time(TIMEOUT x retry) should not trigger Watchdog Reset
         * because we are in state(open, false) state, which will cause Watchdog Reset failure.
         * https://travis-ci.org/wechaty/wechaty/jobs/179022657#L3246
         */
        const TIMEOUT = 7 * 1000

        let timer: NodeJS.Timer | null

        timer = setTimeout(_ => {
          const e = new Error('validDriverSession() driver.getSession() timeout(halt?)')
          log.warn('PuppetWebBrowserDriver', e.message)

          // record timeout by set timer to null
          timer = null

          // 1. Promise rejected
          return reject(e)

        }, TIMEOUT)

        try {
          log.verbose('PuppetWebBrowserDriver', 'validDriverSession() getSession()')
          const driverSession = await driver.getSession()
          log.verbose('PuppetWebBrowserDriver', 'validDriverSession() getSession() done')

          // 3. Promise resolved
          return resolve(driverSession)

        } catch (e) {
          log.warn('PuppetWebBrowserDriver', 'validDriverSession() getSession() catch() rejected: %s', e && e.message || e)

          // 4. Promise rejected
          return reject(e)

        } finally {
          if (timer) {
            log.verbose('PuppetWebBrowserDriver', 'validDriverSession() getSession() clearing timer')
            clearTimeout(timer)
            timer = null
          }
        }

      })

      log.verbose('PuppetWebBrowserDriver', 'validDriverSession() driver.getSession() done()')

      if (session) {
        return true
      } else {
        log.verbose('PuppetWebBrowserDriver', 'validDriverSession() found an invalid driver')
        return false
      }

    } catch (e) {
      log.warn('PuppetWebBrowserDriver', 'validDriverSession() driver.getSession() exception: %s', e.message)
      return false
    }

  }

  public close()                { return this.driver.close() }
  public executeAsyncScript(script: string|Function, ...args: any[])  { return this.driver.executeAsyncScript.apply(this.driver, arguments) }
  public executeScript     (script: string|Function, ...args: any[])  { return this.driver.executeScript.apply(this.driver, arguments) }
  public get(url: string)       { return this.driver.get(url) }
  public getSession()           { return this.driver.getSession() }
  public manage(): Options      { return this.driver.manage() }
  public navigate(): Navigation { return this.driver.navigate() }
  public quit()                 { return this.driver.quit() }
}

// export default BrowserDriver
export {
  IWebDriverOptionsCookie,
  Session,
}
