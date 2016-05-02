/**
 *
 * wechaty-lib - Robot API/SDK Library for Personal WeChat(微信) Account
 *
 * Web Soul of Puppet
 * use to control wechat web.
 *
 * Licenst: MIT
 * https://github.com/zixia/wechaty-lib
 *
 */


/**
 *
 * Class PuppetWeb
 *
 */
const EventEmitter = require('events')

class PuppetWeb extends EventEmitter {
  constructor() {
    super()
    const PORT    = 8788 // W(87) X(88), ascii char code ;-]
    const server  = this.server   = new WebServer(PORT)

    const EVENTS  = [
      'message'
      , 'login'
      , 'logout'
    ]

    EVENTS.map( event => {
      server.on(event, data => { this.emit(event, data) })
    })
  }

  /**
   *
   *  Interface Methods
   *
   */
  alive() {
    return this.server && this.server.isLogined()
  }

  /**
   *
   *  Public Methods
   *
   */
  getLoginQrImgUrl() {
    return this.server.browserProxy('Wechaty.getLoginQrImgUrl()')
  }


}


/**
 *
 * Class WebServer
 *
 */

const fs          = require('fs')
const io          = require('socket.io')
const https       = require('https')
const bodyParser  = require('body-parser')

const Express   = require('express')

class WebServer extends EventEmitter {
  constructor(port) {
    super()

    /**
     *
     * io events proxy between server & browser
     *
     */
    this.WEBSERVER_EVENTS =  [ 
      'message'
      , 'login'
      , 'logout'
    ]

    const express   = this.initExpress()
    const server    = this.initHttpsServer(express, port)
    const socketio  = this.initSocketIo(server)

    const browser   = this.browser  = new WebBrowser(port)

    this.online     = false

    this.on('login' , () => { this.online = true })
    this.on('logout', () => { this.online = false })
  }

  /**
   *
   * Https Server
   *
   */
  initHttpsServer(express, port) {
    // http://blog.mgechev.com/2014/02/19/create-https-tls-ssl-application-with-express-nodejs/
    // openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365
    // openssl rsa -in key.pem -out newkey.pem && mv newkey.pem key.pem
    return https.createServer({
      key: fs.readFileSync('key.pem'),
      cert: fs.readFileSync('cert.pem')
    }, express).listen(port, function () {
      console.log('Example app listening on port ' + port + '!')
    })
  }

  /**
   *
   * Express Middleware
   *
   */
  initExpress() {
    const app = new Express()

    app.use(bodyParser.json())
    app.use(function(req, res, next) {
      res.header("Access-Control-Allow-Origin", "*")
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
      next()
    })

    app.get('/', function (req, res) {
      console.log(new Date())
      res.send('Hello World!')
    })

    app.post('/', function (req, res) {
      console.log('post ' + new Date())
      console.log(req.body)
      res.send(req.body)
    })

    return app
  }

  /**
   *
   * Socket IO
   *
   */
  initSocketIo(server) {
    const ioServer = io.listen(server, {
      log: true
    })

    ioServer.sockets.on('connection', function(sock) {
      console.log('socket.on connection entried')
      socket = sock

      socket.on('disconnect', function() {
        socket = null
      })

      this.WEBSERVER_EVENTS.map(event => { 
        // Events <--from-- Wechaty@Broswer
        socket.on(event, data => { 
          console.log(`recv even ${event} from browser`)
          this.emit(event, data) 
        })

        // Event --to--> Wechaty@Browser
        this.on(event, data => { 
          console.log(`sent even ${event} to browser`)
          socket.emit(event, data) 
        })
      })

      /**
       * prevent lost event: buffer new event received when socket disconnected
       while (buff.length) {
       let e = buff.shift()
       socket.emit(e.event, e.data)
       }
       */
    })

    return ioServer
  }

  isLogined() {
    return this.online
  }

  browserProxy(wechatyFunction) {
    if (!this.browser) throw new Error('theres no broswer found in server instance!')

      return this.browser.executeScript(wechatyFunction)
  }
}


/*
 */


/**
 *
 * Class WebBrowser
 *
 */
const path      = require('path')
const WebDriver = require('selenium-webdriver')

class WebBrowser {
  constructor(port) {
    const BROWSER = this.BROWSER  = 'chrome'
    const PORT    = this.PORT     = port || 8788
    const driver  = this.driver   = new WebDriver.Builder().forBrowser(BROWSER).build()

    this.open()
    .then(this.inject.bind(this))

    this.loop()
  }

  open() {
    const WX_URL = 'https://wx.qq.com'
    this.driver.get(WX_URL) // open wechat web page

    console.log('waitting for dom ready')

    return this.driver.wait(() => {
      return this.driver.isElementPresent(WebDriver.By.css('div.login_box'))
    }, 60*1000, '\nFailed to wait div.login_box')
  }

  inject() {
    const injectio = fs.readFileSync(
      path.join(__dirname, 'puppet-web-injectio.js')
      , 'utf8'
    )

    console.log('start injecting')

    return this.executeScript(injectio, this.PORT)
  }

  loop() {
    console.log('start wait Login')

    const that = this
    function startCheck() {
      that.executeScript('return Wechaty.getLoginStatusCode()').then( function (c) {
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

  }

  quit() {
    return this.driver.quit()
  }

  getLoginQrImgUrl() {
    return this.executeScript('return Wechaty.getLoginQrImgUrl()')
  }

  executeScript(script) {
    if (!this.driver) 
      throw new Error('driver not found')

    // a promise
    return this.driver
    .executeScript(script)
  }
}


module.exports = PuppetWeb
