import { EventEmitter } from 'events'

// import cuid        from 'cuid'
import WebSocket        from 'ws'
import { Subscription } from 'rxjs'
import Peer, {
  parse,
}                       from 'json-rpc-peer'

import {
  ThrottleQueue,
  DebounceQueue,
}                       from 'rx-queue'

// , {
  // JsonRpcPayload,
  // JsonRpcPayloadRequest,
  // JsonRpcPayloadNotification,
  // JsonRpcPayloadResponse,
  // JsonRpcPayloadError,
  // JsonRpcParamsSchemaByName,
  // JsonRpcParamsSchemaByPositional,
  // parse,
// }                                   from 'json-rpc-peer'

import {
  // PadchatContinue,
  // PadchatMsgType,
  // PadchatStatus,

  PadchatPayload,
  PadchatPayloadType,

  // PadchatContactMsgType,
  PadchatContactPayload,

  PadchatMessagePayload,

  PadchatRoomMemberPayload,
  PadchatRoomMemberListPayload,
  PadchatRoomPayload,
}                             from './padchat-schemas'

import {
  // AutoDataType,
  PadchatRpcRequest,
  InitType,
  WXGenerateWxDatType,
  WXGetQRCodeType,
  WXInitializeType,
  WXCheckQRCodePayload,
  WXHeartBeatType,
  WXGetLoginTokenType,
  WXAutoLoginType,
  WXLoginRequestType,
  WXSendMsgType,
  WXLoadWxDatType,
  WXQRCodeLoginType,
  StandardType,
  WXAddChatRoomMemberType,
  WXLogoutType,
  WXSearchContactType,
  WXSearchContactTypeStatus,
  WXRoomAddTypeStatus,
}                             from './padchat-rpc.type'

import {
  isContactId,
  isRoomId,
  padchatDecode,
  stripBugChatroomId,
}                       from './pure-function-helpers/'

import { log }          from '../config'

let HEART_BEAT_COUNTER = 0

export class PadchatRpc extends EventEmitter {
  private socket?          : WebSocket
  private readonly jsonRpc : any // Peer

  private throttleQueue?       : ThrottleQueue<string>
  private debounceQueue?       : DebounceQueue<string>
  private logoutThrottleQueue? : ThrottleQueue<string>

  private throttleSubscription?       : Subscription
  private debounceSubscription?       : Subscription
  private logoutThrottleSubscription? : Subscription

  constructor(
    protected endpoint : string,
    protected token    : string,
  ) {
    super() // for EventEmitter
    log.verbose('PadchatRpc', 'constructor(%s, %s)', endpoint, token)

    this.jsonRpc = new Peer()
  }

  public async start(): Promise<void> {
    log.verbose('PadchatRpc', 'start()')

    await this.initWebSocket()
    await this.initJsonRpc()

    this.startQueues()

    await this.init()
    await this.WXInitialize()

  }

  protected async initJsonRpc(): Promise<void> {
    log.verbose('PadchatRpc', 'initJsonRpc()')

    if (!this.socket) {
      throw new Error('socket had not been opened yet!')
    }

    this.jsonRpc.on('error', () => {
      // TypeError: Cannot read property 'resolve' of undefined
      // https://github.com/JsCommunity/json-rpc-peer/issues/52
    })
    this.jsonRpc.on('data', (buffer: string | Buffer) => {
      // log.silly('PadchatRpc', 'initJsonRpc() jsonRpc.on(data)')

      if (!this.socket) {
        throw new Error('no web socket')
      }

      const text = String(buffer)
      const payload = parse(text) // as JsonRpcPayloadRequest

      /**
       * A Gateway at here:
       *
       *  1. Convert Payload format from JsonRpc to Padchat, then
       *  2. Send payload to padchat server
       *
       */
      // const encodedParam = (payload.params as JsonRpcParamsSchemaByPositional).map(encodeURIComponent)
      const encodedParam = payload.params.map(encodeURIComponent)

      const message: PadchatRpcRequest = {
        userId  : this.token,
        msgId   : payload.id,
        apiName : payload.method,
        param   : encodedParam,
      }

      // log.silly('PadchatRpc', 'initJsonRpc() jsonRpc.on(data) converted to padchat payload="%s"', JSON.stringify(message))

      this.socket.send(JSON.stringify(message))
    })
  }

  protected async initWebSocket(): Promise<void> {
    log.verbose('PadchatRpc', 'initWebSocket()')

    if (this.socket) {
      throw new Error('socket had already been opened!')
    }

    const ws = new WebSocket(
      this.endpoint,
      { perMessageDeflate: true },
    )

    /**
     * 1. Message
     *  1.1. Deal with payload
     */
    ws.on('message', (data: string) => {

      // log.silly('PadchatRpc', 'initWebSocket() ws.on(message)')
      try {
        const payload: PadchatPayload = JSON.parse(data)
        this.onSocket(payload)
      } catch (e) {
        log.warn('PadchatRpc', 'initWebSocket() ws.on(message) exception: %s', e)
        this.emit('error', e)
      }
    })

    /**
     * 1. Message
     *  1.2. use websocket message as heartbeat source
     */
    ws.on('message', () => {
      if (!this.throttleQueue || !this.debounceQueue) {
        log.warn('PadchatRpc', 'initWebSocket() ws.on(message) throttleQueue or debounceQueue not exist')
        return
      }
      this.throttleQueue.next('ws.on(message)')
      this.debounceQueue.next('ws.on(message)')
    })

    /**
     * 2. Error
     */
    ws.on('error', e => {
      log.warn('PadchatRpc', 'initWebSocket() ws.on(error) %s', e)
      this.emit('error', e)
    })

    /**
     * 3. Close
     */
    ws.on('close', e => {
      log.warn('PadchatRpc', 'initWebSocket() ws.on(close) %s', e)

      if (!this.logoutThrottleQueue) {
        log.warn('PadchatRpc', 'initWebSocket() ws.on(close) logoutThrottleQueue not exist')
        return
      }

      this.logoutThrottleQueue.next('ws.on(close, ' + e)
    })

    /**
     * 4. Pong
     */
    ws.on('pong', data => {
      log.silly('PadchatRpc', 'initWebSocket() ws.on(pong)')
      if (!this.throttleQueue || !this.debounceQueue) {
        log.warn('PadchatRpc', 'initWebSocket() ws.on(pong) throttleQueue or debounceQueue not exist')
        return
      }
      this.throttleQueue.next('pong: ' + data.toString())
      this.debounceQueue.next('pong: ' + data.toString())
    })

    /**
     * 5. Wait the WebSocket to be connected
     */
    await new Promise((resolve, reject) => {
      ws.once('open', () => {
        log.silly('PadchatRpc', 'initWebSocket() Promise() ws.on(open)')
        return resolve()
      })

      ws.once('error', (e) => {
        log.silly('PadchatRpc', 'initWebSocket() Promise() ws.on(error) %s', e)
        return reject()
      })
      ws.once('close', () => {
        log.silly('PadchatRpc', 'initWebSocket() Promise() ws.on(close)')
        return reject()
      })
    })

    /**
     * 6. Set socket to the new WebSocket instance
     */
    this.socket = ws

  }

