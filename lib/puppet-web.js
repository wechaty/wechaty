const fs          = require('fs')
const https       = require('https')
const bodyParser  = require('body-parser')
const Express     = require('express')


const WebDriver = require('selenium-webdriver')
const Puppet    = require('./puppet')

class PuppetWeb extends Puppet {

  constructor() {
    super()

    this.PORT = 8788 // W(87) X(88), ascii char code ;-]

    this.server   = this.initServer()
    this.browser  = this.initBrowser()

//    this.injectBrowser()
  }

  initBrowser() {
    const browser = new WebDriver.Builder()
    .forBrowser('chrome').build()

    browser.get('https://wx.qq.com')

    const injectScript = `
    ;(function () {
      var injector  = angular.element(document).injector()
      var rootScope = injector.get("$rootScope")
      var http      = injector.get("$http")

      rootScope.$on("message:add:success", function (event, data) { http.post("https://localhost:${this.PORT}", data) })'

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


    console.log('SOURCE: ############\n' + injectScript + '\n##############\n')

    console.log('waitting for dom ready')
    browser.wait(function () {
      return browser.isElementPresent(WebDriver.By.css('.login_box'))
    }, 5*1000, '\nFailed to wait .login_box')

    console.log('ready!')

    console.log('start injecting')
    browser.executeScript(injectScript).then( function (ret) { 
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

    return browser
  }

  initServer() {
    const app = Express()

    // http://blog.mgechev.com/2014/02/19/create-https-tls-ssl-application-with-express-nodejs/
    // openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365
    // openssl rsa -in key.pem -out newkey.pem && mv newkey.pem key.pem

    const server = https.createServer({
      key: fs.readFileSync('key.pem'),
      cert: fs.readFileSync('cert.pem')
    }, app).listen(443);

    app.use(bodyParser.json());

    app.use(function(req, res, next) {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
      next();
    });

    app.get('/', function (req, res) {
      console.log(new Date())
      res.send('Hello World!');
    });

    app.post('/', function (req, res) {
      console.log('post ' + new Date())
      console.log(req.body)
      res.send(req.body)
    });


    app.listen(this.PORT, function () {
      console.log('Example app listening on port ' + this.PORT + '!')
    });

    return server
  }
}

module.exports = PuppetWeb
