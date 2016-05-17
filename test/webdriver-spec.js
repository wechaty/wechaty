const path  = require('path')
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

  const injectio = PuppetWebBrowser.getInjectio()

  driver.get('https://wx.qq.com/')
  .then(() => {
    Promise.all([
      execute('return 1+1')     // ret_add
      , execute(injectio, 8788) // ret_inject
    ]).then(([
      retAdd
      , retInject
    ]) => {
      t.equal(retAdd   , 2         , 'execute js in browser')
      t.equal(retInject, 'Wechaty' , 'injected wechaty')

      t.end()
      driver.quit()
    }).catch(e => {
      t.ok(false, 'promise rejected. e:' + e)
      t.end()
      driver.quit()
    })/* .finally(() => {
      console.log('final')
    })
   */
  })

  function execute() {
    return driver.executeScript.apply(driver, arguments)
  }
})
