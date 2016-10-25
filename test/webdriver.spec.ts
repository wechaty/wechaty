import { test }   from 'ava'

// import {
//   Browser
//   , By
// }                 from 'selenium-webdriver'

import {
    Bridge  as PuppetWebBridge
  , Browser as PuppetWebBrowser
  , PuppetWeb
} from '../src/puppet-web/'

/**
 * WHY USE test.serial
 *
 * serial here is because we are checking browser pids inside test.
 * if 2 tests run parallel in the same process,
 * there will have race conditions for the conflict of `getBrowserPids()`
 */
test.serial('WebDriver process create & quit test', async t => {
    const b = new PuppetWebBrowser()
    t.truthy(b, 'should instanciate a browser')

    await b.init()
    t.pass('should be inited successful')
    await b.open()
    t.pass('should open successful')

    let pids = await b.getBrowserPids()
    t.truthy(pids.length > 0, 'should exist browser process after b.open()')

// console.log(b.driver.getSession())

    await b.quit()
    t.pass('quited')

    const useAva = false
    if (!useAva) { // ava will run tests concurency...
      pids = await b.getBrowserPids()
      t.is(pids.length, 0, 'no driver process after quit')
    }

})

test.serial('WebDriver smoke testing', async t => {
  const wb = new PuppetWebBrowser()
  t.truthy(wb, 'Browser instnace')

  const mockPuppet = <PuppetWeb>{browser: wb}
  const bridge = new PuppetWebBridge(mockPuppet, 8788)
  t.truthy(bridge, 'Bridge instnace')

  let driver // for help function `execute`

  const m = (await wb.getBrowserPids()).length
  t.is(m, 0, 'should has no browser process before get()')

  driver = await wb.driver.init()
  t.truthy(driver, 'should init driver success')

  const injectio = bridge.getInjectio()
  t.truthy(injectio.length > 10, 'should got injectio script')

  // XXX: if get rid of this dummy,
  // driver.get() will fail due to cant start phantomjs process
  // 20160828 fixed in new version of selenium webdriver
  // await Promise.resolve()

  await driver.get('https://wx.qq.com/')
  t.pass('should open wx.qq.com')

  const n = (await wb.getBrowserPids()).length
  // console.log(n)
  // await new Promise((resolve) => {
  //   setTimeout(() => {
  //     resolve()
  //   }, 3000)
  // })
  t.truthy(n > 0, 'should exist browser process after get()')

  const retAdd = await driverExecute('return 1+1')
  t.is(retAdd, 2, 'should return 2 for execute 1+1 in browser')

  const retInject = await driverExecute(injectio, 8788)
  t.truthy(retInject, 'should return a object contains status of inject operation')
  t.is(retInject.code, 200, 'should got code 200 for a success wechaty inject')

  await wb.quit()

  return

  //////////////////////////////////
  function driverExecute(arg1: any, arg2?: any) {
    return driver.executeScript.apply(driver, arguments)
  }
})
