import { EventEmitter } from 'events'

// import cuid        from 'cuid'
import WebSocket   from 'ws'

import {
  Peer,
  // JsonRpcPayload,
  JsonRpcPayloadRequest,
  // JsonRpcPayloadNotification,
  JsonRpcPayloadResponse,
  // JsonRpcPayloadError,
  // JsonRpcParamsSchemaByName,
  JsonRpcParamsSchemaByPositional,
}                                   from 'json-rpc-peer'

// import { MemoryCard }   from 'memory-card'

import {
  // PadchatContinue,
  // PadchatMsgType,
  // PadchatStatus,

  PadchatPayload,
  PadchatPayloadType,

  // PadchatContactMsgType,
  PadchatContactPayload,

  PadchatMessagePayload,

  PadchatRoomMember,
  PadchatRoomMemberPayload,
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
  WXCheckQRCodeStatus,
  StandardType,
  WXAddChatRoomMemberType,
}                             from './padchat-rpc.type'

import {
  PadchatPureFunctionHelper as pfHelper,
}                                           from './pure-function-helper'

import { log }          from '../config'

// const AUTO_DATA_SLOT = 'autoData'

export class PadchatRpc extends EventEmitter {
  private socket?          : WebSocket
  private readonly jsonRpc : Peer

  // private readonly rpcPromiseWaittingDict: PadChatRpcPromiseDict

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
    await this.initJsonRpcPeer()