  private initHeartbeat(): void {
    log.verbose('PadchatRpc', 'initHeartbeat()')

    if (!this.throttleQueue || !this.debounceQueue) {
      log.warn('PadchatRpc', 'initHeartbeat() throttleQueue or debounceQueue not exist')
      return
    }

    if (this.throttleSubscription || this.debounceSubscription) {
      throw new Error('subscription exist when initHeartbeat')
    }

    this.throttleSubscription = this.throttleQueue.subscribe(e => {
      /**
       * This block will only be run once in a period,
       *  no matter than how many message the queue received.
       */
      log.silly('PadchatRpc', 'initHeartbeat() throttleQueue.subscribe(%s)', e)
      this.emit('heartbeat', e)
    })

    this.debounceSubscription = this.debounceQueue.subscribe(e => {
      /**
       * This block will be run when:
       *  the queue did not receive any message after a period.
       */
      log.silly('PadchatRpc', 'initHeartbeat() debounceQueue.subscribe(%s)', e)
      if (!this.socket) {
        throw new Error('no socket')
      }
      // expect the server will response a 'pong' message
      this.socket.ping(`#${HEART_BEAT_COUNTER++} from debounceQueue`)
    })

  }

  protected reset(reason = 'unknown reason'): void {
    log.verbose('PadchatRpc', 'reset(%s)', reason)

    // no need to stop() at here. the high layer will do this.
    //
    // try {
    //   this.stop()
    // } catch (e) {
    //   // fall safe
    // }

    this.emit('reset', reason)
  }

  public stop(): void {
    log.verbose('PadchatRpc', 'stop()')

    this.stopQueues()

    this.jsonRpc.removeAllListeners()
    // TODO: use huan's version of JsonRpcPeer, to support end at here.
    // this.jsonRpc.end()

    if (this.socket) {
      this.socket.removeAllListeners()
      this.socket.close()

      this.socket = undefined
    } else {
      log.warn('PadchatRpc', 'stop() no socket')
    }
  }

  private startQueues() {
    log.verbose('PadchatRpc', 'startQueues()')

    /**
     * Throttle for 10 seconds
     */
    this.throttleQueue = new ThrottleQueue<string>(1000 * 10)
    /**
     * Debounce for 20 seconds
     */
    this.debounceQueue = new DebounceQueue<string>(1000 * 10 * 2)

    /**
     * Throttle for 5 seconds for the `logout` event:
     *  we should only fire once for logout,
     *  but the server will send many events of 'logout'
     */
    this.logoutThrottleQueue = new ThrottleQueue<string>(1000 * 5)

    this.initHeartbeat()

    if (this.logoutThrottleSubscription) {
      throw new Error('this.logoutThrottleSubscription exist')
    } else {
      this.logoutThrottleSubscription = this.logoutThrottleQueue.subscribe(async msg => {
        await this.reset(msg)
      })
    }
  }

  private stopQueues() {
    log.verbose('PadchatRpc', 'stopQueues()')

    if (   this.throttleSubscription
      && this.debounceSubscription
      && this.logoutThrottleSubscription
    ) {
      // Clean external subscriptions
      this.debounceSubscription.unsubscribe()
      this.logoutThrottleSubscription.unsubscribe()
      this.throttleSubscription.unsubscribe()

      this.debounceSubscription       = undefined
      this.logoutThrottleSubscription = undefined
      this.throttleSubscription       = undefined
    }

    if (   this.debounceQueue
        && this.logoutThrottleQueue
        && this.throttleQueue
    ) {
      /**
       * Queues clean internal subscriptions
       */
      this.debounceQueue.unsubscribe()
      this.logoutThrottleQueue.unsubscribe()
      this.throttleQueue.unsubscribe()

      this.debounceQueue       = undefined
      this.logoutThrottleQueue = undefined
      this.throttleQueue       = undefined

    } else {
      log.warn('PadchatRpc', 'stop() subscript not exist')
    }
  }

  private async rpcCall(
    apiName   : string,
    ...params : (number | string)[]
  ): Promise<any> {
    log.silly('PadchatRpc', 'rpcCall(%s, %s)', apiName, JSON.stringify(params).substr(0, 500))
    return await this.jsonRpc.request(apiName, params)
  }

  protected onSocket(payload: PadchatPayload) {
    // log.silly('PadchatRpc', 'onSocket(payload.length=%d)',
    //                           JSON.stringify(payload).length,
    //             )
    // console.log('server payload:', payload)

    if (payload.type === PadchatPayloadType.Logout) {
      // {"type":-1,"msg":"掉线了"}
      log.verbose('PadchatRpc', 'onSocket(payload.type=%s) logout, payload=%s(%s)',
                                PadchatPayloadType[payload.type],
                                payload.type,
                                JSON.stringify(payload),
                  )
      if (this.logoutThrottleQueue) {
        this.logoutThrottleQueue.next(payload.msg || 'onSocket(logout)')
      } else {
        log.warn('PadchatRpc', 'onSocket() logout logoutThrottleQueue not exist')
      }
      return
    }

    if (!payload.msgId && !payload.data) {
      /**
       * Discard message that have neither msgId(Padchat API Call) nor data(Tencent Message)
       */
      if (Object.keys(payload).length === 4) {
        // {"apiName":"","data":"","msgId":"","userId":"padchat-token-zixia"}
        // just return for this message
        return
      }
      log.silly('PadchatRpc', 'onSocket() discard payload without `msgId` and `data` for: %s', JSON.stringify(payload))
      return
    }

    if (payload.msgId) {
      // 1. Padchat Payload
      //
      // padchatPayload:
      // {
      //     "apiName": "WXHeartBeat",
      //     "data": "%7B%22status%22%3A0%2C%22message%22%3A%22ok%22%7D",
      //     "msgId": "abc231923912983",
      //     "userId": "test"
      // }
      this.onSocketPadchat(payload)
    } else {
      // 2. Tencent Payload
      //
      // messagePayload:
      // {
      //   "apiName": "",
      //   "data": "XXXX",
      //   "msgId": "",
      //   "userId": "test"
      // }

      const tencentPayloadList: PadchatMessagePayload[] = padchatDecode(payload.data)

      if (!Array.isArray(tencentPayloadList)) {
        throw new Error('not array')
      }

      this.onSocketTencent(tencentPayloadList)
    }
  }

