import util from 'util'
import EventEmitter from 'events'
import crypto from 'crypto'

import { log } from 'wechaty-puppet'
import {
  grpc,
  puppet,
}                     from 'wechaty-grpc'
import {
  WechatyToken,
  WechatyResolver,
}                     from 'wechaty-token'

import {
  GRPC_OPTIONS,
  envVars,
}                   from '../config.js'

import { callCredToken }  from '../auth/mod.js'
import { GrpcStatus }     from '../auth/grpc-js.js'
import {
  TLS_CA_CERT,
  TLS_INSECURE_SERVER_CERT_COMMON_NAME,
}                                         from '../auth/ca.js'

import type { PuppetServiceOptions } from './puppet-service.js'

/**
 * Huan(202108): register `wechaty` schema for gRPC service discovery
 *  so that we can use `wechaty:///UUIDv4` for gRPC address
 *
 *  See: https://github.com/wechaty/wechaty-puppet-service/issues/155
 */
WechatyResolver.setup()

class GrpcClient extends EventEmitter {

  protected _client?  : puppet.PuppetClient
  get       client () : puppet.PuppetClient { return this._client! }

  eventStream? : grpc.ClientReadableStream<puppet.EventResponse>

  /**
   * gRPC settings
   */
  caCert     : Buffer
  disableTls : boolean
  endpoint   : string
  serverName : string
  token      : WechatyToken

  constructor (private options: PuppetServiceOptions) {
    super()
    log.verbose('GrpcClient', 'constructor(%s)', JSON.stringify(options))

    this.caCert = Buffer.from(
      envVars.WECHATY_PUPPET_SERVICE_TLS_CA_CERT(this.options.tls?.caCert) || TLS_CA_CERT,
    )
    log.verbose('GrpcClient', 'constructor() tlsRootCert(hash): "%s"',
      crypto.createHash('sha256')
        .update(this.caCert)
        .digest('hex'),
    )

    /**
     * Token will be used in the gRPC resolver (in endpoint)
     */
    this.token = new WechatyToken(
      envVars.WECHATY_PUPPET_SERVICE_TOKEN(this.options.token),
    )
    log.verbose('GrpcClient', 'constructor() token: "%s"', this.token)

    this.endpoint = envVars.WECHATY_PUPPET_SERVICE_ENDPOINT(this.options.endpoint)
      /**
       * Wechaty Token Discovery-able URL
       *  See: wechaty-token / https://github.com/wechaty/wechaty-puppet-service/issues/155
       */
      || [
        'wechaty://',
        envVars.WECHATY_PUPPET_SERVICE_AUTHORITY(this.options.authority),
        '/',
        this.token,
      ].join('')
    log.verbose('GrpcClient', 'constructor() endpoint: "%s"', this.endpoint)

    /**
     * Disable TLS
     */
    this.disableTls = envVars.WECHATY_PUPPET_SERVICE_NO_TLS_INSECURE_CLIENT(this.options.tls?.disable)
    log.verbose('GrpcClient', 'constructor() disableTls: "%s"', this.disableTls)

    /**
     * for Node.js TLS SNI
     *  https://en.wikipedia.org/wiki/Server_Name_Indication
     */
    const serverNameIndication = envVars.WECHATY_PUPPET_SERVICE_TLS_SERVER_NAME(this.options.tls?.serverName)
      /**
       * Huan(202108): we use SNI from token
       *  if there is
       *    neither override from environment variable: `WECHATY_PUPPET_SERVICE_TLS_SERVER_NAME`
       *    nor set from: `options.tls.serverName`
       */
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
    log.verbose('GrpcClient', 'constructor() serverName(SNI): "%s"', this.serverName)
  }

  async start (): Promise<void> {
    log.verbose('GrpcClient', 'start()')

    /**
     * 1. Init grpc client
     */
    await this.initClient()
    /**
     * 2. Connect to stream
     */
    await this.startStream()
    /**
     * 3. Start the puppet
     */
    await util.promisify(
      this.client.start
        .bind(this.client),
    )(new puppet.StartRequest())
  }

