/**
 *
 * wechaty: Wechat for Bot. and for human who talk to bot/robot
 *
 * Class IoClient
 * http://www.wechaty.io
 *
 * Licenst: ISC
 * https://github.com/wechaty/wechaty
 *
 */

const co = require('co')

/**
 * DO NOT use `require('../')` here!
 * because it will casue a LOOP require ERROR
 */
const Wechaty = require('./wechaty')
const Config  = require('./config')
const Io      = require('./io')
const brolog  = require('./brolog-env')

class IoClient {
  constructor({
    initToken   = Config.token || Config.DEFAULT_TOKEN
    , endpoint  = Config.endpoint
    , log       = brolog
  } = {}) {
    if (!log) {
      const e = new Error('constructor() log(npmlog/brolog) must be set')
      throw e
    }
    this.log = log
    this.log.verbose('IoClient', 'constructor() with token: %s', token)

    if (!token) {
      const e = new Error('constructor() token must be set')
      this.log.error('IoClient', e.message)
      throw e
    }
    this.token(initToken)
  }

  init() {
    this.log.verbose('IoClient', 'init()')

    const wechaty = this.wechaty  = new Wechaty({
      profile: Config.DEFAULT_PROFILE
    })
    return co.call(this, function* () {
      this.io       = yield this.initIo(this.wechaty)
      this.wechaty  = yield this.initWechaty(this.wechaty)
      return this
    }).catch(e => {
      this.log.error('IoClient', 'init() exception: %s', e.message)
      throw e
    })
  }

  initWechaty(wechaty) {
    this.log.verbose('IoClient', 'initWechaty()')

    wechaty
    .on('login'	       , user => this.log.info('IoClient', `${user.name()} logined`))
    .on('logout'	     , user => this.log.info('IoClient', `${user.name()} logouted`))
    .on('scan', ({url, code}) => this.log.info('IoClient', `[${code}] ${url}`))
    .on('message'   , message => {
      message.ready()
            .then(this.onMessage.bind(this))
            .catch(e => this.log.error('IoClient', 'message.ready() %s' , e))
    })

    return wechaty.init()
                  .then(_ => {
                    this.log.verbose('IoClient', 'wechaty.init() succ')
                    return wechaty
                  })
                  .catch(e => {
                    this.log.error('IoClient', 'init() init fail: %s', e)
                    wechaty.quit()
                    throw e
                  })
  }

  initIo(wechaty) {
    this.log.verbose('IoClient', 'initIo() with token %s', this.token())

    if (!wechaty) {
      throw new Error('initIo() need a wechaty instance')
    }
    
    const io = new Io({
      wechaty
      , token: this.token()
      , endpoint: this.endpoint
    })

    return io.init()
            .catch(e => {
              this.log.verbose('IoClient', 'initIo() init fail: %s', e.message)
              throw e
            })
  }

  initWeb(port = Config.httpPort) {
//    if (process.env.DYNO) {
//    }
    const app = require('express')()

    app.get('/', function (req, res) {
      res.send('Wechaty IO Bot Alive!')
    })

    return new Promise((resolve, reject) => {
      app.listen(port, () => {
        this.log.verbose('IoClient', 'initWeb() Wechaty IO Bot listening on port ' + port + '!')

        return resolve(this)

      })
    })
  }

  onMessage(m) {
    const from = m.from()
    const to = m.to()
    const content = m.toString()
    const room = m.room()

    // this.log.info('Bot', '%s<%s>:%s'
    //               , (room ? '['+room.name()+']' : '')
    //               , from.name()
    //               , m.toStringDigest()
    //         )

    if (/^wechaty|botie/i.test(m.get('content')) && !bot.self(m)) {
      bot.reply(m, 'https://www.wechaty.io')
        .then(_ => this.log.info('Bot', 'REPLIED to magic word "wechaty"'))
    }
  }

  start() {
    this.log.verbose('IoClient', 'start()')

    if (!this.wechaty) {
      return this.init()
    }
    
    return this.initIo(this.wechaty)
              .then(io => this.io = io)
  }

  stop() {
    this.log.verbose('IoClient', 'stop()')
    if (!this.io) {
      this.log.warn('IoClient', 'stop() without this.io')
      return Promise.resolve()
    }

    const p = this.io.quit()
    // this.io = null
    return p
  }

  restart() {
    this.log.verbose('IoClient', 'restart()')

    return co.call(this, function* () {
      yield this.stop()
      yield this.start()
      return this
    }).catch(e => {
      this.log.error('IoClient', 'restart() exception %s', e.message)
      throw e
    })
  }

  token(newToken) {
    if (newToken) {
      this.log.verbose('IoClient', 'token(%s)', newToken)
      this._token = newToken
    }
    return this._token
  }

  quit() {
    this.log.verbose('IoClient', 'quit()')

    return co.call(this, function* () {

      if (this.wechaty) {
        yield this.wechaty.quit()
        // this.wechaty = null
      } else { this.log.warn('IoClient', 'quit() no this.wechaty') }

      if (this.io) {
        yield this.io.quit()
        // this.io = null 
      } else { this.log.warn('IoClient', 'quit() no this.io') }

    }).catch(e => {
      this.log.error('IoClient', 'exception: %s', e.message)
      throw e
    })
  }
}

module.exports = IoClient.default = IoClient.IoClient = IoClient
