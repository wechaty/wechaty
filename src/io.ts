/**
 *
 * Wechaty: Wechat for Bot. and for human who talk to bot/robot
 *
 * Class Io
 * http://www.wechaty.io
 *
 * Licenst: ISC
 * https://github.com/zixia/wechaty
 *
 */
import * as WebSocket from 'ws'

import {
    Config
  // WechatyEventName
}                   from './config'

import StateMonitor from './state-monitor'
import Wechaty      from './wechaty'
import log          from './brolog-env'

export type IoSetting = {
  wechaty:    Wechaty
  token:      string
  apihost?:   string
  protocol?:  string
}

type IoEventName =  'botie'
                  | 'error'
                  | 'heartbeat'
                  | 'login'
                  | 'message'
                  | 'raw'
                  | 'reset'
                  | 'scan'
                  | 'sys'
                  | 'shutdown'

type IoEvent = {
  name:     IoEventName
  payload:  any
}

export class Io {
  public uuid: string

  private protocol: string
  private eventBuffer: IoEvent[] = []
  private ws: WebSocket

  // private _currentState: string
  // private _targetState: string
  private state = new StateMonitor<'online', 'offline'>('Io', 'offline')

  private reconnectTimer: NodeJS.Timer | null
  private reconnectTimeout: number | null

  private onMessage: Function

  constructor(private setting: IoSetting) {
    if (!setting.wechaty || !setting.token) {
      throw new Error('Io must has wechaty & token set')
    }

    setting.apihost   = setting.apihost   || Config.apihost
    setting.protocol  = setting.protocol  || Config.DEFAULT_PROTOCOL

    this.uuid     = setting.wechaty.uuid

    this.protocol = setting.protocol + '|' + setting.wechaty.uuid
    log.verbose('Io', 'instantiated with apihost[%s], token[%s], protocol[%s], uuid[%s]'
              , setting.apihost
              , setting.token
              , setting.protocol
              , this.uuid
              )

    // this.purpose('offline')
    // this.targetState('disconnected')
    // this.currentState('disconnected')
    // this.state.target('offline')
    // this.state.current('offline')
  }

  // // targetState : 'connected' | 'disconnected'
  // private targetState(newState?) {
  //   if (newState) {
  //     log.verbose('Io', 'targetState(%s)', newState)
  //     this._targetState = newState
  //   }
  //   return this._targetState
  // }

  // // currentState : 'connecting' | 'connected' | 'disconnecting' | 'disconnected'
  // private currentState(newState?) {
  //   if (newState) {
  //     log.verbose('Io', 'currentState(%s)', newState)
  //     this._currentState = newState
  //   }
  //   return this._currentState
  // }

  public toString() { return 'Class Io(' + this.setting.token + ')'}

  private connected() { return this.ws && this.ws.readyState === WebSocket.OPEN }

  public async init(): Promise<void> {
    log.verbose('Io', 'init()')

    // this.targetState('connected')
    // this.currentState('connecting')
    this.state.target('online')
    this.state.current('online', false)

    try {
      await this.initEventHook()
      await this.initWebSocket()

      // this.currentState('connected')
      this.state.current('online')

      return
    } catch (e) {
      log.warn('Io', 'init() exception: %s', e.message)
      // this.currentState('disconnected')
      this.state.current('offline')
      throw e
    }
  }

