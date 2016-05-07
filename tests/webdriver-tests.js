const path = require('path')
const test = require('tape')

const WebDriver = require('selenium-webdriver')
const Browser = WebDriver.Browser
const By = WebDriver.By

const WebBrowser = require('../lib/puppet-web-browser')

test('WebDriver smoking test', function(t) {
  const driver = new WebDriver.Builder()
  .withCapabilities(WebDriver.Capabilities.chrome()).build()
    // .set('webdriver.load.strategy', 'unstable') 
    // https://stackoverflow.com/questions/37071807/how-to-executescript-before-page-load-by-webdriver-in-selenium

  const injectio = new WebBrowser().getInjectio()
  
  driver.get('https://wx.qq.com/')
  .then(() => {
    Promise.all([
      execute('return 1+1')     // ret_add
      , execute(injectio, 8788) // ret_inject
    ]).then(([
      ret_add
      , ret_inject
    ]) => {
      t.equal(ret_add   , 2         , 'execute js in browser')
      t.equal(ret_inject, 'Wechaty' , 'injected wechaty')

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