  async stop (): Promise<void> {
    log.verbose('GrpcClient', 'stop()')

    /**
     * 1. Disconnect from stream
     */
    log.verbose('GrpcClient', 'stop() stop stream ...')
    this.stopStream()
    log.verbose('GrpcClient', 'stop() stop stream ... done')

    /**
     * 2. Stop the puppet
     */
    log.verbose('GrpcClient', 'stop() stop client ...')
    try {
      await util.promisify(
        this.client.stop
          .bind(this.client),
      )(new puppet.StopRequest())
    } catch (e) {
      this.emit('error', e)
    }
    log.verbose('GrpcClient', 'stop() stop client ... done')

    /**
     * 3. Destroy grpc client
     */
    log.verbose('GrpcClient', 'stop() destroy client ...')
    try {
      this.destroyClient()
    } catch (e) {
      this.emit('error', e)
    }
    log.verbose('GrpcClient', 'stop() destroy client ... done')
  }

  protected async initClient (): Promise<void> {
    log.verbose('GrpcClient', 'initClient()')

    /**
     * Huan(202108): for maximum compatible with the non-tls community servers/clients,
     *  we introduced the WECHATY_PUPPET_SERVICE_NO_TLS_INSECURE_{SERVER,CLIENT} environment variables.
     *  if it has been set, then we will run under HTTP instead of HTTPS
     */
    let credential
    if (this.disableTls) {
      log.warn('GrpcClient', 'initClient() TLS: disabled (INSECURE)')
      credential = grpc.credentials.createInsecure()
    } else {
      log.verbose('GrpcClient', 'initClient() TLS: enabled')
      const callCred    = callCredToken(this.token.token)
      const channelCred = grpc.credentials.createSsl(this.caCert)
      const combCreds   = grpc.credentials.combineChannelCredentials(channelCred, callCred)

      credential = combCreds
    }

    const clientOptions: grpc.ChannelOptions = {
      ...GRPC_OPTIONS,
      'grpc.ssl_target_name_override': this.serverName,
    }

    {
      // Deprecated: this block will be removed after Dec 21, 2022.

      /**
       * Huan(202108): `grpc.default_authority` is a workaround
       *  for compatiblity with the non-tls community servers/clients.
       *
       * See: https://github.com/wechaty/wechaty-puppet-service/pull/78
       */
      const grpcDefaultAuthority = this.token.token
      clientOptions['grpc.default_authority'] = grpcDefaultAuthority
    }

    if (this._client) {
      log.warn('GrpcClient', 'initClient() this.#client exists? Old client has been dropped.')
      this._client = undefined
    }

    this._client = new puppet.PuppetClient(
      this.endpoint,
      credential,
      clientOptions,
    )
  }

  protected destroyClient (): void {
    log.verbose('GrpcClient', 'destroyClient()')

    if (!this._client) {
      log.warn('GrpcClient', 'destroyClient() this.#client not exist')
      return
    }

    const client = this._client
    /**
      * Huan(202108): we should set `this.client` to `undefined` at the current event loop
      *   to prevent the future usage of the old client.
      */
    this._client = undefined

    try {
      client.close()
    } catch (e) {
      log.error('GrpcClient', 'destroyClient() client.close() rejection: %s\n%s', e && (e as Error).message, (e as Error).stack)
    }
  }

