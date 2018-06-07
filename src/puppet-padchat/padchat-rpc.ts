import { EventEmitter } from 'events'

// import cuid        from 'cuid'
import WebSocket   from 'ws'

import Peer, {
  parse,
}           from 'json-rpc-peer'

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
  WXLogoutType,
}                             from './padchat-rpc.type'

import {
  PadchatPureFunctionHelper as pfHelper,
}                                           from './pure-function-helper'

import { log }          from '../config'

export class PadchatRpc extends EventEmitter {
  private socket?          : WebSocket
  private readonly jsonRpc : any // Peer

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

    await this.init()
    await this.WXInitialize()
  }

  protected async initJsonRpc(): Promise<void> {
    log.verbose('PadchatRpc', 'initJsonRpc()')

    if (!this.socket) {
      throw new Error('socket had not been opened yet!')
    }

    this.jsonRpc.on('data', (buffer: string | Buffer) => {
      log.silly('PadchatRpc', 'initJsonRpc() jsonRpc.on(data)')

      if (!this.socket) {
        throw new Error('no web socket')
      }

      const text = String(buffer)
      const payload = parse(text) // as JsonRpcPayloadRequest

      log.silly('PadchatRpc', 'initJsonRpc() jsonRpc.on(data) buffer="%s"', text)

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
        userId:   this.token,
        msgId:    payload.id as string,
        apiName:  payload.method,
        param:    encodedParam,
      }

      log.silly('PadchatRpc', 'initJsonRpc() jsonRpc.on(data) converted to padchat payload="%s"', JSON.stringify(message))

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

    this.socket = ws

    ws.on('message', (data: string) => {
      log.silly('PadchatRpc', 'initWebSocket() ws.on(message)')
      try {
        const payload: PadchatPayload = JSON.parse(data)
        this.onSocket(payload)
      } catch (e) {
        log.warn('PadchatRpc', 'startJsonRpc() ws.on(message) exception: %s', e)
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
    log.silly('PadchatRpc', 'rpcCall(%s, %s)', apiName, params.join(', '))
    return await this.jsonRpc.request(apiName, params)
  }

  protected onSocket(payload: PadchatPayload) {
    log.verbose('PadchatRpc', 'onServer(payload.length=%d)',
                                        JSON.stringify(payload).length,
                )

    // console.log('server payload:', payload)

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

      const tencentPayloadList: PadchatMessagePayload[] = JSON.parse(decodeURIComponent(payload.data))
      this.onSocketTencent(tencentPayloadList)
    }
  }

  protected onSocketTencent(messagePayloadList: PadchatMessagePayload[]) {
    console.log('tencent messagePayloadList:', messagePayloadList)

    // messagePayload:
    // {
    //   "apiName": "",
    //   "data": "XXXX",
    //   "msgId": "",
    //   "userId": "test"
    // }

    // if (   payload.continue  === PadchatContinue.Done
    //     && payload.msg_type  === PadchatMsgType.N15_32768
    //     && payload.status    === PadchatStatus.One
    // ) {
    //   // Skip empty message. "continue":0,"msg_type":32768,"status":1,"
    //   return
    // }

    // if (!payload.data) {
    //   console.error('data: no payload.data')
    //   return
    // }
    // const messagePayloadList: PadchatMessagePayload[] = JSON.parse(decodeURIComponent(payload.data))

    for (const messagePayload of messagePayloadList) {
      if (!messagePayload.msg_id) {
        // {"continue":0,"msg_type":32768,"status":1,"uin":1928023446}
        log.silly('PadchatRpc', 'onServerTencent() discard empty message msg_id payoad: %s',
                                JSON.stringify(messagePayload),
                  )
        continue
      }
      log.silly('PadchatRpc', 'onServerTencent() messagePayload: %s', JSON.stringify(messagePayload))

      this.emit('message', messagePayload)
    }
  }

  protected onSocketPadchat(padchatPayload: PadchatPayload) {
    log.verbose('PadchatRpc', 'onServerPadchat({apiName="%s", msgId="%s", ...})',
                                        padchatPayload.apiName,
                                        padchatPayload.msgId,
                )
    log.silly('PadchatRpc', 'onServerPadchat(%s)', JSON.stringify(padchatPayload).substr(0, 500))

    // check logout:
    if (padchatPayload.type === PadchatPayloadType.Logout) {
      // this.emit('logout', this.selfId())
      this.emit('logout')
    }

    let result: any

    if (padchatPayload.data) {
      result = JSON.parse(decodeURIComponent(padchatPayload.data))
    } else {
      log.silly('PadchatRpc', 'onServerMessagePadchat() discard empty payload.data for apiName: %s', padchatPayload.apiName)
      result = {}
    }

    // const jsonRpcResponse: JsonRpcPayloadResponse = {
    const jsonRpcResponse = {
        id: padchatPayload.msgId,
      jsonrpc: '2.0',
      result: result,
      type: 'response',
    }

    const responseText = JSON.stringify(jsonRpcResponse)
    log.silly('PadchatRpc', 'onServerPadchat() converted to JsonRpc payload="%s"', responseText.substr(0, 500))

    this.jsonRpc.write(responseText)

    // if (resolverDict[msgId]) {
    //   const resolve = resolverDict[msgId]
    //   delete resolverDict[msgId]
    //   // resolve({rawData: rawData, msgId: rawWebSocketData.msgId})
    //   resolve(rawData)
    // } else {
    //   log.warn('PadchatRpc', 'wsOnMessage() msgId %s not in resolverDict', msgId)
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

  // TODO: check any
  // For add new friends by id
  public async WXSearchContact(): Promise<any> {
    const result = await this.rpcCall('WXSearchContact')
    log.silly('PadchatRpc', 'WXSearchContact result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXSearchContact error! canot get result from websocket server')
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

  // TODO: check any
  public async WXCreateChatRoom(userList: string[]): Promise<any> {
    const result = await this.rpcCall('WXCreateChatRoom', JSON.stringify(userList))
    log.silly('PadchatRpc', 'WXCreateChatRoom , stranger,result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXCreateChatRoom , stranger,error! canot get result from websocket server')
    }
    return result
  }

  // TODO: check any
  // TODO: don't know the difference between WXAddChatRoomMember
  public async WXInviteChatRoomMember(roomId: string, contactId: string): Promise<any> {
    const result = await this.rpcCall('WXInviteChatRoomMember', roomId, contactId)
    log.silly('PadchatRpc', 'WXInviteChatRoomMember , stranger,result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXInviteChatRoomMember , stranger,error! canot get result from websocket server')
    }
    return result
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
  public async WXGetUserQRCode(user: string, style: string): Promise<any> {
    const result = await this.rpcCall('WXGetUserQRCode', user, style)
    log.silly('PadchatRpc', 'WXGetUserQRCode , stranger,result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXGetUserQRCode , stranger,error! canot get result from websocket server')
    }
    return result
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
  public async WXSendVoice(user: string, data: string, time: string): Promise<any> {
    const result = await this.rpcCall('WXSendVoice', user, data, time)
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
    return result
  }
}