  private initWebSocket() {
    log.verbose('Io', 'initWebSocket()')
    // this.currentState('connecting')
    this.state.current('online', false)

    // const auth = 'Basic ' + new Buffer(this.setting.token + ':X').toString('base64')
    const auth = 'Token ' + this.setting.token
    const headers = { 'Authorization': auth }

    if (!this.setting.apihost) {
      throw new Error('no apihost')
    }
    let endpoint = 'wss://' + this.setting.apihost + '/v0/websocket'

    // XXX quick and dirty: use no ssl for APIHOST other than official
    if (!/api\.wechaty\.io/.test(this.setting.apihost)) {
      endpoint = 'ws://' + this.setting.apihost + '/v0/websocket'
    }

    const ws = this.ws = new WebSocket(endpoint, this.protocol, { headers })

    ws.on('open', () => {
      if (this.protocol !== ws.protocol) {
        log.error('Io', 'initWebSocket() require protocol[%s] failed', this.protocol)
        // XXX deal with error?
      }
      log.verbose('Io', 'initWebSocket() connected with protocol [%s]', ws.protocol)
      // this.currentState('connected')
      this.state.current('online')

      // FIXME: how to keep alive???
      // ws._socket.setKeepAlive(true, 100)

      this.reconnectTimeout = null

      const initEvent = <IoEvent>{
        name: 'sys'
        , payload: 'Wechaty version ' + this.setting.wechaty.version() + ` with UUID: ${this.uuid}`
      }
      this.send(initEvent)

    })

    ws.on('message', (data, flags) => {
      log.silly('Io', 'initWebSocket() ws.on(message): %s', data)
      // flags.binary will be set if a binary data is received.
      // flags.masked will be set if the data was masked.

      const ioEvent = {
        name: 'raw'
        , payload: data
      }

      try {
        const obj = JSON.parse(data)
        ioEvent.name    = obj.name
        ioEvent.payload = obj.payload
      } catch (e) {
        log.verbose('Io', 'on(message) recv a non IoEvent data[%s]', data)
      }

      switch (ioEvent.name) {
        case 'botie':
          const payload = ioEvent.payload
          if (payload.onMessage) {
            const script = payload.script
            /* tslint:disable:no-eval */
            const fn = eval(script)
            if (typeof fn === 'function') {
              this.onMessage = fn
            } else {
              log.warn('Io', 'server pushed function is invalid')
            }
          }
          break

        case 'reset':
          log.verbose('Io', 'on(reset): %s', ioEvent.payload)
          this.setting.wechaty.reset(ioEvent.payload)
          break

        case 'shutdown':
          log.warn('Io', 'on(shutdown): %s', ioEvent.payload)
          process.exit(0)
          break

        case 'update':
          log.verbose('Io', 'on(report): %s', ioEvent.payload)
          const user = this.setting.wechaty.user()
          if (user) {
            const loginEvent: IoEvent = {
              name:       'login'
              // , payload:  user.obj
              , payload:  user
            }
            this.send(loginEvent)
          }

          // XXX: Puppet should not has `scan` variable ...
          const scan = this.setting.wechaty
                        && this.setting.wechaty.puppet
                        && this.setting.wechaty.puppet['scan']
          if (scan) {
            const scanEvent: IoEvent = {
              name: 'scan'
              , payload: scan
            }
            this.send(scanEvent)
          }

          break

        case 'sys':
          // do nothing
          break

        default:
          log.warn('Io', 'UNKNOWN on(%s): %s', ioEvent.name, ioEvent.payload)
          break
      }
    })

    ws.on('error', e => {
      log.warn('Io', 'initWebSocket() error event[%s]', e.message)
      this.setting.wechaty.emit('error', e)

      // when `error`, there must have already a `close` event
      // we should not call this.reconnect() again
      //
      // this.close()
      // this.reconnect()
    })
    .on('close', (code, message) => {
      log.warn('Io', 'initWebSocket() close event[%d: %s]', code, message)
      ws.close()
      this.reconnect()
    })

    return Promise.resolve(ws)
  }

  private reconnect() {
    log.verbose('Io', 'reconnect()')

    // if (this.targetState() === 'disconnected') {
    if (this.state.target() === 'offline') {
      log.verbose('Io', 'reconnect() canceled because state.target() === offline')
      return
    }

    if (this.connected()) {
      log.warn('Io', 'reconnect() on a already connected io')
      return
    }
    if (this.reconnectTimer) {
      log.warn('Io', 'reconnect() on a already re-connecting io')
      return
    }

    if (!this.reconnectTimeout) {
      this.reconnectTimeout = 1
    } else if (this.reconnectTimeout < 10000) {
      this.reconnectTimeout *= 3
    }

    log.warn('Io', 'reconnect() will reconnect after %d s', Math.floor(this.reconnectTimeout / 1000))
    this.reconnectTimer = setTimeout(_ => {
      this.reconnectTimer = null
      this.initWebSocket()
    }, this.reconnectTimeout)
  }

