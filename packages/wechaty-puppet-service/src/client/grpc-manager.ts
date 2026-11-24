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
  WechatyResolver,
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

WechatyResolver.setup()

class GrpcManager extends EventEmitter {

  protected _client?: Client<typeof Puppet>
  protected sessionManager?: Http2SessionManager
  get client (): Client<typeof Puppet> {
    if (!this._client) {
      throw new Error('NO CLIENT')
    }
    return this._client
  }

  protected abortController?: AbortController

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

  async start (): Promise<void> {
    log.verbose('GrpcManager', 'start()')

    log.verbose('GrpcManager', 'start() initializing client ...')
    await this.initClient()
    log.verbose('GrpcManager', 'start() initializing client ... done')

    log.verbose('GrpcManager', 'start() starting stream ...')
    await this.startStream()
    log.verbose('GrpcManager', 'start() starting stream ... done')

    log.verbose('GrpcManager', 'start() calling grpc server: start() ...')
    await this.client.start({})
    log.verbose('GrpcManager', 'start() calling grpc server: start() ... done')

    log.verbose('GrpcManager', 'start() ... done')
  }

  async stop (): Promise<void> {
    log.verbose('GrpcManager', 'stop()')

    log.verbose('GrpcManager', 'stop() stop stream ...')
    this.stopStream()
    log.verbose('GrpcManager', 'stop() stop stream ... done')

    let stopError: unknown
    try {
      log.verbose('GrpcManager', 'stop() stop client ...')
      if (this._client) {
        await this._client.stop({})
      }
      log.verbose('GrpcManager', 'stop() stop client ... done')
    } catch (e) {
      stopError = e
    }

    try {
      log.verbose('GrpcManager', 'stop() destroy client ...')
      this.destroyClient()
      log.verbose('GrpcManager', 'stop() destroy client ... done')
    } catch (e) {
      this.emit('error', e)
    }

    if (stopError) {
      this.emit('error', stopError)
    }

    log.verbose('GrpcManager', 'stop() ... done')
  }

  protected async initClient (): Promise<void> {
    log.verbose('GrpcManager', 'initClient()')

    const protocol = this.disableTls ? 'http' : 'https'
    let target = this.endpoint

    const formatHostPort = (host: string, port: string | number) =>
      host.includes(':') && !host.startsWith('[') ? `[${host}]:${port}` : `${host}:${port}`

    if (target.startsWith('wechaty://')) {
      const parsed = new URL(target)
      const tokenStr = (parsed.pathname || '').replace(/^\//, '')
      const authority = parsed.host || parsed.hostname || undefined
      try {
        const address = await new WechatyToken({
          authority,
          token: tokenStr,
        }).discover()
        if (address && address.host && address.port) {
          target = formatHostPort(address.host, address.port)
        } else {
          target = formatHostPort(parsed.hostname || '127.0.0.1', parsed.port || '8788')
        }
      } catch (e) {
        log.warn('GrpcManager', 'initClient() token discovery failed: %s', (e as Error).message)
        target = formatHostPort(parsed.hostname || '127.0.0.1', parsed.port || '8788')
      }
    } else if (target.startsWith('http://') || target.startsWith('https://')) {
      const parsed = new URL(target)
      target = parsed.host
    }

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

  protected async startStream (): Promise<void> {
    log.verbose('GrpcManager', 'startStream()')

    if (this.abortController) {
      this.abortController.abort()
      this.abortController = undefined
    }

    this.abortController = new AbortController()
    const signal = this.abortController.signal

    const stream = this.client.event({}, { signal })
    const iterator = stream[Symbol.asyncIterator]()

    let peekedData: EventResponse | undefined

    const firstResultPromise: Promise<IteratorResult<EventResponse>> = iterator.next()

    log.verbose('GrpcManager', 'startStream() waiting for initial heartbeat...')
    try {
      const first = await timeoutPromise(firstResultPromise, 5 * 1000) as IteratorResult<EventResponse>
      if (!first.done) {
        peekedData = first.value
      }
    } catch (err) {
      if (err instanceof TimeoutPromiseGError) {
        log.verbose('GrpcManager', 'startStream() initial heartbeat timeout, proceeding')
      } else {
        throw err
      }
    }

    // Start background event loop
    ;(async () => {
      try {
        if (peekedData) {
          this.emit('data', peekedData)
        } else {
          const first = await firstResultPromise
          if (first.done) {
            this.emit('end')
            return
          }
          this.emit('data', first.value)
        }
        while (!signal.aborted) {
          const res = await iterator.next()
          if (res.done) {
            break
          }
          this.emit('data', res.value)
        }
        this.emit('end')
      } catch (err) {
        if (!signal.aborted) {
          this.emit('error', err)
        }
      }
    })()

    log.verbose('GrpcManager', 'startStream() ... done')
  }

  protected stopStream (): void {
    log.verbose('GrpcManager', 'stopStream()')
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = undefined
    }
  }

}

export {
  GrpcManager,
}