  protected onSocketPadchat(padchatPayload: PadchatPayload): void {
    // log.verbose('PadchatRpc', 'onSocketPadchat({apiName="%s", msgId="%s", ...})',
    //                                     padchatPayload.apiName,
    //                                     padchatPayload.msgId,
    //             )
    // log.silly('PadchatRpc', 'onSocketPadchat(%s)', JSON.stringify(padchatPayload).substr(0, 500))

    let result: any

    if (padchatPayload.data) {
      result = padchatDecode(padchatPayload.data)
    } else {
      log.silly('PadchatRpc', 'onServerMessagePadchat() discard empty payload.data for apiName: %s', padchatPayload.apiName)
      result = {}
    }

    // const jsonRpcResponse: JsonRpcPayloadResponse = {
    const jsonRpcResponse = {
      id      : padchatPayload.msgId,
      jsonrpc : '2.0',
      result  : result,
      type    : 'response',
    }

    const responseText = JSON.stringify(jsonRpcResponse)
    // log.silly('PadchatRpc', 'onSocketPadchat() converted to JsonRpc payload="%s"', responseText.substr(0, 500))

    this.jsonRpc.write(responseText)
  }

  protected onSocketTencent(messagePayloadList: PadchatMessagePayload[]) {
    // console.log('tencent messagePayloadList:', messagePayloadList)

    for (const messagePayload of messagePayloadList) {
      if (!messagePayload.msg_id) {
        // {"continue":0,"msg_type":32768,"status":1,"uin":1928023446}
        log.silly('PadchatRpc', 'onSocketTencent() discard empty message msg_id payoad: %s',
                                JSON.stringify(messagePayload),
                  )
        continue
      }
      // log.silly('PadchatRpc', 'onSocketTencent() messagePayload: %s', JSON.stringify(messagePayload))

      this.emit('message', messagePayload)
    }
  }

  /**
   * Init with WebSocket Server
   */
  protected async init(): Promise<InitType> {
    const result: InitType = await this.rpcCall('init')
    log.silly('PadchatRpc', 'init result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('cannot connect to WebSocket init')
    }
    return result
  }

  /**
   * Get WX block memory
   */
  protected async WXInitialize(): Promise<WXInitializeType> {
    log.verbose('PadchatRpc', 'WXInitialize()')

    const result = await this.rpcCall('WXInitialize')
    log.silly('PadchatRpc', 'WXInitialize result: %s', JSON.stringify(result))

    if (!result || result.status !== 0) {
      throw Error('cannot connect to WebSocket WXInitialize')
    }
    return result
  }

  protected async WXGetQRCode(): Promise<WXGetQRCodeType> {
    const result = await this.rpcCall('WXGetQRCode')
    return result
  }

  public async WXCheckQRCode(): Promise<WXCheckQRCodePayload> {
    const result = await this.rpcCall('WXCheckQRCode')
    log.silly('PadchatRpc', 'WXCheckQRCode result: %s', JSON.stringify(result))
    if (!result) {
      throw Error('cannot connect to WebSocket WXCheckQRCode')
    }
    return result
  }

