/**
 *   Wechaty Chatbot SDK - https://github.com/wechaty/wechaty
 *
 *   @copyright 2016 Huan LI (李卓桓) <https://github.com/huan>, and
 *                   Wechaty Contributors <https://github.com/wechaty>.
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
 * because it will cause a LOOP require ERROR
 */
import { StateSwitch }  from 'state-switch'

import {
  PuppetServer,
  PuppetServerOptions,
}                       from 'wechaty-puppet-service'

import { Message }      from './user/mod'

import {
  log,
}                      from './config'
import { Io }           from './io'
import { Wechaty }      from './wechaty'

export interface IoClientOptions {
  token   : string,
  wechaty : Wechaty,
  port?: number
}

const DEFAULT_IO_CLIENT_OPTIONS: Partial<IoClientOptions> = {
  port: 8788,
}

export class IoClient {

  /**
   * Huan(20161026): keep io `null-able` or not?
   * Huan(202002): make it optional.
   */
  private io?: Io
  private puppetServer?: PuppetServer

  private state: StateSwitch

  protected options: Required<IoClientOptions>

  constructor (
    options: IoClientOptions,
  ) {
    log.verbose('IoClient', 'constructor({%s})',
      Object.keys(options)
        .map(key => {
          return `${key}:${(options as any)[key]}`
        })
        .reduce((acc, cur) => `${acc}, ${cur}`)
    )

    const normalizedOptions = {
      ...DEFAULT_IO_CLIENT_OPTIONS,
      ...options,
    } as Required<IoClientOptions>

    this.options = normalizedOptions

    this.state = new StateSwitch('IoClient', { log })
  }

  private async startPuppetServer () {
    log.verbose('IoClient', 'startPuppetServer()')

    if (this.puppetServer) {
      throw new Error('puppet server exists')
    }

    const options: PuppetServerOptions = {
      endpoint : '0.0.0.0:' + this.options.port,
      puppet   : this.options.wechaty.puppet,
      token    : this.options.token,
    }
    this.puppetServer = new PuppetServer(options)
    await this.puppetServer.start()
  }

  private async stopPuppetServer () {
    log.verbose('IoClient', 'stopPuppetService()')

    if (!this.puppetServer) {
      throw new Error('puppet server does not exist')
    }

    await this.puppetServer.stop()
    this.puppetServer = undefined
  }

  public async start (): Promise<void> {
    log.verbose('IoClient', 'start()')

    if (this.state.on()) {
      log.warn('IoClient', 'start() with a on state, wait and return')
      await this.state.ready('on')
      return
    }

    this.state.on('pending')

    try {
      await this.hookWechaty(this.options.wechaty)

      await this.startIo()

      await this.options.wechaty.start()

      await this.startPuppetServer()

      this.state.on(true)

    } catch (e) {
      log.error('IoClient', 'start() exception: %s', e.message)
      this.state.off(true)
      throw e
    }
  }

  private async hookWechaty (wechaty: Wechaty): Promise<void> {
    log.verbose('IoClient', 'hookWechaty()')

    if (this.state.off()) {
      const e = new Error('state.off() is true, skipped')
      log.warn('IoClient', 'initWechaty() %s', e.message)
      throw e
    }

    wechaty
      .on('login',    user => log.info('IoClient', `${user.name()} logged in`))
      .on('logout',   user => log.info('IoClient', `${user.name()} logged out`))
      .on('message',  msg => this.onMessage(msg))
      .on('scan',     (url, code) => {
        log.info('IoClient', [
          `[${code}] ${url}`,
          `Online QR Code Image: https://wechaty.js.org/qrcode/${encodeURIComponent(url)}`,
        ].join('\n'))
      })
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
      servicePort : this.options.port,
      token      : this.options.token,
      wechaty    : this.options.wechaty,
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
    await this.stopPuppetServer()
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
