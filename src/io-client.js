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
    token       = Config.token || Config.DEFAULT_TOKEN
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
    this.token = token
  }

  init() {
    this.log.verbose('IoClient', 'init()')

    return co.call(this, function* () {
      this.wechaty  = yield this.initWechaty()
      this.io       = yield this.initIo()
      return this
    }).catch(e => {
      this.log.error('IoClient', 'init() exception: %s', e.message)
      throw e
    })
  }

  initWechaty() {
    this.log.verbose('IoClient', 'initWechaty()')

    const wechaty = new Wechaty({
      profile: Config.DEFAULT_PROFILE
    })

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

  initIo() {
    this.log.verbose('IoClient', 'initIo()')

    if (!this.token) {
      this.log.verbose('IoClient', 'initIo() skiped for no token set')
      return Promise.resolve('no token')
    } else {
      this.log.verbose('IoClient', 'initIo(%s)', this.token)
    }

    const io = new Io({
      wechaty: this.wechaty
      , token: this.token
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
}

module.exports = IoClient.default = IoClient.IoClient = IoClient
