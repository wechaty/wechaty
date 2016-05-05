const Browser = require('./puppet-web-browser')

/****************************************
 *
 * Class Server
 *
 ***************************************/

const fs          = require('fs')
const io          = require('socket.io')
const path			= require('path')
const https       = require('https')
const bodyParser  = require('body-parser')

const Express       = require('express')
const EventEmitter  = require('events')

class Server extends EventEmitter {
  constructor(port) {
    super()

    this.port     = port || 8788 // W(87) X(88), ascii char code ;-]
    this.logined  = false

    this.on('login' , () => this.logined = true  )
    this.on('logout', () => this.logined = false )

  }

  init() {
    this.express  = this.createExpress()
    this.server   = this.createHttpsServer(this.express, this.port)
    this.socketio = this.createSocketIo(this.server)

    this.browser  = this.createBrowser()

    return new Promise((resolve, reject) => {
      this.browser.init()
      .then(() => {
        console.error('browser init finished with port: ' + this.port + '.')
        resolve() // after init success
      })
    })
  }

  createBrowser() {
  	const b = new Browser('chrome', this.port)

    /**
    * `unload` event is sent from js@browser to webserver via socketio
    * after received `unload`, we re-inject the Wechaty js code into browser.
    */
    this.on('unload', () => {
      console.error('server received unload event')
      this.browser.inject()
      .then(() => console.error('re-injected'))
    })

    return b
  }

  /**
   *
   * Https Server
   *
   */
  createHttpsServer(express, port) {
    port = port || this.port
    // http://blog.mgechev.com/2014/02/19/create-https-tls-ssl-application-with-express-nodejs/
    // openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365
    // openssl rsa -in key.pem -out newkey.pem && mv newkey.pem key.pem
    return https.createServer({
      key: fs.readFileSync (path.join(path.dirname(__filename), 'key.pem')),
      cert: fs.readFileSync(path.join(path.dirname(__filename), 'cert.pem'))
    }, express).listen(port, () => {
      console.error(`createHttpsServer listening on port ${port}!`)
    })
  }

  /**
   *
   * Express Middleware
   *
   */
  createExpress() {
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
  createSocketIo(server) {
    const socketServer = io.listen(server, {
      log: true
    })

    socketServer.sockets.on('connection', (s) => {
      console.log('socket.on connection entried')
      // save to instance: socketClient
      this.socketClient = s

      s.on('disconnect', function() {
        console.error('socket.io disconnected')
        /**
        * Possible conditions:
        * 1. Browser reload
        * 2. Lost connection(Bad network
        * 3. 
        */
        this.socketClient = null
      })

      // Events from Wechaty@Broswer --to--> Server
      const events = [
      	'message'
      	, 'login'
      	, 'logout'
      	, 'unload'
      ]
      events.map(e => { 
        s.on(e, data => { 
          console.log(`recv event[${e}] from browser`)
          this.emit(e, data) 
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

    return socketServer
  }

  isLogined() {
    return this.logined
  }

  quit() {
    if (this.browser) {
      this.browser.quit()
      delete this.browser
    }
	if (this.socketClient) {
		this.socketClient.disconnect(0)
		delete this.socketClient
	}
    if (this.socketServer) {
    	socketServer.httpsServer.close()
    	socketServer.close()
    	delete this.socketServer
    }
    if (this.server) {
    	this.server.close()
    	delete this.server
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

module.exports = Server
