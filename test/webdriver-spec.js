'use strict'

const path  = require('path')
const co    = require('co')
const test   = require('tap').test

const log   = require('../src/npmlog-env')

const WebDriver = require('selenium-webdriver')
const Browser = WebDriver.Browser
const By = WebDriver.By

const PuppetWebBrowser  = require('../src/puppet-web-browser')
const PuppetWebBridge   = require('../src/puppet-web-bridge')

const PORT = process.env.WECHATY_PORT || 58788
const HEAD = process.env.WECHATY_HEAD || false

test('WebDriver process create & quit test', function(t) {
  co(function* () {
    const b = new PuppetWebBrowser({port: PORT, head: HEAD})
    t.ok(b, 'Browser instnace')

    yield b.init()
    t.pass('inited')
    yield b.open()
    t.pass('opened')

    let pids = yield b.getBrowserPids()
    t.ok(pids.length > 0, 'driver process exist')

// console.log(b.driver.getSession())

    yield b.quit()
    t.pass('quited')

    pids = yield b.getBrowserPids()
    t.equal(pids.length, 0, 'no driver process after quit')
  })
  .catch(e => { t.fail(e) })
  .then(t.end.bind(t))

  return
})

test('WebDriver smoke testing', function(t) {
  const wb = new PuppetWebBrowser({port: PORT, head: HEAD})
  t.ok(wb, 'Browser instnace')

  const mockPuppet = {browser: wb}
  const bridge = new PuppetWebBridge({puppet: mockPuppet, port: PORT})
  t.ok(bridge, 'Bridge instnace')

  var driver // for help function `execute`

  co(function* () {
    const m = (yield wb.getBrowserPids()).length
    t.equal(m, 0, 'driver process not exist before get()')

    driver = yield wb.initDriver()
    t.ok(driver, 'driver inited')

    const injectio = bridge.getInjectio()
    t.ok(injectio.length > 10, 'got injectio')

    // XXX: if get rid of this dummy,
    // driver.get() will fail due to cant start phantomjs process
    yield Promise.resolve()

    yield driver.get('https://wx.qq.com/')
    t.pass('driver url opened')

    const n = (yield wb.getBrowserPids()).length
    t.ok(n > 0, 'driver process exist after get()')

    const retAdd = yield execute('return 1+1')
    t.equal(retAdd, 2, 'execute js in browser')

    const retInject = yield execute(injectio, PORT)
    t.equal(retInject, 'Wechaty', 'injected wechaty')

  })
  .catch(e => t.fail('promise rejected. e:' + e)) // Rejected
  .then(r => wb.quit())                           // Finally 1
  .then(r => t.end())                             // Finally 2
  .catch(e => t.fail('exception got:' + e))       // Exception

  return

  //////////////////////////////////
  function execute() {
    return driver.executeScript.apply(driver, arguments)
  }
})
