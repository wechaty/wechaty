/**
 * Wechaty - Wechat for Bot. Connecting ChatBots
 *
 * Licenst: ISC
 * https://github.com/wechaty/wechaty
 *
 */
import { test }   from 'ava'

// import {
//   Browser
//   , By
// }                 from 'selenium-webdriver'

import {
  Bridge,
  Browser,
  PuppetWeb,
} from '../src/puppet-web/'

/**
 * WHY force to use SERIAL mode
 *
 * serial here is because we are checking browser pids inside test.
 * if 2 tests run parallel in the same process,
 * there will have race conditions for the conflict of `getBrowserPids()`
 */
test.only('WebDriver process create & quit test', async t => {
  try {
    const browser = new Browser()
    t.truthy(browser, 'should instanciate a browser')

    await browser.init()
    t.pass('should be inited successful')
    await browser.open()
    t.pass('should open successful')

    let pids = await browser.getBrowserPidList()
    t.truthy(pids.length > 0, 'should exist browser process after b.open()')

    await browser.quit()
    t.pass('quited')

    pids = await browser.getBrowserPidList()
    t.is(pids.length, 0, 'no driver process after quit')
  } catch (err) {
    t.fail(err.message || err)
  }
})

test.serial('WebDriver smoke testing', async t => {
  const browser = new Browser()
  t.truthy(browser, 'Browser instnace')

  const mockPuppet = <PuppetWeb>{browser: browser}
  const bridge = new Bridge(mockPuppet, 8788)
  t.truthy(bridge, 'Bridge instnace')

  let driver // for help function `execute`

  const m = (await browser.getBrowserPidList()).length
  t.is(m, 0, 'should has no browser process before get()')

  driver = await browser.driver.init()
  t.truthy(driver, 'should init driver success')

  const injectio = bridge.getInjectio()
  t.truthy(injectio.length > 10, 'should got injectio script')

  await driver.get('https://wx.qq.com/')
  t.pass('should open wx.qq.com')

  const n = (await browser.getBrowserPidList()).length
  t.truthy(n > 0, 'should exist browser process after get()')

  const retAdd = await driverExecute('return 1+1')
  t.is(retAdd, 2, 'should return 2 for execute 1+1 in browser')

  const retInject = await driverExecute(injectio, 8788)
  t.truthy(retInject, 'should return a object contains status of inject operation')
  t.is(retInject.code, 200, 'should got code 200 for a success wechaty inject')

  await browser.driver.quit()

  return

  //////////////////////////////////
  function driverExecute(arg1: any, arg2?: any) {
    return driver.executeScript.apply(driver, arguments)
  }
})
