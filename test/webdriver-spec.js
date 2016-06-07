'use strict'

const path  = require('path')
const co    = require('co')
const test   = require('tap').test
const log   = require('npmlog')
// log.level = 'verbose'
// log.level = 'silly'

const WebDriver = require('selenium-webdriver')
const Browser = WebDriver.Browser
const By = WebDriver.By

const PuppetWebBrowser  = require('../src/puppet-web-browser')
const PuppetWebBridge   = require('../src/puppet-web-bridge')
const PORT = 58788

function driverProcessNum() {
  return new Promise((resolve, reject) => {
    require('ps-tree')(process.pid, (err, children) => {
      if (err) { return reject(err) }
      children.forEach(child => log.silly('TestingWebDriver', 'ps-tree: %s %s', child.PID, child.COMMAND))
      const num = children.filter(child => /phantomjs/i.test(child.COMMAND)).length
      return resolve(num)
    })
  })
}

test('WebDriver process create & quit test', function(t) {
  co(function* () {
    const b = new PuppetWebBrowser({port: PORT})
    t.ok(b, 'Browser instnace')

    yield b.init()
    yield b.open()
    t.pass('inited & opened')

    let n = yield driverProcessNum()
    t.ok(n > 0, 'driver process exist')

// console.log(b.driver.getSession())

    yield b.quit()
    t.pass('quited')

    n = yield driverProcessNum()
    t.equal(n, 0, 'no driver process after quit')
  })
  .catch(e => { t.fail(e) })
  .then(t.end.bind(t))

  return
})

// XXX WTF with co module???
test('WebDriver smoke testing', function(t) {
  const wb = new PuppetWebBrowser()
  t.ok(wb, 'Browser instnace')

  const bridge = new PuppetWebBridge({browser: wb, port: PORT})
  t.ok(bridge, 'Bridge instnace')

  var driver // for help function `execute`

  co(function* () {
    const m = yield driverProcessNum()
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

    const n = yield driverProcessNum()
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

test('WebDriver WTF testing', function(t) {
  const wb = new PuppetWebBrowser()
  t.ok(wb, 'Browser instnace')

  const bridge = new PuppetWebBridge({browser: wb, port: PORT})
  t.ok(bridge, 'Bridge instnace')

  var driver // for help function `execute`
  var injectio

  driverProcessNum()
  .then(n => {
    t.equal(n, 0, 'driver process not exist before get()')

    return wb.initDriver()
  })
  .then(d => {
    driver = d
    t.ok(driver, 'driver inited')

    return bridge.getInjectio()
  })
  .then(r => {
    injectio = r
    t.ok(injectio.length > 10, 'got injectio')

    return driver.get('https://wx.qq.com/')
  })
  .then(r => {
    t.pass('driver url opened')

    return driverProcessNum()
  })
  .then(n => {
    t.ok(n > 0, 'driver process exist after get()')

    return execute('return 1+1')
  })
  .then(retAdd => {
    t.equal(retAdd, 2, 'execute js in browser')

    return execute(injectio, PORT)
  })
  .then(retInject => {
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
