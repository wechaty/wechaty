/**
 * `GrpcManager`: the client side of one puppet ConnectRPC / gRPC connection, owned by
 * `PuppetService`. It resolves the endpoint (`WECHATY_PUPPET_SERVICE_ENDPOINT`
 * or, when unset, `wechaty://<authority>/<token>` discovered through
 * `wechaty-token`), sets up TLS with the token's SNI and token authorization,
 * creates the Connect client, and opens the server's event stream. It emits the
 * stream's `data`, `error`, and `end` events for `PuppetService` to translate.
 */
import EventEmitter from 'node:events'
import crypto from 'node:crypto'

import {
  createLifecycle,
  type Lifecycle,
  type LifecycleController,
  type LifecycleScope,
  type LifecycleState,
  type LifecycleStop,
  type LifecycleWaitOptions,
} from 'scopelet'
import { log } from 'wechaty-puppet'
import {
  Puppet,
  type EventResponse,
} from 'wechaty-grpc'
import {
  timeoutPromise,
  TimeoutPromiseGError,
} from 'gerror'
import {
  WechatyToken,
} from 'wechaty-token'
import {
  createClient,
  type Client,
} from '@connectrpc/connect'
import {
  createGrpcTransport,
  Http2SessionManager,
} from '@connectrpc/connect-node'

import {
  envVars,
} from '../config.ts'
import {
  callCredToken,
} from '../auth/mod.ts'
import {
  TLS_CA_CERT,
  TLS_INSECURE_SERVER_CERT_COMMON_NAME,
} from '../auth/ca.ts'

import type { PuppetServiceOptions } from './puppet-service.ts'

/** Reject immediately with `signal.reason` if `signal` aborts before `promise` settles. */
function raceAbort<T> (promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) {
    return promise
  }
  if (signal.aborted) {
    // Prevent unhandled rejection if `promise` later rejects.
    promise.catch(() => {})
    return Promise.reject(signal.reason)
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason)
    signal.addEventListener('abort', onAbort, { once: true })
    promise.then(
      value => {
        signal.removeEventListener('abort', onAbort)
        resolve(value)
      },
      error => {
        signal.removeEventListener('abort', onAbort)
        reject(error)
      },
    )
  })
}

export interface GrpcReconnectOptions {
  enabled?     : boolean
  baseDelayMs? : number
  maxDelayMs?  : number
  maxAttempts? : number
}

class GrpcManager extends EventEmitter implements Lifecycle {

  private readonly lifecycle: LifecycleController

  protected _client?: Client<typeof Puppet>
  protected sessionManager?: Http2SessionManager
  get client (): Client<typeof Puppet> {
    if (!this._client) {
      throw new Error('NO CLIENT')
    }
    return this._client
  }

  private reconnectAttempt = 0
  private isRecovering = false
  private readonly reconnectOptions: Required<Pick<GrpcReconnectOptions, 'enabled' | 'baseDelayMs' | 'maxDelayMs'>> & {
    maxAttempts?: number
  }

  caCert     : Buffer
  disableTls : boolean
  endpoint   : string
  serverName : string
  token      : WechatyToken

  private options: PuppetServiceOptions

  constructor (options: PuppetServiceOptions) {
    super()
    this.options = options
    log.verbose('GrpcManager', 'constructor(%s)', JSON.stringify(options))

    this.reconnectOptions = {
      enabled: options.reconnect?.enabled ?? true,
      baseDelayMs: options.reconnect?.baseDelayMs ?? 1000,
      maxDelayMs: options.reconnect?.maxDelayMs ?? 30_000,
      maxAttempts: options.reconnect?.maxAttempts,
    }

    this.lifecycle = createLifecycle(
      {
        onStart: (scope) => this.onStart(scope),
        onStop: (stop) => this.onStop(stop),
      },
      {
        name: 'GrpcManager',
        clock: options.clock,
        stopTimeoutMs: options.stopTimeoutMs ?? 5000,
      },
    )

    this.caCert = Buffer.from(
      envVars.WECHATY_PUPPET_SERVICE_TLS_CA_CERT(this.options.tls?.caCert) || TLS_CA_CERT,
    )
    log.verbose('GrpcManager', 'constructor() tlsRootCert(hash): "%s"',
      crypto.createHash('sha256')
        .update(this.caCert)
        .digest('hex'),
    )

    this.token = new WechatyToken(
      envVars.WECHATY_PUPPET_SERVICE_TOKEN(this.options.token),
    )
    log.verbose('GrpcManager', 'constructor() token: "%s"', this.token)

    this.endpoint = envVars.WECHATY_PUPPET_SERVICE_ENDPOINT(this.options.endpoint)
      || [
        'wechaty://',
        envVars.WECHATY_PUPPET_SERVICE_AUTHORITY(this.options.authority),
        '/',
        this.token,
      ].join('')
    log.verbose('GrpcManager', 'constructor() endpoint: "%s"', this.endpoint)

    this.disableTls = envVars.WECHATY_PUPPET_SERVICE_NO_TLS_INSECURE_CLIENT(this.options.tls?.disable)
    log.verbose('GrpcManager', 'constructor() disableTls: "%s"', this.disableTls)

    const serverNameIndication = envVars.WECHATY_PUPPET_SERVICE_TLS_SERVER_NAME(this.options.tls?.serverName)
      || this.token.sni

    if (!serverNameIndication) {
      throw new Error([
        'Wechaty Puppet Service requires a SNI as prefix of the token from version 0.30 and later.',
        `You can add the "${TLS_INSECURE_SERVER_CERT_COMMON_NAME}_" prefix to your token`,
        `like: "${TLS_INSECURE_SERVER_CERT_COMMON_NAME}_${this.token}"`,
        'and try again.',
      ].join('\n'))
    }

    this.serverName = serverNameIndication
    log.verbose('GrpcManager', 'constructor() serverName(SNI): "%s"', this.serverName)
  }

