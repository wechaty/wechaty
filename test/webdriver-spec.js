const path  = require('path')
const co    = require('co')
const test  = require('tape')
const log   = require('npmlog')
//log.level = 'silly'

const WebDriver = require('selenium-webdriver')
const Browser = WebDriver.Browser
const By = WebDriver.By

const PuppetWebBrowser = require('../src/puppet-web-browser')
const PORT = 58788

test('WebDriver smoke testing', function(t) {
  const wb = new PuppetWebBrowser({port: PORT})
  const driver = wb.getDriver()

  co(function* () {
    const injectio = PuppetWebBrowser.getInjectio()
    yield driver.get('https://wx.qq.com/')

    const retAdd = yield execute('return 1+1')
    t.equal(retAdd, 2, 'execute js in browser')
    
    const retInject = yield execute(injectio, 8788)
    t.equal(retInject, 'Wechaty', 'injected wechaty')

  })
  .catch(e => { // REJECTED
    t.ok(false, 'promise rejected. e:' + e)
  })
  .then(() => { // FINALLY
    t.end()
    driver.quit()
  })

  return

  //////////////////////////////////

  function execute() {
    return driver.executeScript.apply(driver, arguments)
  }
})
