const path  = require('path')
const co    = require('co')
const test   = require('tap').test
const log   = require('npmlog')
//log.level = 'silly'

const WebDriver = require('selenium-webdriver')
const Browser = WebDriver.Browser
const By = WebDriver.By

const PuppetWebBrowser  = require('../src/puppet-web-browser')
const PuppetWebBridge   = require('../src/puppet-web-bridge')
const PORT = 58788

test('WebDriver smoke testing', function(t) {
  const wb = new PuppetWebBrowser({port: PORT})
  t.ok(wb, 'Browser instnace')

  const bridge = new PuppetWebBridge({browser: wb})
  t.ok(bridge, 'Bridge instnace')

  var driver // for help function `execute`

  co(function* () {
    driver = yield wb.initDriver()
    t.ok(driver, 'driver inited')

    const injectio = bridge.getInjectio()
    t.ok(injectio.length > 10, 'got injectio')

    yield driver.get('https://wx.qq.com/')
    t.pass('driver got url')

    const retAdd = yield execute('return 1+1')
    t.equal(retAdd, 2, 'execute js in browser')

    const retInject = yield execute(injectio, PORT)
    t.equal(retInject, 'Wechaty', 'injected wechaty')

  })
  .catch(e => { // REJECTED
    t.ok(false, 'promise rejected. e:' + e)
  })
  .then(() => { // FINALLY
    t.end()
    driver.quit()
  })
  .catch(e => { // EXCEPTION
    t.fail('exception got:' + e)
  })

  return

  //////////////////////////////////

  function execute() {
    return driver.executeScript.apply(driver, arguments)
  }
})