  get state (): LifecycleState {
    return this.lifecycle.state
  }

  get isRunning (): boolean {
    return this.lifecycle.isRunning
  }

  get isActive (): boolean {
    return this.lifecycle.isActive
  }

  get isStarting (): boolean {
    return this.lifecycle.isStarting
  }

  get isStopping (): boolean {
    return this.lifecycle.isStopping
  }

  get isStopped (): boolean {
    return this.lifecycle.isStopped
  }

  get isFailed (): boolean {
    return this.lifecycle.isFailed
  }

  start (options?: LifecycleWaitOptions): Promise<void> {
    return this.lifecycle.start(options)
  }

  stop (options?: LifecycleWaitOptions): Promise<void> {
    return this.lifecycle.stop(options)
  }

  restart (options?: LifecycleWaitOptions): Promise<void> {
    return this.lifecycle.restart(options)
  }

  whenState (
    predicate: (state: LifecycleState) => boolean,
    options?: LifecycleWaitOptions,
  ): Promise<LifecycleState> {
    return this.lifecycle.whenState(predicate, options)
  }

  whenRunning (options?: LifecycleWaitOptions): Promise<void> {
    return this.lifecycle.whenRunning(options)
  }

  whenStopped (options?: LifecycleWaitOptions): Promise<void> {
    return this.lifecycle.whenStopped(options)
  }

  [Symbol.asyncDispose] (): Promise<void> {
    return this.lifecycle[Symbol.asyncDispose]()
  }

  private getReconnectDelayMs (attempt: number): number {
    const exp = Math.max(0, attempt - 1)
    return Math.min(this.reconnectOptions.maxDelayMs, this.reconnectOptions.baseDelayMs * (2 ** exp))
  }

  private handleStreamLoss (scope: LifecycleScope, reason: unknown): void {
    if (scope.signal.aborted || !this.reconnectOptions.enabled) {
      return
    }
    const nextAttempt = this.reconnectAttempt + 1
    if (
      this.reconnectOptions.maxAttempts !== undefined
      && nextAttempt > this.reconnectOptions.maxAttempts
    ) {
      return
    }
    this.reconnectAttempt = nextAttempt
    this.isRecovering = true
    scope.recover(reason)
  }

  private async connectAndStartStream (scope: LifecycleScope): Promise<void> {
    log.verbose('GrpcManager', 'connectAndStartStream()')
    scope.signal.throwIfAborted()

    await this.initClient(scope.signal)
    scope.signal.throwIfAborted()

    await this.startStream(scope)
    scope.signal.throwIfAborted()

    await this.client.start({}, { signal: scope.signal })
    log.verbose('GrpcManager', 'connectAndStartStream() ... done')
  }

  /** Start the local transport and event stream under ScopeLet's lifecycle. */
  protected async onStart (scope: LifecycleScope): Promise<void> {
    log.verbose('GrpcManager', 'onStart()')
    this.isRecovering = false
    scope.defer(() => this.destroyClient())

    if (this.reconnectAttempt === 0) {
      await this.connectAndStartStream(scope)
      log.verbose('GrpcManager', 'onStart() ... done')
      return
    }

    while (!scope.signal.aborted) {
      const delayMs = this.getReconnectDelayMs(this.reconnectAttempt)
      log.verbose('GrpcManager', 'onStart() reconnecting in %dms (attempt %d)...', delayMs, this.reconnectAttempt)
      await scope.sleep(delayMs)
      try {
        await this.connectAndStartStream(scope)
        this.reconnectAttempt = 0
        log.verbose('GrpcManager', 'onStart() reconnected ... done')
        return
      } catch (err) {
        this.destroyClient()
        if (scope.signal.aborted) {
          throw err
        }
        this.emit('error', err)
        const nextAttempt = this.reconnectAttempt + 1
        if (
          this.reconnectOptions.maxAttempts !== undefined
          && nextAttempt > this.reconnectOptions.maxAttempts
        ) {
          throw err
        }
        this.reconnectAttempt = nextAttempt
      }
    }
  }