  private initEventHook() {
    log.verbose('Io', 'initEventHook()')
    const wechaty = this.setting.wechaty

    wechaty.on('message', this.ioMessage)

    wechaty.on('scan', (url, code) => this.send({ name: 'scan', payload: { url, code } }))

    wechaty.on('login'  , user => this.send({ name: 'login', payload: user }))
    wechaty.on('logout' , user => this.send({ name: 'login', payload: user }))

    wechaty.on('heartbeat', data  => this.send({ name: 'heartbeat', payload: { uuid: this.uuid, data } }))
    wechaty.on('error'    , error => this.send({ name: 'error', payload: error }))

    // const hookEvents: WechatyEventName[] = [
    //   'scan'
    //   , 'login'
    //   , 'logout'
    //   , 'heartbeat'
    //   , 'error'
    // ]
    // hookEvents.map(event => {
    //   wechaty.on(event, (data) => {
    //     const ioEvent: IoEvent = {
    //       name:       event
    //       , payload:  data
    //     }

    //     switch (event) {
    //       case 'login':
    //       case 'logout':
    //         if (data instanceof Contact) {
    //           // ioEvent.payload = data.obj
    //           ioEvent.payload = data
    //         }
    //         break

    //       case 'error':
    //         ioEvent.payload = data.toString()
    //         break

        //   case 'heartbeat':
        //     ioEvent.payload = {
        //       uuid: this.uuid
        //       , data: data
        //     }
        //     break

        //   default:
        //     break
        // }

    //     this.send(ioEvent)
    //   })
    // })

    // wechaty.on('message', m => {
    //   const text = (m.room() ? '[' + m.room().topic() + ']' : '')
    //               + '<' + m.from().name() + '>'
    //               + ':' + m.toStringDigest()

    //   this.send({ name: 'message', payload:  text })
    // })

    return
  }

  private async send(ioEvent?: IoEvent): Promise<void> {
    if (ioEvent) {
      log.silly('Io', 'send(%s: %s)', ioEvent.name, ioEvent.payload)
      this.eventBuffer.push(ioEvent)
    } else { log.silly('Io', 'send()') }

    if (!this.connected()) {
      log.verbose('Io', 'send() without a connected websocket, eventBuffer.length = %d', this.eventBuffer.length)
      return
    }

    const list: Promise<any>[] = []
    while (this.eventBuffer.length) {
      const p = new Promise((resolve, reject) => this.ws.send(
        JSON.stringify(
          this.eventBuffer.shift()
        )
        , (err: Error) => {
          if (err)  { reject(err) }
          else      { resolve()   }
        }
      ))
      list.push(p)
    }

    try {
      await Promise.all(list)
    } catch (e) {
      log.error('Io', 'send() exceptio: %s', e.stack)
      throw e
    }
  }

  private close() {
    log.verbose('Io', 'close()')
    // this.targetState('disconnected')
    // this.currentState('disconnecting')
    this.state.target('offline')
    this.state.current('offline', false)

    this.ws.close()
    // this.currentState('disconnected')
    this.state.current('offline')

    // TODO: remove listener for this.setting.wechaty.on(message )
    return Promise.resolve()
  }

  public quit() {
    // this.targetState('disconnected')
    // this.currentState('disconnecting')
    this.state.target('offline')
    this.state.current('offline', false)

    // try to send IoEvents in buffer
    this.send()
    this.eventBuffer = []

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.close()

    // this.currentState('disconnected')
    this.state.current('offline')

    return Promise.resolve()
  }
  /**
   *
   * Prepare to be overwriten by server setting
   *
   */
  private ioMessage(m) {
    log.verbose('Io', 'ioMessage() is a nop function before be overwriten from cloud')
  }

}

export default Io
