'use strict'

const path  = require('path')
const co    = require('co')
const test   = require('tape')

const log   = require('../src/npmlog-env')

const WebDriver = require('selenium-webdriver')
const Browser = WebDriver.Browser
const By = WebDriver.By

const PuppetWebBrowser  = require('../src/puppet-web/browser')
const PuppetWebBridge   = require('../src/puppet-web/bridge')

test('WebDriver process create & quit test', function(t) {
  co(function* () {
    const b = new PuppetWebBrowser()
    t.ok(b, 'should instanciate a browser')

    yield b.init()
    t.pass('should be inited successful')
    yield b.open()
    t.pass('should open successful')

    let pids = yield b.getBrowserPids()
    t.ok(pids.length > 0, 'should exist browser process after b.open()')

// console.log(b.driver.getSession())

    yield b.quit()
    t.pass('quited')

    pids = yield b.getBrowserPids()
    t.equal(pids.length, 0, 'no driver process after quit')
  })
  .catch(e => { t.fail(e) })
  .then(_ => t.end())

  return
})

test('WebDriver smoke testing', function(t) {
  const wb = new PuppetWebBrowser()
  t.ok(wb, 'Browser instnace')

  const mockPuppet = {browser: wb}
  const bridge = new PuppetWebBridge({puppet: mockPuppet})
  t.ok(bridge, 'Bridge instnace')

  var driver // for help function `execute`

  co(function* () {
    const m = (yield wb.getBrowserPids()).length
    t.equal(m, 0, 'should has no browser process before get()')

    driver = yield wb.initDriver()
    t.ok(driver, 'should init driver success')

    const injectio = bridge.getInjectio()
    t.ok(injectio.length > 10, 'should got injectio script')

    // XXX: if get rid of this dummy,
    // driver.get() will fail due to cant start phantomjs process
    yield Promise.resolve()

    yield driver.get('https://wx.qq.com/')
    t.pass('should open wx.qq.com')

    const n = (yield wb.getBrowserPids()).length
    // console.log(n)
    // yield new Promise((resolve) => {
    //   setTimeout(() => {
    //     resolve()
    //   }, 3000)
    // })
    t.ok(n > 0, 'should exist browser process after get()')

    const retAdd = yield driverExecute('return 1+1')
    t.equal(retAdd, 2, 'should return 2 for execute 1+1 in browser')

    const retInject = yield driverExecute(injectio, 8788)
    t.ok(retInject, 'should return a object contains status of inject operation')
    t.equal(retInject.code, 200, 'should got code 200 for a success wechaty inject')

  })
  .catch(e => t.fail('promise rejected. e:' + e)) // Rejected
  .then(r => wb.quit())                           // Finally 1
  .then(r => t.end())                             // Finally 2
  .catch(e => t.fail('exception got:' + e))       // Exception

  return

  //////////////////////////////////
  function driverExecute() {
    return driver.executeScript.apply(driver, arguments)
  }
})
