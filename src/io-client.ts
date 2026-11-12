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
 * Host gateway client (`IoClient`) orchestrating a `Wechaty` bot, gRPC
 * `PuppetServer`, and cloud `Io` WebSocket channel as an atomic resource scope.
 *
 * Acquires `wechaty -> puppetServer -> io` inside `LifecycleController` +
 * `ResourceScope` so partial startup failures automatically unwind already
 * started children in reverse order, and `stop()` / `quit()` release all three
 * resources without `state-switch`.
 */
import {
  PuppetServer,
  type PuppetServerOptions,
}                       from 'wechaty-puppet-service'

import {
  type LifecycleCallOptions,
  LifecycleController,
  type LifecycleState,
}                                 from './lifecycle/mod.ts'
import type { MessageInterface }  from './user-modules/mod.ts'
import type { WechatyInterface }  from './wechaty/mod.ts'

import {
  log,
}                       from './config.ts'
import {
  Io,
  type IoOptions,
}                       from './io.ts'

export interface StartStopService {
  start (options?: LifecycleCallOptions): Promise<void>
  stop (options?: LifecycleCallOptions): Promise<void>
}

export interface IoClientOptions {
  token               : string,
  wechaty             : WechatyInterface,
  port?               : number,
  createIo?           : (options: IoOptions) => StartStopService,
  createPuppetServer? : (options: PuppetServerOptions) => StartStopService,
}

const DEFAULT_IO_CLIENT_OPTIONS = {
  port: 8788,
} as const

export class IoClient {

  private io?: StartStopService
  private puppetServer?: StartStopService
  readonly #lifecycle: LifecycleController

  protected options: IoClientOptions & { port: number }

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

    this.options = {
      ...DEFAULT_IO_CLIENT_OPTIONS,
      ...options,
    }

    this.#lifecycle = new LifecycleController({
      hooks: {
        start: async ({ scope }) => {
          const wechaty = this.options.wechaty
          scope.listen(wechaty, 'login', user => log.info('IoClient', `${user.name()} logged in`))
          scope.listen(wechaty, 'logout', user => log.info('IoClient', `${user.name()} logged out`))
          scope.listen(wechaty, 'message', msg => { void this.onMessage(msg) })
          scope.listen(wechaty, 'scan', (url, code) => {
            log.info('IoClient', [
              `[${code}] ${url}`,
              `Online QR Code Image: https://wechaty.js.org/qrcode/${encodeURIComponent(url)}`,
            ].join('\n'))
          })

          await scope.acquire({
            create: ({ signal }) => wechaty.start({ signal }),
            dispose: () => wechaty.stop(),
            name: 'wechaty',
          })

          await scope.acquire({
            create: () => this.startPuppetServer(),
            dispose: () => this.stopPuppetServer(),
            name: 'puppetServer',
          })

          await scope.acquire({
            create: ({ signal }) => this.startIo(signal),
            dispose: () => this.stopIo(),
            name: 'io',
          })
        },
      },
      name: 'IoClient',
    })
  }

  /**
   * Read-only lifecycle state snapshot of this `IoClient`.
   */
  public get state (): LifecycleState {
    return this.#lifecycle.state
  }

  private async startPuppetServer () {
    log.verbose('IoClient', 'startPuppetServer()')

    if (this.puppetServer) {
      throw new Error('puppet server exists')
    }

    const options: PuppetServerOptions = {
      endpoint : '0.0.0.0:' + this.options.port,
      /**
       * Huan(202110): FIXME: remove the any
       *  by updating the puppet-service server code
       *  to use PuppetInterface
       */
      puppet   : this.options.wechaty.puppet as any,
      token    : this.options.token,
    }
    const server = this.options.createPuppetServer
      ? this.options.createPuppetServer(options)
      : new PuppetServer(options)
    this.puppetServer = server
    try {
      await server.start()
    } catch (e) {
      this.puppetServer = undefined
      throw e
    }
  }

  private async stopPuppetServer () {
    log.verbose('IoClient', 'stopPuppetServer()')

    if (!this.puppetServer) {
      return
    }

    const server = this.puppetServer
    this.puppetServer = undefined
    await server.stop()
  }

  public async start (options?: LifecycleCallOptions): Promise<void> {
    log.verbose('IoClient', 'start()')
    return this.#lifecycle.start(options)
  }

  private async startIo (signal?: AbortSignal): Promise<void> {
    log.verbose('IoClient', 'startIo() with token %s', this.options.token)

    if (this.io) {
      throw new Error('io exists')
    }

    const ioOptions: IoOptions = {
      servicePort : this.options.port,
      token       : this.options.token,
      wechaty     : this.options.wechaty,
    }
    const io = this.options.createIo
      ? this.options.createIo(ioOptions)
      : new Io(ioOptions)
    this.io = io

    try {
      await io.start({ signal })
    } catch (e) {
      this.io = undefined
      log.verbose('IoClient', 'startIo() init fail: %s', (e as Error).message)
      throw e
    }
  }

  private async stopIo () {
    log.verbose('IoClient', 'stopIo()')

    if (!this.io) {
      return
    }

    const io = this.io
    this.io = undefined
    await io.stop()
  }

  private async onMessage (msg: MessageInterface) {
    log.verbose('IoClient', 'onMessage(%s)', msg)
  }

  public async stop (options?: LifecycleCallOptions): Promise<void> {
    log.verbose('IoClient', 'stop()')
    return this.#lifecycle.stop(options)
  }

  public async restart (options?: LifecycleCallOptions): Promise<void> {
    log.verbose('IoClient', 'restart()')
    return this.#lifecycle.restart(options)
  }

  public async quit (options?: LifecycleCallOptions): Promise<void> {
    log.verbose('IoClient', 'quit()')
    return this.#lifecycle.stop(options)
  }

}
