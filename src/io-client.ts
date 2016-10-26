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

/**
 * DO NOT use `require('../')` here!
 * because it will casue a LOOP require ERROR
 */
// import Brolog   from 'brolog'

import Config       from './config'
import Io           from './io'
import StateMonitor from './state-monitor'
import Wechaty      from './wechaty'
import brolog       from './brolog-env'

export class IoClient {

  private wechaty: Wechaty
  private io: Io // XXX keep io `null-able` or not? 20161026

  private state = new StateMonitor<'online', 'offline'>('IoClient', 'offline')

  constructor(
      private token: string = Config.token || Config.DEFAULT_TOKEN
    , private log: any = brolog
  ) {
    if (!log) {
      const e = new Error('constructor() log(npmlog/brolog) must be set')
      throw e
    }
    this.log.verbose('IoClient', 'constructor() with token: %s', token)

    if (!token) {
      const e = new Error('constructor() token must be set')
      this.log.error('IoClient', e.message)
      throw e
    }

    this.wechaty = Wechaty.instance({
      profile: token
    })

    this.io = new Io({
      wechaty: this.wechaty
      , token: this.token
    })

  }

  public async init(): Promise<void> {
    this.log.verbose('IoClient', 'init()')

    // if (/connecting|disconnecting/.test(this.currentState())) {
    if (this.state.inprocess()) {
      const e = new Error('state.inprocess(), skip init')
      this.log.warn('IoClient', 'init() with %s', e.message)
      throw e
    }

    // this.targetState('connected')
    // this.currentState('connecting')
    this.state.target('online')
    this.state.current('online', false)

    try {
      await this.initIo()
      await this.initWechaty()
      // this.currentState('connected')
      this.state.current('online')
      return
    } catch (e) {
      this.log.error('IoClient', 'init() exception: %s', e.message)
      // this.currentState('disconnected')
      this.state.current('offline')
      throw e
    }
  }

  private async initWechaty(): Promise<void> {
    this.log.verbose('IoClient', 'initWechaty()')

    // if (this.targetState() !== 'connected') {
    if (this.state.target() !== 'online') {
      const e = new Error('state.target() is not `online`, skipped')
      this.log.warn('IoClient', 'initWechaty() %s', e.message)
      throw e
    }

    const wechaty = this.wechaty

    if (!wechaty) {
      throw new Error('no Wechaty')
    }

    wechaty
    .on('login'	     , user => this.log.info('IoClient', `${user.name()} logined`))
    .on('logout'	   , user => this.log.info('IoClient', `${user.name()} logouted`))
    .on('scan', (url, code) => this.log.info('IoClient', `[${code}] ${url}`))
    .on('message' , message => {
      message.ready()
            .then(this.onMessage.bind(this))
            .catch(e => this.log.error('IoClient', 'message.ready() %s' , e))
    })

    await wechaty.init()
                  .then(_ => {
                    this.log.verbose('IoClient', 'wechaty.init() succ')
                    return wechaty
                  })
                  .catch(e => {
                    this.log.error('IoClient', 'init() init fail: %s', e)
                    wechaty.quit()
                    throw e
                  })
    return
  }

  private async initIo(): Promise<void> {
    this.log.verbose('IoClient', 'initIo() with token %s', this.token)

    // if (this.targetState() !== 'connected') {
    if (this.state.target() !== 'online') {
      const e = new Error('initIo() targetState is not `connected`, skipped')
      this.log.warn('IoClient', e.message)
      throw e
    }

    // const io = this.io = new Io({
    //   wechaty: this.wechaty
    //   , token: this.token
    // })

    const io = this.io

    await io.init()
            .catch(e => {
              this.log.verbose('IoClient', 'initIo() init fail: %s', e.message)
              throw e
            })
    return
  }

  public initWeb(port = Config.httpPort) {
//    if (process.env.DYNO) {
//    }
    const app = require('express')()

    app.get('/', function (req, res) {
      res.send('Wechaty IO Bot Alive!')
    })

    return new Promise((resolve) => {
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
    const puppet = Config.puppetInstance()

    if (/^wechaty|botie/i.test(m.content()) && !m.self()) {
      puppet.reply(m, 'https://www.wechaty.io')
        .then(_ => this.log.info('Bot', 'REPLIED to magic word "wechaty"'))
    }
  }

  public async start(): Promise<void> {
    this.log.verbose('IoClient', 'start()')

    if (!this.wechaty) {
      return this.init()
    }

    // if (/connecting|disconnecting/.test(this.currentState())) {
    if (this.state.inprocess()) {
      this.log.warn('IoClient', 'start() with a pending state, not the time')
      return Promise.reject('pending')
    }

    // this.targetState('connected')
    // this.currentState('connecting')
    this.state.target('online')
    this.state.current('online', false)

    try {
      await this.initIo()
              // .then(() => {
              //   // this.io = io
              //   // this.currentState('connected')
      this.state.current('online')
      return
    } catch (e) {
      this.log.error('IoClient', 'start() exception: %s', e.message)
      // this.currentState('disconnected')
      this.state.current('offline')
      throw e
    }
  }

  public async stop(): Promise<void> {
    this.log.verbose('IoClient', 'stop()')
    // this.targetState('disconnected')
    // this.currentState('disconnecting')
    this.state.target('offline')
    this.state.current('offline', false)

    // XXX
    if (!this.io) {
      this.log.warn('IoClient', 'stop() without this.io')
      // this.currentState('connected')
      this.state.current('online')
      return Promise.resolve()
    }

    await this.io.quit()
                    // .then(_ => this.currentState('disconnected'))
                    // .then(_ => this.state.current('offline'))
    this.state.current('offline')

    // XXX 20161026
    // this.io = null
    return
  }

  public async restart(): Promise<void> {
    this.log.verbose('IoClient', 'restart()')

    try {
      await this.stop()
      await this.start()
      return
    } catch (e) {
      this.log.error('IoClient', 'restart() exception %s', e.message)
      throw e
    }
  }

  public async quit(): Promise<void> {
    this.log.verbose('IoClient', 'quit()')

    // if (this.currentState() === 'disconnecting') {
    if (this.state.current() === 'offline' && this.state.inprocess()) {
      this.log.warn('IoClient', 'quit() with currentState() = `disconnecting`, skipped')
      return Promise.reject('quit() with currentState = `disconnecting`')
    }

    // this.targetState('disconnected')
    // this.currentState('disconnecting')
    this.state.target('offline')
    this.state.current('offline', false)

    try {
      if (this.wechaty) {
        await this.wechaty.quit()
        // this.wechaty = null
      } else { this.log.warn('IoClient', 'quit() no this.wechaty') }

      if (this.io) {
        await this.io.quit()
        // this.io = null
      } else { this.log.warn('IoClient', 'quit() no this.io') }

      // this.currentState('disconnected')
      this.state.current('offline')

      return

    } catch (e) {
      this.log.error('IoClient', 'exception: %s', e.message)

      // XXX fail safe?
      // this.currentState('disconnected')
      this.state.current('offline')

      throw e
    }
  }
}

export default IoClient
