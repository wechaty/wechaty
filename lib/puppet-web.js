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

    ['message', 'login', 'logout'].map( event => {
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
  getLoginQrImgUrl(cb) {
    return this.server.getLoginQrImgUrl(cb)
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

    const express = initExpress()
    const server  = initHttpsServer(express, port)
    const io      = initSocketIo(server)

    const browser = this.browser  = new WebBrowser(port)
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
    }, app).listen(port, function () {
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
    const io = io.listen(server, {
      log: true
    })

    io.sockets.on('connection', function(sock) {
      console.log('socket.on connection entried')
      socket = sock

      socket.on('disconnect', function() {
        socket = null
      })

      /**
       *
       * io events proxy between server & browser
       *
       */
      [ 'message'
        , 'login'
        , 'logout'
      ].map(event => { 
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

    return io
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
    const BROWSER = 'chrome'

    const driver = this.driver = new WebDriver.Builder().forBrowser('chrome').build()

    open()
    .then(inject)
  }

  open() {
    this.driver.get(WX_URL) // open wechat web page

    console.log('waitting for dom ready')
    this.driver.wait(function () {
      return this.driver.isElementPresent(WebDriver.By.css('.login_box'))
    }, 5*1000, '\nFailed to wait .login_box')

    console.log('ready!')
  }

  inject(cb) {
    const injectio = fs.readFileSync(
      path.join(__dirname, 'puppet-web-injectio.js')
    )

    console.log('start injecting')
    this.driver.executeScript(injectio).then(ret => { 
      console.log('injected: ' + ret)
      cb(ret)
    })
  }

  other() {
      console.log('start wait Login')
      function startCheck() {
        driver.executeScript('return Wechaty.getLoginStatusCode()').then( function (c) {
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

    //driver.quit()

    return driver
  }

  getLoginQrImgUrl(cb) {
    if (!this.driver) 
      throw new Error('driver not found')

    this.driver
    .executeScript('return Wechaty.getLoginQrImgUrl()')
    .then(cb)
  }



}


module.exports = PuppetWeb