  protected async startStream (): Promise<void> {
    log.verbose('GrpcClient', 'startStream()')

    if (this.eventStream) {
      log.verbose('GrpcClient', 'startStream() this.eventStream exists, dropped.')
      this.eventStream = undefined
    }

    const eventStream = this.client.event(new puppet.EventRequest())

    /**
     * Store the event data from the stream when we test connection,
     *  and re-emit the event data when we have finished testing the connection
     */
    let peekedData: undefined | puppet.EventResponse

    /**
     * Huan(202108): future must be placed before other listenser registration
     *  because the on('data') will start drain the stream
     */
    const future = new Promise<void>((resolve, reject) => eventStream
      /**
       * Huan(202108): we need a `heartbeat` event to confirm the connection is alive
       *  for our wechaty-puppet-service server code, when the gRPC event stream is opened,
       *  it will emit a `heartbeat` event as early as possible.
       *
       * However, the `heartbeat` event is not guaranteed to be emitted,
       *  if the puppet service provider is coming from the community, like:
       *    - paimon
       *
       * So we also need a timeout for compatible with those providers
       *  in case of they are not following this special protocol.
       */
      .once('data', (resp: puppet.EventResponse) => {
        peekedData = resp
        resolve()
      })
      /**
       * Any of the following events will be emitted means that there's a problem.
       */
      .once('cancel', reject)
      .once('end',    reject)
      .once('error',  reject)
      /**
       * The `status` event is import when we connect a gRPC stream.
       *
       * Huan(202108): according to the unit tests (tests/grpc-client.spec.ts)
       *  1. If client TLS is not ok (client no-tls but server TLS is required)
       *    then status will be:
       *      { code: 14, details: 'Connection dropped' }
       *  2. If client TLS is ok but the client token is invalid,
       *    then status will be:
       *      { code: 16, details: 'Invalid Wechaty TOKEN "0.XXX"' }
       */
      .once('status',   status => {
        // console.info('once(status)', status)
        status.code === GrpcStatus.OK
          ? resolve()
          : reject(new Error('once(status)'))
      }),
      /**
       * Huan(202108): `metadata` event will be fired
       *  when the TLS connection is OK
       *    even if the token is invalid
       *
       * Conclusion: we MUST NOT listen on `metadata` for `resolve`.
       */
      // .once('metadata', (...args) => console.info('once(metadata)', ...args))

    )

    /**
     * Huan(202108): the `heartbeat` event is not guaranteed to be emitted
     *  if a puppet service provider is coming from the community, it might not follow the protocol specification.
     * So we need a timeout for compatible with those providers
     */
    const TIMEOUT = 5 * 1000 // 5 seconds
    const timeout = new Promise<void>(resolve => setTimeout(resolve, TIMEOUT).unref())

    // console.info('here')
    await Promise.race([
      future,
      timeout,
    ])
    // console.info('there')

    /**
     * Bridge the events
     * Huan(202108): adding the below event listeners
     *  must be after the `await future` above,
     *  so that if there's any `error` event,
     *  it will be triggered already.
     */
    eventStream
      .on('cancel',   (...args) => this.emit('cancel',    ...args))
      .on('data',     (...args) => this.emit('data',      ...args))
      .on('end',      (...args) => this.emit('end',       ...args))
      .on('error',    (...args) => this.emit('error',     ...args))
      .on('metadata', (...args) => this.emit('metadata',  ...args))
      .on('status',   (...args) => this.emit('status',    ...args))

    this.eventStream = eventStream

    /**
     * Re-emit the peeked data if there's any
     */
    if (peekedData) {
      this.emit('data', peekedData)
      peekedData = undefined
    }
  }

  protected stopStream (): void {
    log.verbose('GrpcClient', 'stopStream()')

    if (!this.eventStream) {
      log.verbose('GrpcClient', 'stopStream() no eventStream when stop, skip destroy.')
      return
    }
    /**
      * Huan(202108): we should set `this.eventStream` to `undefined` at the current event loop
      *   to prevent the future usage of the old eventStream.
      */
    const eventStream = this.eventStream
    this.eventStream = undefined

    /**
     * Huan(202003):
     *  destroy() will be enough to terminate a stream call.
     *  cancel() is not needed.
     */
    // this.eventStream.cancel()

    try {
      eventStream.destroy()
    } catch (e) {
      this.emit('error', e)
    }
  }

}

export {
  GrpcClient,
}
