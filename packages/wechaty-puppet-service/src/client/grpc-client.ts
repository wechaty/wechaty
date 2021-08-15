import util from 'util'
import EventEmitter from 'events'
import crypto from 'crypto'

import {
  grpc,
  PuppetClient,
  EventRequest,
  StartRequest,
  StopRequest,
  EventResponse,
}                   from 'wechaty-grpc'

import {
  GRPC_OPTIONS,
  log,
  envVars,
}                   from '../config'

import { callCredToken }  from '../auth/mod'
import { GrpcStatus }     from '../auth/grpc-js'
import { SSL_ROOT_CERT }  from '../auth/ca'

import { PuppetServiceOptions } from './puppet-service'

class GrpcClient extends EventEmitter {

  client?      : PuppetClient
  eventStream? : grpc.ClientReadableStream<EventResponse>

  /**
   * gRPC settings
   */
  endpoint    : string
  noSslUnsafe : boolean
  servername  : string
  sslRootCert : Buffer
  token       : string

  constructor (private options: PuppetServiceOptions) {
    super()
    log.verbose('GrpcClient', 'constructor(%s)', JSON.stringify(options))

    this.sslRootCert = Buffer.from(
      envVars.WECHATY_PUPPET_SERVICE_SSL_ROOT_CERT(this.options.sslRootCert) || SSL_ROOT_CERT
    )
    log.verbose('GrpcClient', 'constructor() sslRootCert(hash): "%s"',
      crypto.createHash('sha256')
        .update(this.sslRootCert)
        .digest('hex'),
    )

    /**
     * Token will be used in the gRPC resolver (in endpoint)
     */
    this.token = envVars.WECHATY_PUPPET_SERVICE_TOKEN(this.options.token)
    log.verbose('GrpcClient', 'constructor() token: "%s"', this.token)

    this.endpoint = envVars.WECHATY_PUPPET_SERVICE_ENDPOINT(this.options.endpoint)
      || [
        'wechaty://',
        envVars.WECHATY_PUPPET_SERVICE_AUTHORITY(this.options.authority),
        '/',
        this.token,
      ].join('')
    log.verbose('GrpcClient', 'constructor() endpoint: "%s"', this.endpoint)

    /**
     *
     */
    this.noSslUnsafe = envVars.WECHATY_PUPPET_SERVICE_NO_SSL_UNSAFE_CLIENT(this.options.noSslUnsafe)
    log.verbose('GrpcClient', 'constructor() noSslUnsafe: "%s"', this.noSslUnsafe)

    /**
     * for Node.js TLS SNI
     *  https://en.wikipedia.org/wiki/Server_Name_Indication
     */
    this.servername = envVars.WECHATY_PUPPET_SERVICE_SSL_SERVER_NAME(this.options.servername)
    log.verbose('GrpcClient', 'constructor() servername: "%s"', this.servername)
  }

  async start (): Promise<void> {
    log.verbose('GrpcClient', 'start()')

    /**
     * 1. Init grpc client
     */
    await this.init()
    /**
     * 2. Connect to stream
     */
    await this.startStream()
    /**
     * 3. Start the puppet
     */
    await util.promisify(
      this.client!.start
        .bind(this.client)
    )(new StartRequest())
  }

  async stop (): Promise<void> {
    log.verbose('GrpcClient', 'stop()')

    /**
     * 1. Disconnect from stream
     */
    await this.stopStream()

    /**
     * 2. Stop the puppet
     */
    await util.promisify(
      this.client!.stop.bind(this.client)
    )(new StopRequest())
    /**
     * 3. Destroy grpc client
     */
    await this.destroy()
  }

  protected async init (): Promise<void> {
    log.verbose('GrpcClient', 'init()')

    const callCred    = callCredToken(this.token)
    const channelCred = grpc.credentials.createSsl(this.sslRootCert)
    const combCreds   = grpc.credentials.combineChannelCredentials(channelCred, callCred)

    /**
     * Huan(202108): for maximum compatible with the non-ssl community servers/clients,
     *  we introduced the WECHATY_PUPPET_SERVICE_DEPRECATED_NO_SSL_UNSAFE environment.
     *  if it has been set, then we will run under HTTP instead of HTTPS
     */
    let credential
    if (this.noSslUnsafe) {
      log.warn('PuppetServer', 'start() noSslUnsafe should not be set in production!')
      credential = grpc.credentials.createInsecure()
    } else {
      credential = combCreds
    }

    const clientOptions: grpc.ChannelOptions = {
      ...GRPC_OPTIONS,
      /**
       * Huan(202108): this is a workaround for compatiblity with the non-ssl community servers/clients.
       *  Will be removed after Dec 21, 2022.
       *
       * See: https://github.com/wechaty/wechaty-puppet-service/pull/78
       */
      'grpc.default_authority'        : this.token,
      'grpc.ssl_target_name_override' : this.servername,
    }

    if (this.client) {
      log.error('GrpcClient', 'init() this.client exists? Old client has been dropped.')
      this.client = undefined
    }

    this.client = new PuppetClient(
      this.endpoint,
      credential,
      clientOptions,
    )
  }

  protected destroy (): void {
    log.verbose('GrpcClient', 'destroy()')

    if (!this.client) {
      log.error('GrpcClient', 'destroy() this.client not exist')
      return
    }

    try {
      this.client.close()
    } catch (e) {
      log.error('GrpcClient', 'destroy() grpcClient.close() rejection: %s\n%s', e && e.message, e.stack)
    } finally {
      this.client = undefined
    }
  }

  protected async startStream (): Promise<void> {
    log.verbose('GrpcClient', 'startStream()')

    if (!this.client) {
      throw new Error('this.client not exist')
    }

    if (this.eventStream) {
      log.verbose('GrpcClient', 'startStream() this.eventStream exists, dropped.')
      this.eventStream = undefined
    }

    const eventStream = this.client.event(new EventRequest())

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
      .once('data', resolve) // (resp: EventResponse) => console.info('once(data)', JSON.parse(resp.getPayload())))
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
       *  1. If client SSL is not ok (client no-ssl but server SSL is required)
       *    then status will be:
       *      { code: 14, details: 'Connection dropped' }
       *  2. If client SSL is ok but the client token is invalid,
       *    then status will be:
       *      { code: 16, details: 'Invalid Wechaty TOKEN "0.XXX"' }
       */
      .once('status',   status => {
        // console.info('once(status)', status)
        status.code === GrpcStatus.OK
          ? resolve()
          : reject(new Error('once(status)'))
      })
      /**
       * Huan(202108): `metadata` event will be fired
       *  when the SSL connection is OK
       *    even if the token is invalid
       *
       * Conclusion: we MUST NOT listen on `metadata` for `resolve`.
       */
      // .once('metadata', (...args) => console.info('once(metadata)', ...args))

    )

    /**
     * Huan(202108): the `heartbeat` event is not guaranteed to be emitted
     *  if a puppet service provider is coming from the community, and it does not follow the protocol.
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
  }

  protected stopStream (): void {
    log.verbose('GrpcClient', 'stopStream()')

    if (!this.eventStream) {
      log.verbose('GrpcClient', 'no eventStream when stop, skip destroy.')
      return
    }

    /**
     * Huan(202003):
     *  destroy() will be enough to terminate a stream call.
     *  cancel() is not needed.
     */
    // this.eventStream.cancel()

    this.eventStream.destroy()
    this.eventStream = undefined
  }

}

export {
  GrpcClient,
}
