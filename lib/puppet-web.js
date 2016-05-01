const WebDriver = require('selenium-webdriver')
const Puppet    = require('puppet')

class PuppetWeb extends Puppet {

  constructor() {
    super()

    this.browser = this.initBrowser()

    this.injectBrowser()
  }

  initBrowser() {
    const browser = new WebDriver.Builder()
    .forBrowser('chrome').build()

    browser.get('https://wx.qq.com')

    const PORT = 8788 // W(87) X(88), ascii char code ;-]
    const injectScript = `
    ;(function () {
      var injector  = angular.element(document).injector()
      var rootScope = injector.get("$rootScope")
      var http      = injector.get("$http")

      rootScope.$on("message:add:success", function (event, data) { http.post("https://localhost:${PORT}", data) })'

      var chatFactory = injector.get("chatFactory")
      var confFactory = injector.get("confFactory")

      var loginScope = angular.element(".login_box").scope()

      window.Wechaty = {
        getLoginStatusCode:   function () { return loginScope.code }
        , getLoginQrcodeUrl:  function () { return loginScope.qrcodeUrl }
        , isReady:            function () { return !!(angular && angular.element && angular.element("body")) }
        , isLogined:          function () { return 200===loginScope.code }
      }
    }())
`

    /*
    MMCgi.isLogin
    loginScope.qrcodeUrl
    loginScope.code
    0:   显示二维码
    201: 扫描，未确认
    200: 登录成功
    408: 未确认

    */


    console.log('SOURCE: ############\n' + wechatyInjectedScript + '\n##############\n')

    console.log('waitting for dom ready')
    browser.wait(function () {
      return browser.isElementPresent(webdriver.By.css('.login_box'))
    }, 5*1000, '\nFailed to wait .login_box')

    console.log('ready!')

    console.log('start injecting')
    browser.executeScript(wechatyInjectedScript).then( function (ret) { 
      console.log('injected: ' + ret)

      console.log('start wait Login')
      function startCheck() {
        browser.executeScript('return Wechaty.getLoginStatusCode()').then( function (c) {
          console.log('got code: ' + c)
          if (200!=c) {
            setTimeout(startCheck, 500)
          } else {
            doLogin()
          }
        })
      }
      startCheck()

      function doLogin() {
        console.log('logined?!')
      }

    })

    //browser.quit();

  }
}