  public async WXHeartBeat(): Promise<WXHeartBeatType> {
    const result = await this.rpcCall('WXHeartBeat')
    log.silly('PadchatRpc', 'WXHeartBeat result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXHeartBeat error! canot get result from websocket server')
    }
    return result
  }

  /**
   * Load all Contact and Room
   * see issue https://github.com/lijiarui/wechaty-puppet-padchat/issues/39
   * @returns {Promise<(PadchatRoomPayload | PadchatContactPayload)[]>}
   */
  public async WXSyncContact(): Promise<(PadchatRoomPayload | PadchatContactPayload)[]> {
    const result = await this.rpcCall('WXSyncContact')
    if (!result) {
      throw Error('WXSyncContact error! canot get result from websocket server')
    }
    return result
  }

  /**
   * Generate 62 data
   *
   * 1. Call multiple times in the same session, will return the same data
   * 2. Call multiple times between sessions with the same token, will return the same data
   */
  public async WXGenerateWxDat(): Promise<string> {
    const result: WXGenerateWxDatType = await this.rpcCall('WXGenerateWxDat')
    log.silly('PadchatRpc', 'WXGenerateWxDat result: %s', JSON.stringify(result))
    if (!result || !(result.data) || result.status !== 0) {
      throw Error('WXGenerateWxDat error! canot get result from websocket server')
    }
    return result.data
  }

  /**
   * Load 62 data
   * @param {string} wxData     autoData.wxData
   */
  public async WXLoadWxDat(wxData: string): Promise<WXLoadWxDatType> {
    const result = await this.rpcCall('WXLoadWxDat', wxData)
    if (!result || result.status !== 0) {
      throw Error('WXLoadWxDat error! canot get result from websocket server')
    }
    return result
  }

  public async WXGetLoginToken(): Promise<string> {
    const result: WXGetLoginTokenType = await this.rpcCall('WXGetLoginToken')
    log.silly('PadchatRpc', 'WXGetLoginToken result: %s', JSON.stringify(result))
    if (!result || !result.token || result.status !== 0) {
      throw Error('WXGetLoginToken error! canot get result from websocket server')
    }
    return result.token
  }

  /**
   * Login with token automatically
   * @param {string} token    autoData.token
   * @returns {string} user_name | ''
   */
  public async WXAutoLogin(token: string): Promise<undefined | WXAutoLoginType> {
    const result = await this.rpcCall('WXAutoLogin', token)
    log.silly('PadchatRpc', 'WXAutoLogin result: %s, type: %s', JSON.stringify(result), typeof result)
    return result
  }

  /**
   * Login with QRcode
   * @param {string} token    autoData.token
   */
  public async WXLoginRequest(token: string): Promise<undefined | WXLoginRequestType> {
    const result = await this.rpcCall('WXLoginRequest', token)
    log.silly('PadchatRpc', 'WXLoginRequest result: %s, type: %s', JSON.stringify(result), typeof result)
    return result
  }

  /**
   * Send Text Message
   * @param {string} to       user_name
   * @param {string} content  text
   */
  public async WXSendMsg(to: string, content: string, at = ''): Promise<WXSendMsgType> {
    if (to) {
      const result = await this.rpcCall('WXSendMsg', to, content, at)
      if (!result || result.status !== 0) {
        throw Error('WXSendMsg error! canot get result from websocket server')
      }
      return result
    }
    throw Error('PadchatRpc, WXSendMsg error! no to!')
  }

  /**
   * Send Image Message
   * @param {string} to     user_name
   * @param {string} data   image_data
   */
  public async WXSendImage(to: string, data: string): Promise<void> {
    await this.rpcCall('WXSendImage', to, data)
  }

  /**
   * Get contact by contact id
   * @param {any} id        user_name
   */
  public async WXGetContact(id: string): Promise<any> {
    const result = await this.rpcCall('WXGetContact', id)

    if (!result) {
      throw Error('PadchatRpc, WXGetContact, cannot get result from websocket server!')
    }

    log.silly('PadchatRpc', 'WXGetContact(%s) result: %s', id, JSON.stringify(result))

    if (!result.user_name) {
      log.warn('PadchatRpc', 'WXGetContact cannot get user_name, id: %s, "%s"', id, JSON.stringify(result))
    }
    return result
  }

  /**
   * Get contact by contact id
   * @param {any} id        user_name
   */
  public async WXGetContactPayload(id: string): Promise<PadchatContactPayload> {
    if (!isContactId(id)) { // /@chatroom$/.test(id)) {
      throw Error(`should use WXGetRoomPayload because get a room id :${id}`)
    }
    const result = await this.WXGetContact(id) as PadchatContactPayload
    return result
  }

  /**
   * Get contact by contact id
   * @param {any} id        user_name
   */
  public async WXGetRoomPayload(id: string): Promise<PadchatRoomPayload> {
    if (!isRoomId(id)) { // (/@chatroom$/.test(id))) {
      throw Error(`should use WXGetContactPayload because get a contact id :${id}`)
    }
    const result = await this.WXGetContact(id)

    if (result.member) {
      result.member = padchatDecode(result.member)
    }

    return result
  }

  /**
   * Get all member of a room by room id
   * @param {any} roomId        chatroom_id
   */
  public async WXGetChatRoomMember(roomId: string): Promise<null | PadchatRoomMemberListPayload> {
    const result = await this.rpcCall('WXGetChatRoomMember', roomId)
    if (!result) {
      throw Error('PadchatRpc, WXGetChatRoomMember, cannot get result from websocket server!')
    }

    // roomId not exist. (or no permision?)
    // See: https://github.com/lijiarui/wechaty-puppet-padchat/issues/64#issuecomment-397319016
    if (result.status === -19) {
      return null
    }

    /**
     * Bot quit the room, no roomId
     * See: https://github.com/lijiarui/wechaty-puppet-padchat/issues/38
     * {"chatroom_id":0,"count":0,"member":"null\n","message":"","status":0,"user_name":""}
     */
    if (result.count === 0 && result.status === 0 && result.chatroom_id === 0) {
      return null
    }

    log.silly('PadchatRpc', 'WXGetChatRoomMember() result: %s', JSON.stringify(result).substr(0, 500))

    // 00:40:44 SILL PadchatRpc WXGetChatRoomMember() result: {"chatroom_id":0,"count":0,"member":"null\n","message":"","status":0,"user_name":""}

    try {
      const tryMemberList: null | PadchatRoomMemberPayload[] = padchatDecode(result.member)

      if (Array.isArray(tryMemberList)) {
        result.member = tryMemberList
      } else if (tryMemberList !== null) {
        log.warn('PadchatRpc', 'WXGetChatRoomMember(%s) member is neither array nor null: %s', roomId, JSON.stringify(result.member))
        // throw Error('faild to parse chatroom member!')
        result.member = []
      }

    } catch (e) {
      console.error(e)
      console.error('decode error data: ', result.member)
      log.warn('PadchatRpc', 'WXGetChatRoomMember(%s) result.member decode error: %s', roomId, e)
      result.member = []
    }
    return result
  }

  /**
   * Login successfully by qrcode
   * @param {any} username        user_name
   * @param {any} password  password
   */
  public async WXQRCodeLogin(username: string, password: string): Promise<WXQRCodeLoginType> {
    const result = await this.rpcCall('WXQRCodeLogin', username, password)

    if (!result) {
      throw Error(`PadchatRpc, WXQRCodeLogin, unknown error, data: ${JSON.stringify(result)}`)
    }

    if (result.status === 0) {
      log.silly('PadchatRpc', 'WXQRCodeLogin, login successfully!')
      return result
    }

    if (result.status === -3) {
      throw Error('PadchatRpc, WXQRCodeLogin, wrong user_name or password')
    } else if (result.status === -301) {
      log.warn('PadchatRpc', 'WXQRCodeLogin, redirect 301')
      return this.WXQRCodeLogin(username, password)
    }
    throw Error('PadchatRpc, WXQRCodeLogin, unknown status: ' + result.status)
  }

  public async WXSetUserRemark(id: string, remark: string): Promise<StandardType> {
    const result = await this.rpcCall('WXSetUserRemark', id, remark)
    log.silly('PadchatRpc', 'WXSetUserRemark result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXSetUserRemark error! canot get result from websocket server')
    }
    return result
  }

  public async WXDeleteChatRoomMember(roomId: string, contactId: string): Promise<StandardType> {
    const result = await this.rpcCall('WXDeleteChatRoomMember', roomId, contactId)
    log.silly('PadchatRpc', 'WXDeleteChatRoomMember result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXDeleteChatRoomMember error! canot get result from websocket server')
    }
    return result
  }

  public async WXAddChatRoomMember(roomId: string, contactId: string): Promise<number> {
    const result: WXAddChatRoomMemberType = await this.rpcCall('WXAddChatRoomMember', roomId, contactId)
    log.silly('PadchatRpc', 'WXAddChatRoomMember result: %s', JSON.stringify(result))

    if (!result) {
      throw Error('WXAddChatRoomMember error! canot get result from websocket server')
    }

    if (result.status === WXRoomAddTypeStatus.Done) {
      // see more in WXAddChatRoomMemberType
      if (/OK/i.test(result.message)) {
        return 0
      }
      log.warn('PadchatRpc', 'WXAddChatRoomMember() status = 0 but message is not OK: ' + result.message)
      return -1
    }

    /**
     * see https://github.com/lijiarui/wechaty-puppet-padchat/issues/70
     * If room member more than 40
     * Need call `WXInviteChatRoomMember` instead `WXAddChatRoomMember`
     */
    if (result.status === WXRoomAddTypeStatus.NeedInvite) {
      log.silly('PadchatRpc', 'WXAddChatRoomMember change to WXInviteChatRoomMember')
      return this.WXInviteChatRoomMember(roomId, contactId)
    }

    if (result.status === WXRoomAddTypeStatus.InviteConfirm) {
      // result: {"message":"","status":-2028}
      // May be the owner has see not allow other people to join in the room (群聊邀请确认)
      log.warn('PadchatRpc', 'WXAddChatRoomMember failed! maybe owner open the should confirm first to invited others to join in the room.')
    }

    return result.status
  }

  /**
   * When member more than 40, use WXInviteChatRoomMember
   * When member less than 40, use WXAddChatRoomMember
   *
   * @param {string} roomId
   * @param {string} contactId
   * @returns {Promise<number>}
   */
  public async WXInviteChatRoomMember(roomId: string, contactId: string): Promise<number> {
    // TODO:
    // Change `WXAddChatRoomMemberType` to `WXInviteChatRoomMemberType`
    const result: WXAddChatRoomMemberType = await this.rpcCall('WXInviteChatRoomMember', roomId, contactId)
    log.silly('PadchatRpc', 'WXInviteChatRoomMember result: %s', JSON.stringify(result))

    if (!result) {
      throw Error('WXInviteChatRoomMember error! canot get result from websocket server')
    }

    if (result.status === WXRoomAddTypeStatus.Done) {
      // see more in WXAddChatRoomMemberType
      if (/OK/i.test(result.message)) {
        return 0
      }
      log.warn('PadchatRpc', 'WXInviteChatRoomMember() status = 0 but message is not OK: ' + result.message)
      return -1
    }

    // TODO
    // Should check later
    if (result.status === -WXRoomAddTypeStatus.InviteConfirm) {
      // result: {"message":"","status":-2028}
      // May be the owner has see not allow other people to join in the room (群聊邀请确认)
      log.warn('PadchatRpc', 'WXInviteChatRoomMember failed! maybe owner open the should confirm first to invited others to join in the room.')
    }

    return result.status
  }

  public async WXSetChatroomName(roomId: string, topic: string): Promise<StandardType> {
    const result = await this.rpcCall('WXSetChatroomName', roomId, topic)
    log.silly('PadchatRpc', 'WXSetChatroomName result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXSetChatroomName error! canot get result from websocket server')
    }
    return result
  }

  public async WXQuitChatRoom(roomId: string): Promise<StandardType> {
    const result = await this.rpcCall('WXQuitChatRoom', roomId)
    log.silly('PadchatRpc', 'WXQuitChatRoom result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXQuitChatRoom error! canot get result from websocket server')
    }
    return result
  }

  public async WXAddUser(
    strangerV1 : string,
    strangerV2 : string,
    type       : WXSearchContactTypeStatus,
    verify     : string,
  ): Promise<any> {
    const result = await this.rpcCall(
      'WXAddUser',
      strangerV1,
      strangerV2,
      type,
      verify,
    )
    log.silly('PadchatRpc', 'WXAddUser result: %s', JSON.stringify(result))
    return result
  }

  public async WXAcceptUser(stranger: string, ticket: string): Promise<any> {
    const result = await this.rpcCall('WXAcceptUser', stranger, ticket)
    log.silly('PadchatRpc', 'WXAcceptUser result: %s', JSON.stringify(result))
    return result
  }

  public async WXLogout(): Promise<WXLogoutType> {
    const result = await this.rpcCall('WXLogout')
    log.silly('PadchatRpc', 'WXLogout result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXLogout error! canot get result from websocket server')
    }
    return result
  }

  // TODO: check any
  public async WXSendMoments(text: string): Promise<any> {
    const result = await this.rpcCall('WXSendMoments', text)
    log.silly('PadchatRpc', 'WXSendMoments result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXSendMoments error! canot get result from websocket server')
    }
    return result
  }

  // Sync Chat Message
  public async WXSyncMessage(): Promise<any> {
    const result = await this.rpcCall('WXSyncMessage')
    log.silly('PadchatRpc', 'WXSyncMessage result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXSyncMessage error! canot get result from websocket server')
    }
    return result
  }

  // This function is used for add new friends by id
  public async WXSearchContact(id: string): Promise<WXSearchContactType> {
    const result = await this.rpcCall('WXSearchContact', id)
    log.silly('PadchatRpc', 'WXSearchContact result: %s', JSON.stringify(result))

    if ((!result) && (result.status !== WXSearchContactTypeStatus.Searchable) && (result.status !== WXSearchContactTypeStatus.UnSearchable)) {
      throw Error('WXSearchContact error! canot get result from websocket server')
    }

    if (result.status === WXSearchContactTypeStatus.Searchable) {
      log.info('PadchatRpc', 'WXSearchContact wxid: %s can be searched', id)
    }

    if (result.status === WXSearchContactTypeStatus.UnSearchable) {
      log.info('PadchatRpc', 'WXSearchContact wxid: %s cannot be searched', id)
    }
    return result
  }

  // TODO: check any
  // send hello to strange
  public async WXSayHello(stranger: string, text: string): Promise<any> {
    const result = await this.rpcCall('WXSayHello', stranger, text)
    log.silly('PadchatRpc', 'WXSayHello , stranger,result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXSayHello , stranger,error! canot get result from websocket server')
    }
    return result
  }

  // TODO: check any
  // delete friend
  public async WXDeleteUser(id: string): Promise<any> {
    const result = await this.rpcCall('WXDeleteUser', id)
    log.silly('PadchatRpc', 'WXDeleteUser , stranger,result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXDeleteUser , stranger,error! canot get result from websocket server')
    }
    return result
  }

  public async WXCreateChatRoom(userList: string[]): Promise<string> {
    const result = await this.rpcCall('WXCreateChatRoom', JSON.stringify(userList))
    log.silly('PadchatRpc', 'WXCreateChatRoom(userList.length=%d) = "%s"', userList.length, JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXCreateChatRoom , stranger,error! canot get result from websocket server')
    }
    return stripBugChatroomId(result.user_name)
  }

  // TODO: check any
  // TODO: receive red-packet automatically
  // red_packet: see this from the recived message
  public async WXReceiveRedPacket(redPacket: string): Promise<any> {
    const result = await this.rpcCall('WXReceiveRedPacket', redPacket)
    log.silly('PadchatRpc', 'WXReceiveRedPacket , stranger,result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXReceiveRedPacket , stranger,error! canot get result from websocket server')
    }
    return result
  }

  // TODO: check any
  // TODO: 查看红包
  public async WXQueryRedPacket(redPacket: string): Promise<any> {
    const result = await this.rpcCall('WXQueryRedPacket', redPacket)
    log.silly('PadchatRpc', 'WXQueryRedPacket , stranger,result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXQueryRedPacket , stranger,error! canot get result from websocket server')
    }
    return result
  }

  // TODO: check any
  // TODO: 打开红包
  public async WXOpenRedPacket(redPacket: string): Promise<any> {
    const result = await this.rpcCall('WXOpenRedPacket', redPacket)
    log.silly('PadchatRpc', 'WXOpenRedPacket , stranger,result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXOpenRedPacket , stranger,error! canot get result from websocket server')
    }
    return result
  }

  // TODO: check any
  // set user avatar, param image is the same as send [WXSendImage]
  public async WXSetHeadImage(image: string): Promise<any> {
    const result = await this.rpcCall('WXOpenRedPacket', image)
    log.silly('PadchatRpc', 'WXOpenRedPacket , stranger,result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXOpenRedPacket , stranger,error! canot get result from websocket server')
    }
    return result
  }

  // TODO: check any
  // nick_name	昵称
  // signature	签名
  // sex			性别，1男，2女
  // country		国家，CN
  // provincia	地区，省，Zhejiang
  // city			城市，Hangzhou
  public async WXSetUserInfo(nickeName: string, signature: string, sex: string, country: string, provincia: string, city: string): Promise<any> {
    const result = await this.rpcCall('WXSetUserInfo', nickeName, signature, sex, country, provincia, city)
    log.silly('PadchatRpc', 'WXSetUserInfo , stranger,result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXSetUserInfo , stranger,error! canot get result from websocket server')
    }
    return result
  }

  // TODO: check any
  // 查看附近的人
  // longitude	浮点数，经度
  // latitude		浮点数，维度
  public async WXGetPeopleNearby(longitude: string, latitude: string): Promise<any> {
    const result = await this.rpcCall('WXGetPeopleNearby', longitude, latitude)
    log.silly('PadchatRpc', 'WXGetPeopleNearby , stranger,result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXGetPeopleNearby , stranger,error! canot get result from websocket server')
    }
    return result
  }

  // TODO: check any
  // 获取公众号信息 id: gh_xxxx
  public async WXGetSubscriptionInfo(id: string): Promise<any> {
    const result = await this.rpcCall('WXGetSubscriptionInfo', id)
    log.silly('PadchatRpc', 'WXGetSubscriptionInfo , stranger,result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXGetSubscriptionInfo , stranger,error! canot get result from websocket server')
    }
    return result
  }

  // TODO: check any
  // 执行公众号菜单操作
  // id			      公众号用户名
  // OrderId			菜单id，通过WXGetSubscriptionInfo获取, 原来叫id
  // OrderKey			菜单key，通过WXGetSubscriptionInfo获取, 原来叫key
  public async WXSubscriptionCommand(id: string, orderId: string, orderKey: string): Promise<any> {
    const result = await this.rpcCall('WXSubscriptionCommand', id, orderId, orderKey)
    log.silly('PadchatRpc', 'WXSubscriptionCommand , stranger,result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXSubscriptionCommand , stranger,error! canot get result from websocket server')
    }
    return result
  }

  // TODO check any
  // 公众号中获取url访问token, 给下面的函数使用[WXRequestUrl]
  // user			公众号用户名
  // url			访问的链接
  public async WXGetRequestToken(id: string, url: string): Promise<any> {
    const result = await this.rpcCall('WXGetRequestToken', id, url)
    log.silly('PadchatRpc', 'WXGetRequestToken , stranger,result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXGetRequestToken , stranger,error! canot get result from websocket server')
    }
    return result
  }

  // TODO check any
  // 公众号中访问url
  // url			url地址
  // key			token中的key
  // uin		  token中的uin
  public async WXRequestUrl(url: string, key: string, uin: string): Promise<any> {
    const result = await this.rpcCall('WXRequestUrl', url, key, uin)
    log.silly('PadchatRpc', 'WXRequestUrl , stranger,result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXRequestUrl , stranger,error! canot get result from websocket server')
    }
    return result
  }

  // TODO check any
  // 设置微信ID
  public async WXSetWeChatID(id: string): Promise<any> {
    const result = await this.rpcCall('WXSetWeChatID', id)
    log.silly('PadchatRpc', 'WXSetWeChatID , stranger,result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXSetWeChatID , stranger,error! canot get result from websocket server')
    }
    return result
  }

  // TODO check any
  // 查看转账信息
  // transfer		转账消息
  public async WXTransferQuery(transfer: string): Promise<any> {
    const result = await this.rpcCall('WXTransferQuery', transfer)
    log.silly('PadchatRpc', 'WXTransferQuery , stranger,result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXTransferQuery , stranger,error! canot get result from websocket server')
    }
    return result
  }

  // TODO check any
  // 接受转账
  // transfer		转账消息
  public async WXTransferOperation(transfer: string): Promise<any> {
    const result = await this.rpcCall('WXTransferOperation', transfer)
    log.silly('PadchatRpc', 'WXTransferOperation , stranger,result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXTransferOperation , stranger,error! canot get result from websocket server')
    }
    return result
  }

  // TODO: check if this WXGetMsgEmoticon exist in protocol, Huan LI 201806
  public async WXGetMsgEmoticon(msg: string): Promise<any> {
    const result = await this.rpcCall('WXGetMsgEmoticon', msg)
    log.silly('PadchatRpc', 'WXGetMsgEmoticon(), result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXGetMsgEmoticon error! canot get result from websocket server')
    }
    return result
  }

  // TODO check any
  // 获取消息图片 （应该是查看原图）
  // msg			收到的整个图片消息
  public async WXGetMsgImage(msg: string): Promise<any> {
    const result = await this.rpcCall('WXGetMsgImage', msg)
    log.silly('PadchatRpc', 'WXGetMsgImage , stranger,result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXGetMsgImage , stranger,error! canot get result from websocket server')
    }
    return result
  }

  // TODO check any
  // 获取消息视频 （应该是查看视频）
  // msg			收到的整个视频消息
  public async WXGetMsgVideo(msg: string): Promise<any> {
    const result = await this.rpcCall('WXGetMsgVideo', msg)
    log.silly('PadchatRpc', 'WXGetMsgVideo , stranger,result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXGetMsgVideo , stranger,error! canot get result from websocket server')
    }
    return result
  }

  // TODO check any
  // 获取消息语音(语音消息大于20秒时通过该接口获取)
  // msg			收到的整个视频消息
  public async WXGetMsgVoice(msg: string): Promise<any> {
    const result = await this.rpcCall('WXGetMsgVoice', msg)
    log.silly('PadchatRpc', 'WXGetMsgVoice , stranger,result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXGetMsgVoice , stranger,error! canot get result from websocket server')
    }
    return result
  }

  // TODO check any
  // 搜索公众号
  // id			公众号用户名: gh_xxx
  public async WXWebSearch(id: string): Promise<any> {
    const result = await this.rpcCall('WXWebSearch', id)
    log.silly('PadchatRpc', 'WXWebSearch , stranger,result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXWebSearch , stranger,error! canot get result from websocket server')
    }
    return result
  }

  // TODO check any
  // 分享名片
  // user			对方用户名
  // id			    名片的微信id
  // caption		名片的标题
  public async WXShareCard(user: string, id: string, caption: string): Promise<any> {
    const result = await this.rpcCall('WXShareCard', user, id, caption)
    log.silly('PadchatRpc', 'WXShareCard , stranger,result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXShareCard , stranger,error! canot get result from websocket server')
    }
    return result
  }

  // TODO check any
  // 重置同步信息
  public async WXSyncReset(): Promise<any> {
    const result = await this.rpcCall('WXSyncReset')
    log.silly('PadchatRpc', 'WXSyncReset , stranger,result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXSyncReset , stranger,error! canot get result from websocket server')
    }
    return result
  }

  // TODO check any
  // 扫描二维码获取信息
  // path			本地二维码图片全路径
  public async WXQRCodeDecode(path: string): Promise<any> {
    const result = await this.rpcCall('WXQRCodeDecode', path)
    log.silly('PadchatRpc', 'WXQRCodeDecode , stranger,result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXQRCodeDecode , stranger,error! canot get result from websocket server')
    }
    return result
  }

  // TODO check any
  // 朋友圈上传图片获取url
  // image			图片数据, 和发送消息的image 是一样的base64 串
  public async WXSnsUpload(image: string): Promise<any> {
    const result = await this.rpcCall('WXSnsUpload', image)
    log.silly('PadchatRpc', 'WXSnsUpload , stranger,result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXSnsUpload , stranger,error! canot get result from websocket server')
    }
    return result
  }

  // TODO check any
  // 获取朋友圈消息详情(例如评论)
  // id			朋友圈消息id
  public async WXSnsObjectDetail(id: string): Promise<any> {
    const result = await this.rpcCall('WXSnsObjectDetail', id)
    log.silly('PadchatRpc', 'WXSnsObjectDetail , stranger,result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXSnsObjectDetail , stranger,error! canot get result from websocket server')
    }
    return result
  }

  // TODO check any
  // 朋友圈操作(删除朋友圈，删除评论，取消赞)
  // id			       朋友圈消息id
  // type			     操作类型,1为删除朋友圈，4为删除评论，5为取消赞
  // comment		   当type为4时，对应删除评论的id，通过WXSnsObjectDetail接口获取。当type为其他值时，comment不可用，置为0。
  // commentType	 评论类型,当删除评论时可用，2或者3.(规律未知)
  public async WXSnsObjectOp(id: string, type: string, comment: string, commentType: string): Promise<any> {
    const result = await this.rpcCall('WXSnsObjectOp', id, type, comment, commentType)
    log.silly('PadchatRpc', 'WXSnsObjectOp , stranger,result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXSnsObjectOp , stranger,error! canot get result from websocket server')
    }
    return result
  }

  // TODO check any
  // 朋友圈消息评论
  // user			  对方用户名
  // id			    朋友圈消息id
  // content		评论内容
  // replyId		回复的id    //如果想回复某人的评论，就加上他的comment_id  否则就用0
  public async WXSnsComment(user: string, id: string, content: string, replyId: string): Promise<any> {
    const result = await this.rpcCall('WXSnsComment', user, id, content, replyId)
    log.silly('PadchatRpc', 'WXSnsComment , stranger,result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXSnsComment , stranger,error! canot get result from websocket server')
    }
    return result
  }

  // TODO check any
  // 获取好友朋友圈信息
  // user			对方用户名
  // id			    获取到的最后一次的id，第一次调用设置为空
  public async WXSnsUserPage(user: string, id: string): Promise<any> {
    const result = await this.rpcCall('WXSnsUserPage', user, id)
    log.silly('PadchatRpc', 'WXSnsUserPage , stranger,result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXSnsUserPage , stranger,error! canot get result from websocket server')
    }
    return result
  }

  // TODO check any
  // 获取朋友圈动态
  // id			    获取到的最后一次的id，第一次调用设置为空
  public async WXSnsTimeline(id: string): Promise<any> {
    const result = await this.rpcCall('WXSnsTimeline', id)
    log.silly('PadchatRpc', 'WXSnsTimeline , stranger,result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXSnsTimeline , stranger,error! canot get result from websocket server')
    }
    return result
  }

  // TODO check any
  // 发送APP消息(分享应用或者朋友圈链接等)
  // user			对方用户名
  // content		消息内容(整个消息结构<appmsg xxxxxxxxx>) 参考收到的MsgType
  public async WXSendAppMsg(user: string, content: string): Promise<any> {
    const result = await this.rpcCall('WXSendAppMsg', user, content)
    log.silly('PadchatRpc', 'WXSendAppMsg , stranger,result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXSendAppMsg , stranger,error! canot get result from websocket server')
    }
    return result
  }

  // TODO check any
  // 同步收藏消息(用户获取收藏对象的id)
  // key			同步的key，第一次调用设置为空。
  public async WXFavSync(key: string): Promise<any> {
    const result = await this.rpcCall('WXFavSync', key)
    log.silly('PadchatRpc', 'WXFavSync , stranger,result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXFavSync , stranger,error! canot get result from websocket server')
    }
    return result
  }

  // TODO check any
  // 添加收藏
  // fav_object	收藏对象结构(<favitem type=5xxxxxx)
  public async WXFavAddItem(favObject: string): Promise<any> {
    const result = await this.rpcCall('WXFavAddItem', favObject)
    log.silly('PadchatRpc', 'WXFavAddItem , stranger,result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXFavAddItem , stranger,error! canot get result from websocket server')
    }
    return result
  }

  // TODO check any
  // 获取收藏对象的详细信息
  // id			收藏对象id
  public async WXFavGetItem(id: string): Promise<any> {
    const result = await this.rpcCall('WXFavGetItem', id)
    log.silly('PadchatRpc', 'WXFavGetItem , stranger,result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXFavGetItem , stranger,error! canot get result from websocket server')
    }
    return result
  }

  // TODO check any
  // 删除收藏对象
  // id			收藏对象id
  public async WXFavDeleteItem(id: string): Promise<any> {
    const result = await this.rpcCall('WXFavDeleteItem', id)
    log.silly('PadchatRpc', 'WXFavDeleteItem , stranger,result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXFavDeleteItem , stranger,error! canot get result from websocket server')
    }
    return result
  }

  // TODO check any
  // 获取所有标签列表
  public async WXGetContactLabelList(): Promise<any> {
    const result = await this.rpcCall('WXGetContactLabelList')
    log.silly('PadchatRpc', 'WXGetContactLabelList , stranger,result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXGetContactLabelList , stranger,error! canot get result from websocket server')
    }
    return result
  }

  // TODO check any
  // 添加标签到列表
  // label			标签内容
  public async WXAddContactLabel(label: string): Promise<any> {
    const result = await this.rpcCall('WXAddContactLabel', label)
    log.silly('PadchatRpc', 'WXAddContactLabel , stranger,result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXAddContactLabel , stranger,error! canot get result from websocket server')
    }
    return result
  }

  // TODO check any
  // 从列表删除标签
  // id			标签id
  public async WXDeleteContactLabel(id: string): Promise<any> {
    const result = await this.rpcCall('WXDeleteContactLabel', id)
    log.silly('PadchatRpc', 'WXDeleteContactLabel , stranger,result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXDeleteContactLabel , stranger,error! canot get result from websocket server')
    }
    return result
  }

  // TODO check any
  // 从列表删除标签
  // user			用户名
  // id			    标签id
  public async WXSetContactLabel(user: string, id: string): Promise<any> {
    const result = await this.rpcCall('WXSetContactLabel', user, id)
    log.silly('PadchatRpc', 'WXSetContactLabel , stranger,result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXSetContactLabel , stranger,error! canot get result from websocket server')
    }
    return result
  }

  // TODO check any
  // 获取用户二维码(自己或者已加入的群)
  // user			用户名
  // style			是否使用风格化二维码
  public async WXGetUserQRCode(user: string, style: number): Promise<string> {
    const result = await this.rpcCall('WXGetUserQRCode', user, style)
    log.silly('PadchatRpc', 'WXGetUserQRCode , stranger,result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXGetUserQRCode, error: canot get result from websocket server')
    }
    console.log('WXGetUserQRCode result:', result)
    return result.data
  }

  // TODO check any
  // AppMsg上传数据
  // data			和发送图片的data 类似
  public async WXUploadAppAttach(data: string): Promise<any> {
    const result = await this.rpcCall('WXUploadAppAttach', data)
    log.silly('PadchatRpc', 'WXUploadAppAttach , stranger,result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXUploadAppAttach , stranger,error! canot get result from websocket server')
    }
    return result
  }

  // TODO check any
  // 发送语音消息(微信silk格式语音)
  // user			对方用户名
  // voice_data	语音数据
  // voice_size	语音大小 (应该不需要)
  // voice_time	语音时间(毫秒，最大60 * 1000)
  public async WXSendVoice(user: string, data: string, time: number): Promise<any> {
    const result = await this.rpcCall('WXSendVoice', user, data, String(time))
    log.silly('PadchatRpc', 'WXSendVoice , stranger,result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXSendVoice , stranger,error! canot get result from websocket server')
    }
    return result
  }

  // TODO check any
  // 同步朋友圈动态(好友评论或点赞自己朋友圈的消息)
  // key		同步key
  public async WXSnsSync(key: string): Promise<any> {
    const result = await this.rpcCall('WXSnsSync', key)
    log.silly('PadchatRpc', 'WXSnsSync , stranger,result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXSnsSync , stranger,error! canot get result from websocket server')
    }
    return result
  }

  // TODO check any
  // 群发消息
  // user			用户名json数组 ["AB1","AC2","AD3"]
  // content		消息内容
  public async WXMassMessage(userList: string[], content: string): Promise<any> {
    const result = await this.rpcCall('WXMassMessage', JSON.stringify(userList), content)
    log.silly('PadchatRpc', 'WXMassMessage , stranger,result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXMassMessage , stranger,error! canot get result from websocket server')
    }
    return result
  }

  // TODO check any
  // 设置群公告
  // chatroom	群id
  // content	    内容
  public async WXSetChatroomAnnouncement(chatroom: string, content: string): Promise<any> {
    const result = await this.rpcCall('WXSetChatroomAnnouncement', chatroom, content)
    log.silly('PadchatRpc', 'WXSetChatroomAnnouncement , stranger,result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXSetChatroomAnnouncement , stranger,error! canot get result from websocket server')
    }
    console.log('WXSetChatroomAnnouncement result:', result)
    return result
  }

  // FIXME: does Get exist?
  // FIXME2: what's the structure of result? result.data???
  public async WXGetChatroomAnnouncement(chatroom: string): Promise<string> {
    const result = await this.rpcCall('WXGetChatroomAnnouncement', chatroom)
    log.silly('PadchatRpc', 'WXGetChatroomAnnouncement ,result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXGetChatroomAnnouncement , error! canot get result from websocket server')
    }
    return result.data
  }

}
