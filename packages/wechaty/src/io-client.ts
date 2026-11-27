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
 * `IoClient`: runs a Wechaty bot behind the Wechaty cloud, built on the async
 * lifecycle module (wechaty/wechaty#3022).
 *
 * Each run owns, in this order: the bot listeners that log its events, an
 * {@link Io} link (a child lifecycle, so its own reconnects never fail this
 * client), the bot itself, and a PuppetServer that serves the bot's puppet.
 * They are started in that order and released in reverse when the run
 * retires. A failure halfway through a start releases what was already
 * started.
 */
import {
  PuppetServer,
  type PuppetServerOptions,
}                       from 'wechaty-puppet-service'

import {
  createLifecycle,
  type Lifecycle,
  type LifecycleScope,
  type LifecycleState,
}                       from 'scopelet'
import type { Message }           from './user-modules/mod.ts'
import type { Wechaty }           from './wechaty/mod.ts'

import {
  log,
}                       from './config.ts'
import { Io, type IoOptions } from './io.ts'

/** The bot an {@link IoClient} runs, and its Io token and PuppetServer port. */
export interface IoClientOptions {
  token   : string,
  wechaty : Wechaty,
  port?: number
}

const DEFAULT_IO_CLIENT_OPTIONS: Partial<IoClientOptions> = {
  port: 8788,
}

/** The PuppetServer methods the client uses. See {@link IoClient.createPuppetServer}. */
export type IoPuppetServer = Pick<PuppetServer, 'start' | 'stop'>

/**
 * Runs a bot with its Io link and PuppetServer. See the module comment for
 * what each run owns and in which order.
 */
export class IoClient {

  declare readonly state: LifecycleState
  declare readonly isRunning: boolean
  declare readonly isActive: boolean
  declare readonly isStarting: boolean
  declare readonly isStopping: boolean
  declare readonly isStopped: boolean
  declare readonly isFailed: boolean
  declare readonly isSettled: boolean
  declare start: Lifecycle['start']
  declare stop: Lifecycle['stop']
  declare restart: Lifecycle['restart']
  declare whenState: Lifecycle['whenState']
  declare whenRunning: Lifecycle['whenRunning']
  declare whenStopped: Lifecycle['whenStopped']
  declare whenSettled: Lifecycle['whenSettled']
  declare [Symbol.asyncDispose]: Lifecycle[typeof Symbol.asyncDispose]

  /** The Io link of the current run, if any. */
  private io?: Io

  protected options: Required<IoClientOptions>

  constructor (
    options: IoClientOptions,
  ) {
    log.verbose('IoClient', 'constructor({%s})',
      Object.keys(options)
        .map(key => {
          return `${key}:${(options as any)[key]}`
        })
        .reduce((acc, cur) => `${acc}, ${cur}`),
    )

    const normalizedOptions = {
      ...DEFAULT_IO_CLIENT_OPTIONS,
      ...options,
    } as Required<IoClientOptions>

    this.options = normalizedOptions

    createLifecycle.attach(this, {
      onStart: scope => this.onStart(scope),
    }, { name: 'IoClient' })
  }

  /** Create the run's Io link. Tests override this. */
  protected createIo (options: IoOptions): Io {
    return new Io(options)
  }

  /** Create the run's PuppetServer. Tests override this. */
  protected createPuppetServer (options: PuppetServerOptions): IoPuppetServer {
    return new PuppetServer(options)
  }

  /** One run: see the module comment for what it owns and in which order. */
  private async onStart (scope: LifecycleScope): Promise<void> {
    log.verbose('IoClient', 'onStart()')
    const wechaty = this.options.wechaty

    this.hookWechaty(scope, wechaty)

    const io = this.createIo({
      servicePort : this.options.port,
      token       : this.options.token,
      wechaty,
    })
    this.io = io
    scope.defer(() => {
      if (this.io === io) {
        this.io = undefined
      }
    })
    await scope.start(io)

    await scope.acquire(
      () => wechaty.start(),
      () => wechaty.stop(),
    )

    // Owned before it starts: a start that rejects (an occupied port) may have
    // set up resources already, so its stop() must still run.
    const server = await scope.acquire(
      () => this.createPuppetServer({
        endpoint : '0.0.0.0:' + this.options.port,
        /**
         * Huan(202110): FIXME: remove the any
         *  by updating the puppet-service server code
         *  to use PuppetInterface
         */
        puppet   : wechaty.puppet as any,
        token    : this.options.token,
      }),
      created => created.stop(),
    )
    log.verbose('IoClient', 'onStart() starting the puppet server')
    await server.start()
  }

  /** Log the bot's events for this run only (C-COMP-01). */
  private hookWechaty (scope: LifecycleScope, wechaty: Wechaty): void {
    log.verbose('IoClient', 'hookWechaty()')

    scope.listen(wechaty, 'login',   ((event: any) => {
      const user = event.detail ?? event
      log.info('IoClient', `${user.name()} logged in`)
    }) as any)

    scope.listen(wechaty, 'logout',  ((event: any) => {
      const user = event.detail?.contact ?? event.detail ?? event
      log.info('IoClient', `${user.name()} logged out`)
    }) as any)

    scope.listen(wechaty, 'message', ((event: any) => {
      const msg: Message = event.detail ?? event
      this.onMessage(msg).catch(e => log.warn('IoClient', 'onMessage() failed: %s', (e as Error).message))
    }) as any)

    scope.listen(wechaty, 'scan',    ((event: any) => {
      const detail = event.detail ?? event
      const url = detail?.qrcode || (typeof detail === 'string' ? detail : '')
      const code = detail?.status ?? (typeof detail === 'number' ? detail : 0)
      log.info('IoClient', [
        `[${code}] ${url}`,
        `Online QR Code Image: https://wechaty.js.org/qrcode/${encodeURIComponent(url)}`,
      ].join('\n'))
    }) as any)
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

}