  protected async onStop (stop: LifecycleStop): Promise<void> {
    log.verbose('GrpcManager', 'onStop()')
    const recovering = this.isRecovering
    this.isRecovering = false
    if (!recovering) {
      this.reconnectAttempt = 0
    }

    if (!recovering && this._client) {
      try {
        log.verbose('GrpcManager', 'onStop() stop client ...')
        await raceAbort(this._client.stop({}, { signal: stop.signal }), stop.signal)
        log.verbose('GrpcManager', 'onStop() stop client ... done')
      } catch (e) {
        this.emit('error', e)
      }
    }

    log.verbose('GrpcManager', 'onStop() ... done')
  }

  /** Resolve the endpoint and check cancellation before allocating a client. */
  protected async initClient (signal?: AbortSignal): Promise<void> {
    log.verbose('GrpcManager', 'initClient()')

    const protocol = this.disableTls ? 'http' : 'https'
    let target = this.endpoint

    const formatHostPort = (host: string, port: string | number) =>
      host.includes(':') && !host.startsWith('[') ? `[${host}]:${port}` : `${host}:${port}`

    if (target.startsWith('wechaty://')) {
      const parsed = new URL(target)
      const tokenStr = (parsed.pathname || '').replace(/^\//, '')
      const authority = parsed.host || parsed.hostname || undefined
      let address
      try {
        address = await raceAbort(
          new WechatyToken({
            authority,
            token: tokenStr,
          }).discover(signal),
          signal,
        )
      } catch (e) {
        if (signal?.aborted) {
          throw e
        }
        log.warn('GrpcManager', 'initClient() token discovery failed: %s', (e as Error).message)
        throw new Error(`Token discovery failed for ${target}: ${(e as Error).message}`)
      }
      if (!address || !address.host || !address.port) {
        throw new Error(`Token discovery failed: invalid or unknown address for ${target}`)
      }
      target = formatHostPort(address.host, address.port)
    } else if (target.startsWith('http://') || target.startsWith('https://')) {
      const parsed = new URL(target)
      target = parsed.host
    }

    signal?.throwIfAborted()
    const baseUrl = `${protocol}://${target}`
    log.verbose('GrpcManager', 'initClient() baseUrl: %s', baseUrl)

    const nodeOptions = {
      ca: this.caCert,
      rejectUnauthorized: !this.disableTls,
      servername: this.serverName,
    }

    this.sessionManager = new Http2SessionManager(baseUrl, undefined, nodeOptions)

    const transport = createGrpcTransport({
      baseUrl,
      sessionManager: this.sessionManager,
      interceptors: [
        callCredToken(this.token.token),
      ],
      nodeOptions,
    })

    this._client = createClient(Puppet, transport)
    log.verbose('GrpcManager', 'initClient() ... done')
  }

  protected destroyClient (): void {
    log.verbose('GrpcManager', 'destroyClient()')
    if (this.sessionManager) {
      try {
        this.sessionManager.abort()
      } catch {}
      this.sessionManager = undefined
    }
    this._client = undefined
  }

  /** Start the event iterator as a scope-owned task. */
  protected async startStream (scope: LifecycleScope): Promise<void> {
    log.verbose('GrpcManager', 'startStream()')

    const stream = this.client.event({}, { signal: scope.signal })
    const iterator = stream[Symbol.asyncIterator]()

    let peekedData: EventResponse | undefined

    const firstResultPromise: Promise<IteratorResult<EventResponse>> = iterator.next()

    log.verbose('GrpcManager', 'startStream() waiting for initial heartbeat...')
    try {
      const first = await raceAbort(
        timeoutPromise(firstResultPromise, 5 * 1000),
        scope.signal,
      ) as IteratorResult<EventResponse>
      if (!first.done) {
        peekedData = first.value
      }
    } catch (err) {
      if (!scope.signal.aborted && err instanceof TimeoutPromiseGError) {
        log.verbose('GrpcManager', 'startStream() initial heartbeat timeout, proceeding')
      } else {
        throw err
      }
    }

    scope.signal.throwIfAborted()

    scope.spawn(async (signal) => {
      try {
        if (peekedData) {
          this.emit('data', peekedData)
        } else {
          const first = await firstResultPromise
          if (first.done) {
            if (!signal.aborted) {
              this.emit('end')
              this.handleStreamLoss(scope, new Error('gRPC event stream ended'))
            }
            return
          }
          this.emit('data', first.value)
        }
        while (!signal.aborted) {
          const res = await iterator.next()
          if (res.done) {
            if (!signal.aborted) {
              this.emit('end')
              this.handleStreamLoss(scope, new Error('gRPC event stream ended'))
            }
            return
          }
          this.emit('data', res.value)
        }
      } catch (err) {
        if (!signal.aborted) {
          this.emit('error', err)
          this.handleStreamLoss(scope, err)
        }
      }
    })

    log.verbose('GrpcManager', 'startStream() ... done')
  }

}

export {
  GrpcManager,
}
