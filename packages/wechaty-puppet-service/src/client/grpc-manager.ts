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
  type LifecycleController,
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
  private streamHealthy = false
  private remoteStopPending = false
  private remoteSessionActive = false
  private recovering = false
  private inConnectAttempt = false
  private currentAttemptCleanup?: () => void
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

  /** Current ScopeLet lifecycle snapshot. */
  get state (): LifecycleState {
    return this.lifecycle.state
  }

  /** Whether the gRPC connection is currently running. */
  get isRunning (): boolean {
    return this.lifecycle.isRunning
  }

  /** Whether the gRPC connection is starting or running. */
  get isActive (): boolean {
    return this.lifecycle.isActive
  }

  /** Whether the gRPC connection is currently starting or reconnecting. */
  get isStarting (): boolean {
    return this.lifecycle.isStarting
  }

  /** Whether the gRPC connection is currently stopping. */
  get isStopping (): boolean {
    return this.lifecycle.isStopping
  }

  /** Whether the gRPC connection is stopped. */
  get isStopped (): boolean {
    return this.lifecycle.isStopped
  }

  /** Whether the gRPC connection is in a failed state. */
  get isFailed (): boolean {
    return this.lifecycle.isFailed
  }

  /**
   * Start the gRPC connection and event stream.
   *
   * If `options.signal` aborts, only the caller's wait rejects with `signal.reason`;
   * call `stop()` explicitly to release the lifecycle.
   */
  start (options?: LifecycleWaitOptions): Promise<void> {
    return this.lifecycle.start(options)
  }

  /** Stop the remote session (bounded by `stopTimeoutMs`) and dispose local transport. */
  stop (options?: LifecycleWaitOptions): Promise<void> {
    if (!options?.signal?.aborted) {
      this.reconnectAttempt = 0
      this.recovering = false
    }
    return this.lifecycle.stop(options)
  }

  /** Stop the current connection and start a fresh one. */
  restart (options?: LifecycleWaitOptions): Promise<void> {
    const isDirty = this.state.kind === 'failed' && !this.state.cleanupComplete
    if (!options?.signal?.aborted && !isDirty) {
      this.reconnectAttempt = 0
      this.recovering = false
    }
    return this.lifecycle.restart(options)
  }

  /** Wait until the lifecycle state satisfies `predicate`. */
  whenState (
    predicate: (state: LifecycleState) => boolean,
    options?: LifecycleWaitOptions,
  ): Promise<LifecycleState> {
    return this.lifecycle.whenState(predicate, options)
  }

  /** Wait until the lifecycle enters `running`. */
  whenRunning (options?: LifecycleWaitOptions): Promise<void> {
    return this.lifecycle.whenRunning(options)
  }

  /** Wait until the lifecycle enters `stopped`. */
  whenStopped (options?: LifecycleWaitOptions): Promise<void> {
    return this.lifecycle.whenStopped(options)
  }

  /** Dispose the gRPC lifecycle asynchronously. */
  [Symbol.asyncDispose] (): Promise<void> {
    this.reconnectAttempt = 0
    return this.lifecycle[Symbol.asyncDispose]()
  }

  /** Compute exponential backoff delay in milliseconds for `attempt` (1-based). */
  private getReconnectDelayMs (attempt: number): number {
    const exp = Math.max(0, attempt - 1)
    return Math.min(this.reconnectOptions.maxDelayMs, this.reconnectOptions.baseDelayMs * (2 ** exp))
  }

  /** Trigger ScopeLet recovery on unexpected stream loss, or fail if recovery is disabled or `maxAttempts` is exceeded. */
  private handleStreamLoss (scope: LifecycleScope, reason: unknown): void {
    if (scope.signal.aborted || this.isStopping || this.inConnectAttempt) {
      return
    }
    if (!this.reconnectOptions.enabled || !this.isRunning) {
      scope.fail(reason)
      return
    }
    const nextAttempt = this.reconnectAttempt + 1
    if (
      this.reconnectOptions.maxAttempts !== undefined
      && nextAttempt > this.reconnectOptions.maxAttempts
    ) {
      scope.fail(reason)
      return
    }
    this.recovering = true
    if (scope.recover(reason) === 'accepted') {
      this.reconnectAttempt = nextAttempt
    } else {
      this.recovering = false
    }
  }

  /** Allocate the client, open the event stream, and invoke remote `start()`. */
  private async connectAndStartStream (scope: LifecycleScope): Promise<void> {
    log.verbose('GrpcManager', 'connectAndStartStream()')
    scope.signal.throwIfAborted()

    this.currentAttemptCleanup?.()
    const attemptController = new AbortController()
    const onScopeAbort = () => attemptController.abort(scope.signal.reason)
    scope.signal.addEventListener('abort', onScopeAbort, { once: true })
    const cleanupAttempt = () => {
      scope.signal.removeEventListener('abort', onScopeAbort)
      attemptController.abort()
      if (this.currentAttemptCleanup === cleanupAttempt) {
        this.currentAttemptCleanup = undefined
      }
    }
    this.currentAttemptCleanup = cleanupAttempt

    let earlyStreamLoss: { reason: unknown } | undefined
    const throwIfEarlyLoss = () => {
      if (!earlyStreamLoss) {
        return
      }
      throw earlyStreamLoss.reason instanceof Error
        ? earlyStreamLoss.reason
        : new Error(String(earlyStreamLoss.reason ?? 'gRPC event stream ended during startup'))
    }
    this.remoteStopPending = false
    this.streamHealthy = false
    this.inConnectAttempt = true

    try {
      await this.initClient(attemptController.signal)
      attemptController.signal.throwIfAborted()

      await this.startStream(scope, attemptController.signal, (reason) => {
        if (!this.isRunning && !attemptController.signal.aborted) {
          earlyStreamLoss = { reason }
        }
      })
      attemptController.signal.throwIfAborted()
      throwIfEarlyLoss()

      this.remoteStopPending = true
      try {
        await this.client.start({}, { signal: attemptController.signal })
        this.remoteSessionActive = true
      } catch (err) {
        if (!scope.signal.aborted) {
          this.remoteStopPending = false
        }
        throw err
      }

      throwIfEarlyLoss()

      if (this.streamHealthy) {
        this.reconnectAttempt = 0
      }

      log.verbose('GrpcManager', 'connectAndStartStream() ... done')
    } catch (err) {
      // Fence the discarded attempt's stream and detach scope.signal listener before destroyClient().
      cleanupAttempt()
      throw err
    } finally {
      this.inConnectAttempt = false
    }
  }

  /** Stop the remote puppet at most once, bounded by `stopTimeoutMs`. */
  private async stopRemoteOnce (
    signal?: AbortSignal,
    options?: { allowEphemeral?: boolean, suppressErrors?: boolean },
  ): Promise<void> {
    if (this.recovering) {
      return
    }
    const useExisting = this.remoteStopPending && Boolean(this._client)
    const useEphemeral = Boolean(options?.allowEphemeral) && !this._client && this.remoteSessionActive && this.isStopping
    if (!useExisting && !useEphemeral) {
      return
    }
    this.remoteStopPending = false
    this.remoteSessionActive = false

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
    this.recovering = false
    this.remoteStopPending = false
    // LIFO order: stopRemoteOnce runs before destroyClient() if startup is aborted.
    scope.defer(() => this.destroyClient())
    scope.defer(() => this.stopRemoteOnce(undefined, { allowEphemeral: true, suppressErrors: true }))
    scope.defer(() => this.currentAttemptCleanup?.())

    try {
      if (this.reconnectAttempt === 0) {
        await this.connectAndStartStream(scope)
        log.verbose('GrpcManager', 'onStart() ... done')
        return
      }

      while (!scope.signal.aborted) {
        const delayMs = this.getReconnectDelayMs(this.reconnectAttempt)
        log.verbose('GrpcManager', 'onStart() reconnecting in %dms (attempt %d)...', delayMs, this.reconnectAttempt)
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
    } catch (err) {
      this.reconnectAttempt = 0
      throw err
    }
  }

  /** Handle graceful retirement, skipping remote `stop()` on stream-loss recovery. */
  protected async onStop (stop: LifecycleStop): Promise<void> {
    log.verbose('GrpcManager', 'onStop(reason=%s)', stop.reason)
    if (stop.reason === 'recover') {
      this.remoteStopPending = false
      return
    }

    this.reconnectAttempt = 0
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
    attemptSignal: AbortSignal = scope.signal,
    onEarlyLoss?: (reason: unknown) => void,
  ): Promise<void> {
    log.verbose('GrpcManager', 'startStream()')

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
        this.streamHealthy = true
        // Only reset backoff once running (after client.start() has settled).
        if (this.isRunning) {
          this.reconnectAttempt = 0
        }
      }
      this.emit('data', event)
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
              const reason = new Error('gRPC event stream ended')
              onEarlyLoss?.(reason)
              this.handleStreamLoss(scope, reason)
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
              const reason = new Error('gRPC event stream ended')
              onEarlyLoss?.(reason)
              this.handleStreamLoss(scope, reason)
            }
            return
          }
          recordEvent(res.value)
        }
      } catch (err) {
        if (!isCancelled()) {
          this.emit('error', err)
          onEarlyLoss?.(err)
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
