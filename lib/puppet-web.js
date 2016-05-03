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


/**************************************
 *
 * Class PuppetWeb
 *
 ***************************************/
const EventEmitter = require('events')

class PuppetWeb extends EventEmitter {
  constructor(port) {
    super()
    const PORT    = 8788 // W(87) X(88), ascii char code ;-]

    this.port = port || PORT
    const server  = this.server   = new WebServer(this.port)

    const EVENTS_IN  = [
      'message'
      , 'login'
      , 'logout'
    ]
    EVENTS_IN.map( event => 
      server.on(event, data => this.emit(event, data) ) 
    )

    const EVENTS_OUT = [
      'sent'
    ]
    EVENTS_OUT.map( event => 
      this.on(event, data => server.emit(event, data) )
    )
  }

  /**
   *
   *  Interface Methods
   *
   */
  alive()   { return this.server && this.server.isLogined() }
  destroy() {
    if (this.server) {
      this.server.quit()
      delete this.server
    }
  }

  /**
   *
   *  Public Methods
   *
   */
  getLoginQrImgUrl()   { return this.server.Wechaty_getLoginQrImgUrl()   }
  getLoginStatusCode() { return this.server.Wechaty_getLoginStatusCode() }
}


/****************************************
 *
 * Class WebServer
 *
 *
 *
 *
 *
 *
 *
 ***************************************/

const fs          = require('fs')
const io          = require('socket.io')
const https       = require('https')
const bodyParser  = require('body-parser')

const Express   = require('express')

class WebServer extends EventEmitter {
  constructor() {
    super()
    /**
     * io events proxy between server & browser
     */
    this.EVENTS_IN =  [ 
      'message'
      , 'login'
      , 'logout'
      , 'unload'
    ]

    this.EVENTS_OUT =  [ 
      'send'
      , 'logout'
    ]

    this.logined  = false

    this.on('login' , () => this.logined = true  )
    this.on('logout', () => this.logined = false )

  }

  init(port) {
    this.port = port || 8788

    this.express  = this.initExpress()
    this.server   = this.initHttpsServer(this.express, this.port)
    this.socketio = this.initSocketIo(this.server)

    this.browser  = new WebBrowser()
    this.browser.init(this.port)
    .then(() => {
      console.error('browser init finished with port: ' + this.port + '.')
      this.on('unload', () => {
        console.error('webserver received unload event')
        this.browser.inject()
        .then(() => console.error('re-injected'))
      })
    })
    

    // this.debugLoop()
  }

  /**
   *
   * Https Server
   *
   */
  initHttpsServer(express, port) {
    port = port || this.port
    // http://blog.mgechev.com/2014/02/19/create-https-tls-ssl-application-with-express-nodejs/
    // openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365
    // openssl rsa -in key.pem -out newkey.pem && mv newkey.pem key.pem
    return https.createServer({
      key: fs.readFileSync (path.join(path.dirname(__filename), 'key.pem')),
      cert: fs.readFileSync(path.join(path.dirname(__filename), 'cert.pem'))
    }, express).listen(port, () => {
      console.error(`initHttpsServer listening on port ${port}!`)
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

    app.get('/ping', function (req, res) {
      console.error(new Date() + ' GET /ping')
      res.send('pong')
    })

    // app.post('/', function (req, res) {
    //   console.log('post ' + new Date())
    //   console.log(req.body)
    //   res.send(req.body)
    // })

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

    ioServer.sockets.on('connection', (s) => {
      console.log('socket.on connection entried')
      let socket = s

      socket.on('disconnect', function() {
        console.error('socket.io disconnected')
        /**
        * Possible conditions:
        * 1. Browser reload
        * 2. Lost connection(Bad network
        * 3. 
        */
        socket = null
      })

      this.EVENTS_IN.map(event => { 
        // Events from Wechaty@Broswer --to--> Server
        socket.on(event, data => { 
          console.log(`recv event[${event}] from browser`)
          this.emit(event, data) 
        })
      })

      this.EVENTS_OUT.map(event => {
        // Event from Server --to--> Wechaty@Browser
        this.on(event, data => { 
          console.log(`sent even[${event}] to browser`)
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
    return this.logined
  }

  quit() {
    if (this.browser) {
      this.browser.quit()
      delete this.browser
    }

    if (this.server) {
      // TODO: close server
      console.log('todo: close & quite server')
    }
  }

  /**
  *
  * Proxy Call to Wechaty in Browser
  *
  */
  browserExecute(script) {
    if (!this.browser) 
      throw new Error('no browser!')
    return this.browser.execute(script)
  }

  proxyWechaty(wechatyFunc) {
    const args      = Array.prototype.slice.call(arguments, 1)
    const argsJson  = JSON.stringify(args)
    const wechatyScript = `return (Wechaty && Wechaty.${wechatyFunc}.apply(undefined, JSON.parse('${argsJson}')))`

    console.error('proxyWechaty: ' + wechatyScript)
    return this.browserExecute(wechatyScript)
  }

  Wechaty_getLoginStatusCode() { return this.proxyWechaty('getLoginStatusCode') }
  Wechaty_getLoginQrImgUrl()   { return this.proxyWechaty('getLoginQrImgUrl')   }
  // Wechaty_CARPEDIEM()          { return this.proxyWechaty('call')               }

  debugLoop() {
    this.Wechaty_getLoginStatusCode().then((c) => {
      console.error(`login status code: ${c}`)
      setTimeout(this.debugLoop.bind(this), 3000)
    })
  }
}


/*
 */


/****************************************
 *
 * Class WebBrowser
 *
 ***************************************/
const path      = require('path')
const WebDriver = require('selenium-webdriver')

class WebBrowser {
  constructor(browser) {
    const BROWSER = this.BROWSER  = browser || 'chrome'

    const driver  = this.driver   = new WebDriver.Builder().forBrowser(BROWSER).build()
  }

  init(port) {
    console.log(`browser inititializing... port: ${port}`)
    this.port = port || 8788
    return this.open().then(this.inject.bind(this))
  }

  open() {
    const WX_URL = 'https://wx.qq.com'
    return this.driver.get(WX_URL) // open wechat web page

    // return this.driver.wait(() => {
    //   return this.driver.isElementPresent(WebDriver.By.css('div.login_box'))
    // }, 60*1000, '\nFailed to wait div.login_box')
  }

  inject() {
    const injectio = fs.readFileSync(
      path.join(path.dirname(__filename), 'puppet-web-injectio.js')
      , 'utf8'
    )

    const socketio = fs.readFileSync(
      // 'https://cdnjs.cloudflare.com/ajax/libs/socket.io/1.4.5/socket.io.min.js'
      path.join(path.dirname(__filename), '/socket.io.min.js')
      , 'utf8'
    )

    console.error('injecting')
    return this.execute(socketio)
    .then(() => this.execute(injectio, this.port))
    .then(() => this.execute('Wechaty()'))
    .then(() => console.error('injected'))
  }

  quit() { 
    if (this.driver) {
      this.driver.quit() 
      delete this.driver
    }
  }

  execute(script, ...args) {
    if (!this.driver) 
      throw new Error('driver not found')
    // a promise
    return this.driver.executeScript(script, args)
  }
}

PuppetWeb.WebServer  = WebServer
PuppetWeb.WebBrowser = WebBrowser

module.exports = PuppetWeb
