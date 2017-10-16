/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   @copyright 2016-2017 Huan LI <zixia@zixia.net>
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */

/**
 * DO NOT use `require('../')` here!
 * because it will casue a LOOP require ERROR
 */
// import Brolog       from 'brolog'
import StateSwitch  from 'state-switch'

import {
  config,
  log,
}                       from './config'
import { Io }           from './io'
import { Wechaty }      from './wechaty'

export interface IoClientOptions {
  token    : string,
  wechaty? : Wechaty,
}

export class IoClient {

  private io: Io // XXX keep io `null-able` or not? 20161026

  private state = new StateSwitch<'online', 'offline'>('IoClient', 'offline', log)

  constructor(
    public options: IoClientOptions,
  ) {
    log.verbose('IoClient', 'constructor({ token = %s})', options.token)

    options.token   = options.token   || config.token || config.DEFAULT_TOKEN,
    options.wechaty = options.wechaty || Wechaty.instance({ profile: this.options.token })

    this.io = new Io({
      wechaty : this.options.wechaty as Wechaty,
      token   : this.options.token,
    })

  }

  public async init(): Promise<void> {
    log.verbose('IoClient', 'init()')

    if (this.state.inprocess()) {
      const e = new Error('state.inprocess(), skip init')
      log.warn('IoClient', 'init() with %s', e.message)
      throw e
    }

    this.state.target('online')
    this.state.current('online', false)

    try {
      await this.initIo()
      await this.initWechaty(this.options.wechaty as Wechaty)
      this.state.current('online')
    } catch (e) {
      log.error('IoClient', 'init() exception: %s', e.message)
      this.state.current('offline')
      throw e
    }
    return
  }

  private async initWechaty(wechaty: Wechaty): Promise<void> {
    log.verbose('IoClient', 'initWechaty()')

    if (this.state.target() !== 'online') {
      const e = new Error('state.target() is not `online`, skipped')
      log.warn('IoClient', 'initWechaty() %s', e.message)
      throw e
    }

    wechaty
    .on('login'	     , user => log.info('IoClient', `${user.name()} logined`))
    .on('logout'	   , user => log.info('IoClient', `${user.name()} logouted`))
    .on('scan', (url, code) => log.info('IoClient', `[${code}] ${url}`))
    .on('message'     , msg => this.onMessage(msg))

    try {
      await wechaty.init()
      log.verbose('IoClient', 'wechaty.init() done')
    } catch (e) {
      log.error('IoClient', 'init() init fail: %s', e)
      wechaty.quit()
      throw e
    }

    return
  }

  private async initIo(): Promise<void> {
    log.verbose('IoClient', 'initIo() with token %s', this.options.token)

    if (this.state.target() !== 'online') {
      const e = new Error('initIo() targetState is not `connected`, skipped')
      log.warn('IoClient', e.message)
      throw e
    }

    try {
      await this.io.init()
    } catch (e) {
      log.verbose('IoClient', 'initIo() init fail: %s', e.message)
      throw e
    }

    return
  }

  public initWeb(port = config.httpPort) {
//    if (process.env.DYNO) {
//    }
    const app = require('express')()

    app.get('/', function (req, res) {
      res.send('Wechaty IO Bot Alive!')
    })

    return new Promise((resolve) => {
      app.listen(port, () => {
        log.verbose('IoClient', 'initWeb() Wechaty IO Bot listening on port ' + port + '!')

        return resolve(this)

      })
    })
  }

  private onMessage(m) {
    // const from = m.from()
    // const to = m.to()
    // const content = m.toString()
    // const room = m.room()

    // log.info('Bot', '%s<%s>:%s'
    //               , (room ? '['+room.topic()+']' : '')
    //               , from.name()
    //               , m.toStringDigest()
    //         )

    if (/^wechaty|chatie|botie/i.test(m.content()) && !m.self()) {
      m.say('https://www.wechaty.io')
        .then(_ => log.info('Bot', 'REPLIED to magic word "chatie"'))
    }
  }

  public async start(): Promise<void> {
    log.verbose('IoClient', 'start()')

    // if (!this.options.wechaty) {
    //   return this.init()
    // }

    if (this.state.inprocess()) {
      log.warn('IoClient', 'start() with a pending state, not the time')
      throw new Error('pending')
    }

    this.state.target('online')
    this.state.current('online', false)

    try {
      await this.initIo()
      this.state.current('online')
    } catch (e) {
      log.error('IoClient', 'start() exception: %s', e.message)
      this.state.current('offline')
      throw e
    }
    return
  }

  public async stop(): Promise<void> {
    log.verbose('IoClient', 'stop()')

    this.state.target('offline')
    this.state.current('offline', false)

    // XXX
    if (!this.io) {
      log.warn('IoClient', 'stop() without this.io')
      // this.currentState('connected')
      this.state.current('offline')
      return
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
    log.verbose('IoClient', 'restart()')

    try {
      await this.stop()
      await this.start()
    } catch (e) {
      log.error('IoClient', 'restart() exception %s', e.message)
      throw e
    }
    return
  }

  public async quit(): Promise<void> {
    log.verbose('IoClient', 'quit()')

    if (this.state.current() === 'offline' && this.state.inprocess()) {
      log.warn('IoClient', 'quit() with currentState() = `disconnecting`, skipped')
      throw new Error('quit() with currentState = `disconnecting`')
    }

    this.state.target('offline')
    this.state.current('offline', false)

    try {
      if (this.options.wechaty) {
        await this.options.wechaty.quit()
        // this.wechaty = null
      } else { log.warn('IoClient', 'quit() no this.wechaty') }

      if (this.io) {
        await this.io.quit()
        // this.io = null
      } else { log.warn('IoClient', 'quit() no this.io') }

      this.state.current('offline')

    } catch (e) {
      log.error('IoClient', 'exception: %s', e.message)

      // XXX fail safe?
      this.state.current('offline')

      throw e
    }

    return

  }
}

export default IoClient
