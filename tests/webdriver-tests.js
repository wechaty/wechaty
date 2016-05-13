const path = require('path')
const test = require('tape')

const WebDriver = require('selenium-webdriver')
const Browser = WebDriver.Browser
const By = WebDriver.By

const WebBrowser = require('../src/puppet-web-browser')

test('WebDriver smoke testing', function(t) {
  /*
  const driver = new WebDriver.Builder()
  .withCapabilities(WebDriver.Capabilities.chrome()).build()
  */

  const driver = WebBrowser.getPhantomJsDriver()

  /*
  .withCapabilities(
    WebDriver.Capabilities.phantomjs()
    //.set('phantomjs.binary.path', 'D:\\cygwin64\\home\\zixia\\git\\wechaty\\node_modules\\phantomjs-prebuilt\\lib\\phantom\\bin\\phantomjs.exe')
  ).build()
 */
  // .set('webdriver.load.strategy', 'unstable')
  // https://stackoverflow.com/questions/37071807/how-to-executescript-before-page-load-by-webdriver-in-selenium

  const injectio = WebBrowser.getInjectio()

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