    await this.init()
    await this.WXInitialize()
  }

  protected async initJsonRpcPeer(): Promise<void> {
    if (!this.socket) {
      throw new Error('socket had not been opened yet!')
    }

    this.jsonRpc.on('data', (payload: JsonRpcPayloadRequest) => {
      if (!this.socket) {
        throw new Error('no web socket')
      }

      console.log('jsonRpc.on(data) = ', payload.type, ', ', typeof payload, ': ', payload)

      const encodedParam = (payload.params as JsonRpcParamsSchemaByPositional).map(encodeURIComponent)

      const message: PadchatRpcRequest = {
        userId:   this.token,
        msgId:    payload.id as string,
        apiName:  payload.method,
        param:    encodedParam,
      }

      this.socket.send(JSON.stringify(message))
    })
  }

  protected async initWebSocket(): Promise<void> {
    if (this.socket) {
      throw new Error('socket had already been opened!')
    }

    const ws = new WebSocket(
      this.endpoint,
      { perMessageDeflate: true },
    )

    this.socket = ws

    ws.on('message', (data: string) => {
      try {
        const payload: PadchatPayload = JSON.parse(data)
        this.onServer(payload)
      } catch (e) {
        log.warn('PuppetPadchatBridge', 'startJsonRpc() ws.on(message) exception: %s', e)
        this.emit('error', e)
      }
    })

    ws.on('error', err => this.emit('error', err))

    // TODO: add reconnect logic here when disconnected, or throw Error

    await new Promise((resolve, reject) => {
      ws.once('open', resolve)

      ws.once('error', reject)
      ws.once('close', reject)
    })
  }

  public stop(): void {
    log.verbose('PadchatRpc', 'stop()')

    if (!this.socket) {
      throw new Error('socket not exist')
    }

    this.jsonRpc.removeAllListeners()
    this.jsonRpc.end()

    this.socket.removeAllListeners()
    this.socket.close()

    this.socket = undefined
  }

  private async rpcCall(
    apiName   : string,
    ...params : string[]
  ): Promise<any> {

    return await this.jsonRpc.request(apiName, params)

    // if (!this.socket) {
    //   throw new Error('no web socket')
    // }

    // const msgId            = cuid()
    // const paramEncodedList = params.map(
    //   arg => encodeURIComponent(arg),
    // )

    // const request: PadchatRpcRequest = {
    //   userId: this.token,
    //   msgId,
    //   apiName,
    //   param: paramEncodedList,
    // }

    // const payload = JSON.stringify(request)
    // log.silly('PadchatRpc', 'sendToWebSocket: %s', payload)

    // this.socket.send(payload)

    // return new Promise((resolve, reject) => {

    //   const timer = setTimeout(() => {
    //     delete this.rpcPromiseWaittingDict[msgId]
    //     reject('PadChat Server timeout for msgId: ' + msgId + ', apiName: ' + apiName + ', args: ' + params.join(', '))
    //     // TODO: send json again or detect init()
    //   }, 30000)

    //   this.rpcPromiseWaittingDict[msgId] = {
    //     resolver: (...args: any[]) => {
    //       delete this.rpcPromiseWaittingDict[msgId]
    //       clearTimeout(timer)
    //       resolve(...args)
    //     },
    //     reject: (...args: any[]) => {
    //       delete this.rpcPromiseWaittingDict[msgId]
    //       clearTimeout(timer)
    //       reject(...args)
    //     },
    //   }

    // })
  }
  protected onServer(payload: PadchatPayload) {
    console.log('server payload:', payload)

    log.verbose('PuppetPadchatBridge', 'onWebSocket(%s)',
                                        JSON.stringify(payload).substr(0, 140),
                )

    // check logout:
    if (payload.type === PadchatPayloadType.Logout) {
      // this.emit('logout', this.selfId())
      console.log('payload logout: ', payload)
      this.emit('logout')
      return
    }

    if (!payload.msgId && !payload.data) {
      log.warn('PadchatRpc', 'onServerPayload() discard payload without `msgId` and `data`')
      return
    }

    if (payload.msgId) {
      // Data Return From WebSocket Client
      this.onServerPadchat(payload)
    } else {
      // Data From Tencent
      const tencentPayloadList: PadchatMessagePayload[] = JSON.parse(decodeURIComponent(payload.data))
      this.onServerTencent(tencentPayloadList)
    }
  }

  protected onServerTencent(messagePayloadList: PadchatMessagePayload[]) {
    console.log('tencent messagePayloadList:', messagePayloadList)
    // if (   payload.continue  === PadchatContinue.Done
    //     && payload.msg_type  === PadchatMsgType.N15_32768
    //     && payload.status    === PadchatStatus.One
    // ) {
    //   // Skip empty message. "continue":0,"msg_type":32768,"status":1,"
    //   return
    // }

    // rawWebSocketData:
    // {
    //   "apiName": "",
    //   "data": "XXXX",
    //   "msgId": "",
    //   "userId": "test"
    // }

    // if (!payload.data) {
    //   console.error('data: no payload.data')
    //   return
    // }
    // const messagePayloadList: PadchatMessagePayload[] = JSON.parse(decodeURIComponent(payload.data))

    messagePayloadList.forEach(messagePayload => {
      if (!messagePayload.msg_id) {
        // {"continue":0,"msg_type":32768,"status":1,"uin":1928023446}
        log.silly('PuppetPadchatBridge', 'WebSocket Server: get empty message msg_id form Tencent server for payoad: %s',
                                    JSON.stringify(messagePayload),
                  )
        return
      }
      log.silly('PuppetPadchatBridge', 'WebSocket Server rawData result: %s', JSON.stringify(messagePayload))

      this.emit('message', messagePayload)
    })
  }

  protected onServerPadchat(payload: PadchatPayload) {
    console.log('onServerMessagePadChat:', payload)

    // check logout:
    if (payload.type === PadchatPayloadType.Logout) {
      // this.emit('logout', this.selfId())
      this.emit('logout')
    }

    log.silly('PuppetPadchatBridge', 'return apiName: %s, msgId: %s', payload.apiName, payload.msgId)

    let result: any

    if (payload.data) {
      result = JSON.parse(decodeURIComponent(payload.data))
    } else {
      log.silly('PuppetPadchatBridge', 'onServerMessagePadchat() discard empty payload.data for apiName: %s', payload.apiName)
      result = {}
    }

    const jsonRpcResponse: JsonRpcPayloadResponse = {
      id: payload.msgId,
      jsonrpc: '2.0',
      result: result,
      type: 'response',
    }

    this.jsonRpc.write(jsonRpcResponse)

    // rawWebSocketData:
    // {
    //     "apiName": "WXHeartBeat",
    //     "data": "%7B%22status%22%3A0%2C%22message%22%3A%22ok%22%7D",
    //     "msgId": "abc231923912983",
    //     "userId": "test"
    // }

    // if (resolverDict[msgId]) {
    //   const resolve = resolverDict[msgId]
    //   delete resolverDict[msgId]
    //   // resolve({rawData: rawData, msgId: rawWebSocketData.msgId})
    //   resolve(rawData)
    // } else {
    //   log.warn('PuppetPadchatBridge', 'wsOnMessage() msgId %s not in resolverDict', msgId)
    // }
  }

  /**
   * Init with WebSocket Server
   */
  public async init(): Promise<InitType> {
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
  public async WXInitialize(): Promise<WXInitializeType> {
    const result = await this.rpcCall('WXInitialize')
    log.silly('PadchatRpc', 'WXInitialize result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('cannot connect to WebSocket WXInitialize')
    }
    return result
  }

  public async WXGetQRCode(): Promise<WXGetQRCodeType> {
    let result = await this.rpcCall('WXGetQRCode')
    if (!result || !(result.qr_code)) {
      result = await this.WXGetQRCodeTwice()
    }

    return result
  }

  private async WXGetQRCodeTwice(): Promise<WXGetQRCodeType> {
    await this.WXInitialize()
    const resultTwice = await this.rpcCall('WXGetQRCode')
    if (!resultTwice || !(resultTwice.qr_code)) {
      throw Error('WXGetQRCodeTwice error! canot get result from websocket server when calling WXGetQRCode after WXInitialize')
    }
    return resultTwice
  }

  public async WXCheckQRCode(): Promise<WXCheckQRCodePayload> {
    // this.checkQrcode()
    const result = await this.rpcCall('WXCheckQRCode')
    log.silly('PadchatRpc', 'WXCheckQRCode result: %s', JSON.stringify(result))
    if (!result) {
      throw Error('cannot connect to WebSocket WXCheckQRCode')
    }
    return result
  }

  public async WXHeartBeat(data: string): Promise<WXHeartBeatType> {
    const result = await this.rpcCall('WXHeartBeat', data)
    log.silly('PadchatRpc', 'WXHeartBeat result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXHeartBeat error! canot get result from websocket server')
    }
    return result
  }

  /**
   * Load all Contact and Room
   * see issue https://github.com/lijiarui/test-ipad-puppet/issues/39
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
   */
  public async WXGenerateWxDat(): Promise<WXGenerateWxDatType> {
    const result = await this.rpcCall('WXGenerateWxDat')
    log.silly('PadchatRpc', 'WXGenerateWxDat result: %s', JSON.stringify(result))
    if (!result || !(result.data) || result.status !== 0) {
      throw Error('WXGenerateWxDat error! canot get result from websocket server')
    }
    // this.autoData.wxData = result.data
    return result
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

  public async WXGetLoginToken(): Promise<WXGetLoginTokenType> {
    const result = await this.rpcCall('WXGetLoginToken')
    log.silly('PadchatRpc', 'WXGetLoginToken result: %s', JSON.stringify(result))
    if (!result || !result.token || result.status !== 0) {
      throw Error('WXGetLoginToken error! canot get result from websocket server')
    }
    // this.autoData.token = result.token

    return result
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
    // TODO: should show result here
    const result = await this.rpcCall('WXLoginRequest', token)
    log.silly('PadchatRpc', 'WXLoginRequest result: %s, type: %s', JSON.stringify(result), typeof result)
    if (!result || result.status !== 0) {
      await this.WXGetQRCode()
      return
    } else {
      // check qrcode status
      log.silly('PadchatRpc', 'WXLoginRequest begin to check whether user has clicked confirm login')
      this.checkQrcode()
    }
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
  public WXSendImage(to: string, data: string): void {
    this.rpcCall('WXSendImage', to, data)
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
      log.warn('PadchatRpc', 'WXGetContact cannot get user_name, id: %s', id)
    }
    return result
  }

  /**
   * Get contact by contact id
   * @param {any} id        user_name
   */
  public async WXGetContactPayload(id: string): Promise<PadchatContactPayload> {
    if (!pfHelper.isContactId(id)) { // /@chatroom$/.test(id)) {
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
    if (!pfHelper.isRoomId(id)) { // (/@chatroom$/.test(id))) {
      throw Error(`should use WXGetContactPayload because get a contact id :${id}`)
    }
    const result = await this.WXGetContact(id)

    if (result.member) {
      result.member = JSON.parse(decodeURIComponent(result.member))
    }

    return result
  }

  /**
   * Get room member by contact id
   * @param {any} id        chatroom_id
   */
  public async WXGetChatRoomMember(id: string): Promise<PadchatRoomMemberPayload> {
    const result = await this.rpcCall('WXGetChatRoomMember', id)
    if (!result) {
      throw Error('PadchatRpc, WXGetChatRoomMember, cannot get result from websocket server!')
    }

    log.silly('PadchatRpc', 'WXGetChatRoomMember() result: %s', JSON.stringify(result))

    if (!result.user_name || !result.member) {
      log.warn('PadchatRpc', 'WXGetChatRoomMember cannot get user_name or member! user_name: %s, member: %s', id, result.member)
    }

    // tslint:disable-next-line:max-line-length
    // change '[{"big_head":"http://wx.qlogo.cn/mmhead/ver_1/DpS0ZssJ5s8tEpSr9JuPTRxEUrCK0USrZcR3PjOMfUKDwpnZLxWXlD4Q38bJpcXBtwXWwevsul1lJqwsQzwItQ/0","chatroom_nick_name":"","invited_by":"wxid_7708837087612","nick_name":"李佳芮","small_head":"http://wx.qlogo.cn/mmhead/ver_1/DpS0ZssJ5s8tEpSr9JuPTRxEUrCK0USrZcR3PjOMfUKDwpnZLxWXlD4Q38bJpcXBtwXWwevsul1lJqwsQzwItQ/132","user_name":"qq512436430"},{"big_head":"http://wx.qlogo.cn/mmhead/ver_1/kcBj3gSibfFd2I9vQ8PBFyQ77cpPIfqkFlpTdkFZzBicMT6P567yj9IO6xG68WsibhqdPuG82tjXsveFATSDiaXRjw/0","chatroom_nick_name":"","invited_by":"wxid_7708837087612","nick_name":"梦君君","small_head":"http://wx.qlogo.cn/mmhead/ver_1/kcBj3gSibfFd2I9vQ8PBFyQ77cpPIfqkFlpTdkFZzBicMT6P567yj9IO6xG68WsibhqdPuG82tjXsveFATSDiaXRjw/132","user_name":"mengjunjun001"},{"big_head":"http://wx.qlogo.cn/mmhead/ver_1/3CsKibSktDV05eReoAicV0P8yfmuHSowfXAMvRuU7HEy8wMcQ2eibcaO1ccS95PskZchEWqZibeiap6Gpb9zqJB1WmNc6EdD6nzQiblSx7dC1eGtA/0","chatroom_nick_name":"","invited_by":"wxid_7708837087612","nick_name":"苏轼","small_head":"http://wx.qlogo.cn/mmhead/ver_1/3CsKibSktDV05eReoAicV0P8yfmuHSowfXAMvRuU7HEy8wMcQ2eibcaO1ccS95PskZchEWqZibeiap6Gpb9zqJB1WmNc6EdD6nzQiblSx7dC1eGtA/132","user_name":"wxid_zj2cahpwzgie12"},{"big_head":"http://wx.qlogo.cn/mmhead/ver_1/piaHuicak41b6ibmcEVxoWKnnhgGDG5EbaD0hibwkrRvKeDs3gs7XQrkym3Q5MlUeSKY8vw2FRVVstialggUxf2zic2O8CvaEsicSJcghf41nibA940/0","chatroom_nick_name":"","invited_by":"wxid_zj2cahpwzgie12","nick_name":"王宁","small_head":"http://wx.qlogo.cn/mmhead/ver_1/piaHuicak41b6ibmcEVxoWKnnhgGDG5EbaD0hibwkrRvKeDs3gs7XQrkym3Q5MlUeSKY8vw2FRVVstialggUxf2zic2O8CvaEsicSJcghf41nibA940/132","user_name":"wxid_7708837087612"}]'
    // to Array (PadchatRoomRawMember[])
    if (!Array.isArray(JSON.parse(decodeURIComponent(result.member)))) {
      log.error('PadchatRpc', 'WXGetChatRoomMember member: %s', result.member)
      throw Error('faild to parse chatroom member!')
    }
    result.member = JSON.parse(decodeURIComponent(result.member)) as PadchatRoomMember[]

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
      log.info('PadchatRpc', 'WXQRCodeLogin, login successfully!')
      // this.username = result.user_name
      // this.nickname = result.nick_name
      // this.loginSucceed = true
      return result
    }

    if (result.status === -3) {
      throw Error('PadchatRpc, WXQRCodeLogin, wrong user_name or password')
    } else if (result.status === -301) {
      log.warn('PadchatRpc', 'WXQRCodeLogin, redirect 301')
      return this.WXQRCodeLogin(username, password)
      // if (!this.username || !this.password) {
      //   throw Error('PadchatRpc, WXQRCodeLogin, redirect 301 and cannot get username or password here, return!')
      // }
      // this.WXQRCodeLogin(this.username, this.password)
    }
    throw Error('PadchatRpc, WXQRCodeLogin, unknown status: ' + result.status)
  }

  public async checkQrcode(): Promise<void> {
    log.verbose('PadchatRpc', 'checkQrcode')
    const result = await this.WXCheckQRCode()

    if (result && result.status === WXCheckQRCodeStatus.WaitScan) {
      log.verbose('PadchatRpc', 'checkQrcode: Please scan the Qrcode!')

      setTimeout(() => {
        this.checkQrcode()
      }, 1000)

      return
    }

    if (result && result.status === WXCheckQRCodeStatus.WaitConfirm) {
      log.info('PadchatRpc', 'checkQrcode: Had scan the Qrcode, but not Login!')

      setTimeout(() => {
        this.checkQrcode()
      }, 1000)

      return
    }

    if (result && result.status === WXCheckQRCodeStatus.Confirmed) {
      log.info('PadchatRpc', 'checkQrcode: Trying to login... please wait')

      if (!result.user_name || !result.password) {
        throw Error('PadchatRpc, checkQrcode, cannot get username or password here, return!')
      }

      // this.username = result.user_name
      // this.nickname = result.nick_name
      // this.password = result.password

      // this.WXQRCodeLogin(this.username, this.password)
      return
    }

    if (result && result.status === WXCheckQRCodeStatus.Timeout) {
      log.info('PadchatRpc', 'checkQrcode: Timeout')
      return
    }

    if (result && result.status === WXCheckQRCodeStatus.Cancel) {
      log.info('PadchatRpc', 'checkQrcode: Cancel by user')
      return
    }

    log.warn('PadchatRpc', 'checkQrcode: not know the reason, return data: %s', JSON.stringify(result))
    return
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

    if (result.status === 0) {
      // see more in WXAddChatRoomMemberType
      if (/OK/i.test(result.message)) {
        return 0
      }
      log.warn('PadchatRpc', 'WXAddChatRoomMember() status = 0 but message is not OK: ' + result.message)
      return -1
    }

    if (result.status === -2028) {
      // result: {"message":"","status":-2028}
      // May be the owner has see not allow other people to join in the room (群聊邀请确认)
      log.warn('PadchatRpc', 'WXAddChatRoomMember failed! maybe owner open the should confirm first to invited others to join in the room.')
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

  // TODO
  // public async WXCreateChatRoom(userList: string[]): Promise<any> {
  //   const result = await this.sendToWebSocket('WXCreateChatRoom', userList)
  //   console.log(result)
  //   return result
  // }

  public async WXQuitChatRoom(roomId: string): Promise<StandardType> {
    const result = await this.rpcCall('WXQuitChatRoom', roomId)
    log.silly('PadchatRpc', 'WXQuitChatRoom result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXQuitChatRoom error! canot get result from websocket server')
    }
    return result
  }

  // friendRequestSend
  // type来源值：
  // 2                 -通过搜索邮箱
  // 3                  -通过微信号搜索
  // 5                  -通过朋友验证消息
  // 7                  -通过朋友验证消息(可回复)
  // 12                -通过QQ好友添加
  // 14                -通过群来源
  // 15                -通过搜索手机号
  // 16                -通过朋友验证消息
  // 17                -通过名片分享
  // 22                -通过摇一摇打招呼方式
  // 25                -通过漂流瓶
  // 30                -通过二维码方式
  public async WXAddUser(strangerV1: string, strangerV2: string, type: string, verify: string): Promise<any> {
    // TODO:
    type = '14'
    verify = 'hello'
    const result = await this.rpcCall('WXAddUser', strangerV1, strangerV2, type, verify)
    log.silly('PadchatRpc', 'WXAddUser result: %s', JSON.stringify(result))
    return result
  }

  public async WXAcceptUser(stranger: string, ticket: string): Promise<any> {
    const result = await this.rpcCall('WXAcceptUser', stranger, ticket)
    log.silly('PadchatRpc', 'WXAcceptUser result: %s', JSON.stringify(result))
    return result
  }

}
