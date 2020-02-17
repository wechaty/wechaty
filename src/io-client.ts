/**
 *   Wechaty - https://github.com/wechaty/wechaty
 *
 *   @copyright 2016-2018 Huan LI <zixia@zixia.net>
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
import { StateSwitch }  from 'state-switch'

import { PuppetHostieServer } from 'wechaty-puppet-hostie'
import { PuppetHostieGrpcServerOptions } from 'wechaty-puppet-hostie/dist/src/grpc/puppet-server'

import { Message }      from './user'

import {
  log,
}                      from './config'
import { Io }           from './io'
import { Wechaty }      from './wechaty'

export interface IoClientOptions {
  token   : string,
  wechaty : Wechaty,
}

export class IoClient {

  /**
   * Huan(20161026): keep io `null-able` or not?
   * Huan(202002): make it optional.
   */
  private io?: Io
  private hostieServer?: PuppetHostieServer

  private state: StateSwitch

  constructor (
    public options: IoClientOptions,
  ) {
    log.verbose('IoClient', 'constructor({token: %s})',
      options.token
    )

    this.state = new StateSwitch('IoClient', log)
  }

  private async startHostie () {
    log.verbose('IoClient', 'startHostie()')

    if (this.hostieServer) {
      throw new Error('hostie server exists')
    }

    const options: PuppetHostieGrpcServerOptions = {
      endpoint : '0.0.0.0:8788',
      puppet   : this.options.wechaty.puppet,
      token    : this.options.token,
    }
    this.hostieServer = new PuppetHostieServer(options)
    await this.hostieServer.start()
  }

  private async stopHostie () {
    log.verbose('IoClient', 'stopHostie()')

    if (!this.hostieServer) {
      throw new Error('hostie server does not exist')
    }

    await this.hostieServer.stop()
    this.hostieServer = undefined
  }

  public async start (): Promise<void> {
    log.verbose('IoClient', 'start()')

    if (this.state.pending()) {
      log.warn('IoClient', 'start() with a pending state, not the time')
      const e = new Error('state.pending() when start()')
      throw e
    }

    this.state.on('pending')

    try {
      await this.hookWechaty(this.options.wechaty)

      await this.startIo()

      await this.options.wechaty.start()
      await this.startHostie()

      this.state.on(true)

    } catch (e) {
      log.error('IoClient', 'start() exception: %s', e.message)
      this.state.off(true)
      throw e
    }
  }

  private async hookWechaty (wechaty: Wechaty): Promise<void> {
    log.verbose('IoClient', 'initWechaty()')

    if (this.state.off()) {
      const e = new Error('state.off() is true, skipped')
      log.warn('IoClient', 'initWechaty() %s', e.message)
      throw e
    }

    wechaty
      .on('login',    user => log.info('IoClient', `${user.name()} logined`))
      .on('logout',   user => log.info('IoClient', `${user.name()} logouted`))
      .on('scan',     (url, code) => log.info('IoClient', `[${code}] ${url}`))
      .on('message',  msg => this.onMessage(msg))
  }

  private async startIo (): Promise<void> {
    log.verbose('IoClient', 'startIo() with token %s', this.options.token)

    if (this.state.off()) {
      const e = new Error('startIo() state.off() is true, skipped')
      log.warn('IoClient', e.message)
      throw e
    }

    if (this.io) {
      throw new Error('io exists')
    }

    this.io = new Io({
      token   : this.options.token,
      wechaty : this.options.wechaty,
    })

    try {
      await this.io.start()
    } catch (e) {
      log.verbose('IoClient', 'startIo() init fail: %s', e.message)
      throw e
    }
  }

  private async stopIo () {
    log.verbose('IoClient', 'stopIo()')

    if (!this.io) {
      log.warn('IoClient', 'stopIo() io does not exist')
      return
    }

    await this.io.stop()
    this.io = undefined
  }

  private async onMessage (msg: Message) {
    log.verbose('IoClient', 'onMessage(%s)', msg)

    // const from = m.from()
    // const to = m.to()
    // const content = m.toString()
    // const room = m.room()

    // log.info('Bot', '%s<%s>:%s'
    //               , (room ? '['+room.topic()+']' : '')
    //               , from.name()
    //               , m.toStringDigest()
    //         )

    // if (/^wechaty|chatie|botie/i.test(m.text()) && !m.self()) {
    //   await m.say('https://www.chatie.io')
    //     .then(_ => log.info('Bot', 'REPLIED to magic word "chatie"'))
    // }
  }

  public async stop (): Promise<void> {
    log.verbose('IoClient', 'stop()')

    this.state.off('pending')

    await this.stopIo()
    await this.stopHostie()
    await this.options.wechaty.stop()

    this.state.off(true)

    // XXX 20161026
    // this.io = null
  }

  public async restart (): Promise<void> {
    log.verbose('IoClient', 'restart()')

    try {
      await this.stop()
      await this.start()
    } catch (e) {
      log.error('IoClient', 'restart() exception %s', e.message)
      throw e
    }
  }

  public async quit (): Promise<void> {
    log.verbose('IoClient', 'quit()')

    if (this.state.off() === 'pending') {
      log.warn('IoClient', 'quit() with state.off() = `pending`, skipped')
      throw new Error('quit() with state.off() = `pending`')
    }

    this.state.off('pending')

    try {
      if (this.options.wechaty) {
        await this.options.wechaty.stop()
        // this.wechaty = null
      } else { log.warn('IoClient', 'quit() no this.wechaty') }

      if (this.io) {
        await this.io.stop()
        // this.io = null
      } else { log.warn('IoClient', 'quit() no this.io') }

    } catch (e) {
      log.error('IoClient', 'exception: %s', e.message)
      throw e
    } finally {
      this.state.off(true)
    }
  }

}
