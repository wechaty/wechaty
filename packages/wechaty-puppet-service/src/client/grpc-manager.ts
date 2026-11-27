/**
 * `GrpcManager`: the client side of one puppet ConnectRPC / gRPC connection, owned by
 * `PuppetService`. It resolves the endpoint (`WECHATY_PUPPET_SERVICE_ENDPOINT`
 * or, when unset, `wechaty://<authority>/<token>` discovered through
 * `wechaty-token`), sets up TLS with the token's SNI and token authorization,
 * creates the Connect client, and opens the server's event stream. It emits the
 * stream's `data`, `error`, and `end` events for `PuppetService` to translate.
 */
import { EventEmitter } from 'node:events'
import crypto from 'node:crypto'

import {
  createLifecycle,
  type Lifecycle,
  type LifecycleScope,
  type LifecycleState,
  type LifecycleStop,
  type LifecycleWaitOptions,
} from 'scopelet'
import { log } from 'wechaty-puppet'
import {
  EventType,
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

/** Options controlling `GrpcManager` automatic stream-loss reconnection. */
export interface GrpcReconnectOptions {
  /** Enable automatic reconnection after stream loss (default: `true`). */
  enabled?     : boolean
  /** Initial reconnect delay in milliseconds (default: `1000`). */
  baseDelayMs? : number
  /** Maximum exponential backoff delay in milliseconds (default: `30000`). */
  maxDelayMs?  : number
  /** Maximum consecutive reconnect attempts before failing (default: unlimited). */
  maxAttempts? : number
}

interface AttemptState {
  readonly controller: AbortController
  readonly cleanup: () => void
  earlyStreamLoss?: { reason: unknown }
  streamHealthy: boolean
  inConnect: boolean
}

interface RecoveryState {
  attempt: number
  recovering: boolean
  remoteStopPending: boolean
  remoteActive: boolean
}

class GrpcManager extends EventEmitter implements Lifecycle {

  declare readonly state: LifecycleState
  declare readonly isRunning: boolean
  declare readonly isActive: boolean
  declare readonly isStarting: boolean
  declare readonly isStopping: boolean
  declare readonly isStopped: boolean
  declare readonly isFailed: boolean
  declare start: (options?: LifecycleWaitOptions) => Promise<void>
  declare stop: (options?: LifecycleWaitOptions) => Promise<void>
  declare restart: (options?: LifecycleWaitOptions) => Promise<void>
  declare whenState: (predicate: (state: LifecycleState) => boolean, options?: LifecycleWaitOptions) => Promise<LifecycleState>
  declare whenRunning: (options?: LifecycleWaitOptions) => Promise<void>
  declare whenStopped: (options?: LifecycleWaitOptions) => Promise<void>
  declare [Symbol.asyncDispose]: () => Promise<void>

  protected _client?: Client<typeof Puppet>
  protected sessionManager?: Http2SessionManager
  get client (): Client<typeof Puppet> {
    if (!this._client) {
      throw new Error('NO CLIENT')
    }
    return this._client
  }

  private attempt?: AttemptState
  private readonly recovery: RecoveryState = {
    attempt: 0,
    recovering: false,
    remoteStopPending: false,
    remoteActive: false,
  }
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

    createLifecycle.attach(
      this,
      {
        onStart: (scope) => this.onStart(scope),
        onStop: (stop) => this.onStop(stop),
        onStateChange: (state) => {
          if (state.kind === 'stopped' || state.kind === 'failed') {
            this.recovery.attempt = 0
            this.recovery.recovering = false
          }
        },
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

  /** Compute exponential backoff delay in milliseconds for `attempt` (1-based). */
  private getReconnectDelayMs (attempt: number): number {
    const exp = Math.max(0, attempt - 1)
    return Math.min(this.reconnectOptions.maxDelayMs, this.reconnectOptions.baseDelayMs * (2 ** exp))
  }

  /** Trigger ScopeLet recovery on unexpected stream loss, or fail if recovery is disabled or `maxAttempts` is exceeded. */
  private handleStreamLoss (scope: LifecycleScope, reason: unknown): void {
    if (scope.signal.aborted || this.isStopping || this.attempt?.inConnect) {
      return
    }
    if (!this.reconnectOptions.enabled || !this.isRunning) {
      scope.fail(reason)
      return
    }
    const nextAttempt = this.recovery.attempt + 1
    if (
      this.reconnectOptions.maxAttempts !== undefined
      && nextAttempt > this.reconnectOptions.maxAttempts
    ) {
      scope.fail(reason)
      return
    }
    this.recovery.recovering = true
    if (scope.recover(reason) === 'accepted') {
      this.recovery.attempt = nextAttempt
    } else {
      this.recovery.recovering = false
    }
  }

  /** Allocate the client, open the event stream, and invoke remote `start()`. */
  private async connectAndStartStream (scope: LifecycleScope): Promise<void> {
    log.verbose('GrpcManager', 'connectAndStartStream()')
    scope.signal.throwIfAborted()

    this.attempt?.cleanup()
    const controller = new AbortController()
    const onScopeAbort = () => controller.abort(scope.signal.reason)
    scope.signal.addEventListener('abort', onScopeAbort, { once: true })

    const attempt: AttemptState = {
      controller,
      cleanup: () => {
        scope.signal.removeEventListener('abort', onScopeAbort)
        controller.abort()
        if (this.attempt === attempt) {
          this.attempt = undefined
        }
      },
      streamHealthy: false,
      inConnect: true,
    }
    this.attempt = attempt
    this.recovery.remoteStopPending = false

    const throwIfEarlyLoss = () => {
      if (!attempt.earlyStreamLoss) {
        return
      }
      throw attempt.earlyStreamLoss.reason instanceof Error
        ? attempt.earlyStreamLoss.reason
        : new Error(String(attempt.earlyStreamLoss.reason ?? 'gRPC event stream ended during startup'))
    }

    try {
      await this.initClient(controller.signal)
      controller.signal.throwIfAborted()

      await this.startStream(scope, attempt)
      controller.signal.throwIfAborted()
      throwIfEarlyLoss()

      this.recovery.remoteStopPending = true
      try {
        await this.client.start({}, { signal: controller.signal })
        this.recovery.remoteActive = true
      } catch (err) {
        if (!scope.signal.aborted) {
          this.recovery.remoteStopPending = false
        }
        throw err
      }

      throwIfEarlyLoss()

      if (attempt.streamHealthy) {
        this.recovery.attempt = 0
      }

      log.verbose('GrpcManager', 'connectAndStartStream() ... done')
    } catch (err) {
      // Fence the discarded attempt's stream and detach scope.signal listener before destroyClient().
      attempt.cleanup()
      throw err
    } finally {
      attempt.inConnect = false
    }
  }

  /** Stop the remote puppet at most once, bounded by `stopTimeoutMs`. */
  private async stopRemoteOnce (
    signal?: AbortSignal,
    options?: { allowEphemeral?: boolean, suppressErrors?: boolean },
  ): Promise<void> {
    if (this.recovery.recovering) {
      return
    }
    const useExisting = Boolean(this.recovery.remoteStopPending && this._client)
    const useEphemeral = Boolean(options?.allowEphemeral && !this._client && this.recovery.remoteActive && this.isStopping)
    if (!useExisting && !useEphemeral) {
      return
    }
    this.recovery.remoteStopPending = false
    this.recovery.remoteActive = false

    const timeoutMs = this.options.stopTimeoutMs ?? 5000
    const timeoutController = new AbortController()
    const onParentAbort = () => timeoutController.abort(signal?.reason)
    signal?.addEventListener('abort', onParentAbort, { once: true })
    const clock = useEphemeral ? undefined : this.options.clock
    const effectiveTimeoutMs = useEphemeral ? Math.min(timeoutMs, 1000) : timeoutMs
    const onTimeout = () => timeoutController.abort(new Error(`Remote stop timed out after ${effectiveTimeoutMs}ms`))
    const timer = clock
      ? clock.setTimeout(onTimeout, effectiveTimeoutMs)
      : setTimeout(onTimeout, effectiveTimeoutMs)
    try {
      if (useEphemeral) {
        await this.initClient(timeoutController.signal)
      }
      if (!this._client) {
        return
      }
      log.verbose('GrpcManager', 'stopRemoteOnce() stop client ...')
      await raceAbort(this._client.stop({}, { signal: timeoutController.signal }), timeoutController.signal)
      log.verbose('GrpcManager', 'stopRemoteOnce() stop client ... done')
    } catch (e) {
      if (!options?.suppressErrors && !useEphemeral) {
        this.emit('error', e)
      }
    } finally {
      if (useEphemeral) {
        this.destroyClient()
      }
      signal?.removeEventListener('abort', onParentAbort)
      if (clock) {
        clock.clearTimeout(timer)
      } else {
        clearTimeout(timer as ReturnType<typeof setTimeout>)
      }
    }
  }

  /** Start the local transport and event stream under ScopeLet's lifecycle. */
  protected async onStart (scope: LifecycleScope): Promise<void> {
    log.verbose('GrpcManager', 'onStart()')
    this.recovery.recovering = false
    this.recovery.remoteStopPending = false
    // LIFO order: stopRemoteOnce runs before destroyClient() if startup is aborted.
    scope.defer(() => this.destroyClient())
    scope.defer(() => this.stopRemoteOnce(undefined, { allowEphemeral: true, suppressErrors: true }))
    scope.defer(() => this.attempt?.cleanup())

    try {
      if (this.recovery.attempt === 0) {
        await this.connectAndStartStream(scope)
        log.verbose('GrpcManager', 'onStart() ... done')
        return
      }

      while (!scope.signal.aborted) {
        const delayMs = this.getReconnectDelayMs(this.recovery.attempt)
        log.verbose('GrpcManager', 'onStart() reconnecting in %dms (attempt %d)...', delayMs, this.recovery.attempt)
        await scope.sleep(delayMs)
        this.emit('reconnecting')
        try {
          await this.connectAndStartStream(scope)
          this.emit('reconnect')
          log.verbose('GrpcManager', 'onStart() reconnected ... done')
          return
        } catch (err) {
          if (scope.signal.aborted) {
            throw err
          }
          await this.stopRemoteOnce(scope.signal)
          this.destroyClient()
          this.emit('error', err)
          const nextAttempt = this.recovery.attempt + 1
          if (
            this.reconnectOptions.maxAttempts !== undefined
            && nextAttempt > this.reconnectOptions.maxAttempts
          ) {
            throw err
          }
          this.recovery.attempt = nextAttempt
        }
      }
    } catch (err) {
      this.recovery.attempt = 0
      throw err
    }
  }

  /** Handle graceful retirement, skipping remote `stop()` on stream-loss recovery. */
  protected async onStop (stop: LifecycleStop): Promise<void> {
    log.verbose('GrpcManager', 'onStop(reason=%s)', stop.reason)
    if (stop.reason === 'recover') {
      return
    }

    this.recovery.attempt = 0
    await this.stopRemoteOnce(stop.signal)
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
  protected async startStream (
    scope: LifecycleScope,
    attempt?: AttemptState,
  ): Promise<void> {
    log.verbose('GrpcManager', 'startStream()')
    const attemptSignal = attempt?.controller.signal ?? scope.signal

    const stream = this.client.event({}, { signal: attemptSignal })
    const iterator = stream[Symbol.asyncIterator]()

    let peekedData: EventResponse | undefined

    const firstResultPromise: Promise<IteratorResult<EventResponse>> = iterator.next()

    log.verbose('GrpcManager', 'startStream() waiting for initial heartbeat...')
    try {
      const first = await raceAbort(
        timeoutPromise(firstResultPromise, 5 * 1000),
        attemptSignal,
      ) as IteratorResult<EventResponse>
      if (first.done) {
        throw new Error('gRPC event stream ended')
      }
      peekedData = first.value
    } catch (err) {
      if (!attemptSignal.aborted && err instanceof TimeoutPromiseGError) {
        log.verbose('GrpcManager', 'startStream() initial heartbeat timeout, proceeding')
      } else {
        throw err
      }
    }

    attemptSignal.throwIfAborted()

    let eventsSeen = 0
    const recordEvent = (event: EventResponse) => {
      eventsSeen += 1
      if (eventsSeen > 1 || event.type !== EventType.HEARTBEAT) {
        if (attempt) {
          attempt.streamHealthy = true
        }
        // Only reset backoff once running (after client.start() has settled).
        if (this.isRunning) {
          this.recovery.attempt = 0
        }
      }
      this.emit('data', event)
    }

    const recordLoss = (reason: unknown) => {
      if (attempt && !this.isRunning && !attemptSignal.aborted) {
        attempt.earlyStreamLoss = { reason }
      }
      this.handleStreamLoss(scope, reason)
    }

    scope.spawn(async (signal) => {
      const isCancelled = () => signal.aborted || attemptSignal.aborted
      try {
        if (peekedData) {
          recordEvent(peekedData)
        } else {
          const first = await firstResultPromise
          if (first.done) {
            if (!isCancelled()) {
              this.emit('end')
              recordLoss(new Error('gRPC event stream ended'))
            }
            return
          }
          recordEvent(first.value)
        }
        while (!isCancelled()) {
          const res = await iterator.next()
          if (res.done) {
            if (!isCancelled()) {
              this.emit('end')
              recordLoss(new Error('gRPC event stream ended'))
            }
            return
          }
          recordEvent(res.value)
        }
      } catch (err) {
        if (!isCancelled()) {
          this.emit('error', err)
          recordLoss(err)
        }
      }
    })

    log.verbose('GrpcManager', 'startStream() ... done')
  }

}

export {
  GrpcManager,
}
