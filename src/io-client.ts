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

// const co = require('co')

/**
 * DO NOT use `require('../')` here!
 * because it will casue a LOOP require ERROR
 */
// import Brolog   from 'brolog'

import Config   from './config'
import Io       from './io'
import Wechaty  from './wechaty'
import brolog   from './brolog-env'

class IoClient {
  private _targetState
  private _currentState

  private wechaty: Wechaty
  private io: Io

  constructor(
      private token: string = Config.token || Config.DEFAULT_TOKEN
    , private log = brolog
  ) {
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

    this.targetState('disconnected')
    this.currentState('disconnected')
  }

 // targetState : 'connected' | 'disconnected'
  private targetState(newState?) {
    if (newState) {
      this.log.verbose('IoClient', 'targetState(%s)', newState)
      this._targetState = newState
    }
    return this._targetState
  }

  // currentState : 'connecting' | 'connected' | 'disconnecting' | 'disconnected'
  private currentState(newState?) {
    if (newState) {
      this.log.verbose('IoClient', 'currentState(%s)', newState)
      this._currentState = newState
    }
    return this._currentState
  }

  public async init(): Promise<IoClient> {
    this.log.verbose('IoClient', 'init()')

    if (/connecting|disconnecting/.test(this.currentState())) {
      this.log.warn('IoClient', 'init() with currentState() with connecting, skip init')
      return Promise.reject('pending')
    }

    this.targetState('connected')
    this.currentState('connecting')

    this.wechaty  = new Wechaty({
      profile: Config.DEFAULT_PROFILE
    })

    // return co.call(this, function* () {
    try {
      this.io       = await this.initIo()
      this.wechaty  = await this.initWechaty()
      this.currentState('connected')
      return this
    // }).catch(e => {
    } catch (e) {
      this.log.error('IoClient', 'init() exception: %s', e.message)
      this.currentState('disconnected')
      throw e
    }
  }

  private initWechaty(): Promise<Wechaty> {
    this.log.verbose('IoClient', 'initWechaty()')

    if (this.targetState() !== 'connected') {
      this.log.warn('IoClient', 'initWechaty() targetState is not `connected`, skipped')
      return Promise.resolve(this.wechaty)
    }

    const wechaty = this.wechaty

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

  private initIo() {
    this.log.verbose('IoClient', 'initIo() with token %s', this.token)

    if (this.targetState() !== 'connected') {
      this.log.warn('IoClient', 'initIo() targetState is not `connected`, skipped')
      return Promise.resolve()
    }

    if (!this.wechaty) {
      throw new Error('initIo() need a wechaty instance')
    }

    const wechaty = this.wechaty

    const io = new Io({
      wechaty
      , token: this.token
    })

    return io.init()
            .catch(e => {
              this.log.verbose('IoClient', 'initIo() init fail: %s', e.message)
              throw e
            })
  }

  public initWeb(port = Config.httpPort) {
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

  private onMessage(m) {
    // const from = m.from()
    // const to = m.to()
    // const content = m.toString()
    // const room = m.room()

    // this.log.info('Bot', '%s<%s>:%s'
    //               , (room ? '['+room.topic()+']' : '')
    //               , from.name()
    //               , m.toStringDigest()
    //         )

    if (/^wechaty|botie/i.test(m.get('content')) && !bot.self(m)) {
      bot.reply(m, 'https://www.wechaty.io')
        .then(_ => this.log.info('Bot', 'REPLIED to magic word "wechaty"'))
    }
  }

  public start() {
    this.log.verbose('IoClient', 'start()')

    if (!this.wechaty) {
      return this.init()
    }

    if (/connecting|disconnecting/.test(this.currentState())) {
      this.log.warn('IoClient', 'start() with a pending state, not the time')
      return Promise.reject('pending')
    }

    this.targetState('connected')
    this.currentState('connecting')

    return this.initIo()
              .then(io => {
                this.io = io
                this.currentState('connected')
              })
              .catch(e => {
                this.log.error('IoClient', 'start() exception: %s', e.message)
                this.currentState('disconnected')
                throw e
              })
  }

  public stop() {
    this.log.verbose('IoClient', 'stop()')
    this.targetState('disconnected')
    this.currentState('disconnecting')

    if (!this.io) {
      this.log.warn('IoClient', 'stop() without this.io')
      this.currentState('connected')
      return Promise.resolve()
    }

    const p = this.io.quit()
                    .then(_ => this.currentState('disconnected'))
    // this.io = null
    return p
  }

  public restart() {
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

  public quit() {
    this.log.verbose('IoClient', 'quit()')

    if (this.currentState() === 'disconnecting') {
      this.log.warn('IoClient', 'quit() with currentState() = `disconnecting`, skipped')
      return Promise.reject('quit() with currentState = `disconnecting`')
    }

    this.targetState('disconnected')
    this.currentState('disconnecting')

    return co.call(this, function* () {

      if (this.wechaty) {
        yield this.wechaty.quit()
        this.wechaty = null
      } else { this.log.warn('IoClient', 'quit() no this.wechaty') }

      if (this.io) {
        yield this.io.quit()
        this.io = null
      } else { this.log.warn('IoClient', 'quit() no this.io') }

      this.currentState('disconnected')
    }).catch(e => {
      this.log.error('IoClient', 'exception: %s', e.message)

      // XXX fail safe?
      this.currentState('disconnected')

      throw e
    })
  }
}

// module.exports = IoClient.default = IoClient.IoClient = IoClient
export default IoClient
