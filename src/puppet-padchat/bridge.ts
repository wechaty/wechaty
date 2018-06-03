import { EventEmitter } from 'events'
import * as cuid        from 'cuid'
import * as WebSocket   from 'ws'
// import * as fs          from 'fs'

import { MemoryCard }   from 'memory-card'
import { StateSwitch }  from 'state-switch'

// tslint:disable-next-line
import jsQR       from 'jsqr'
import * as Jimp  from 'jimp'

import {
  PadchatContactPayload,
  PadchatRoomPayload,
  PadchatRoomMember,
  PadchatRoomMemberPayload,
  PadchatContactMsgType,
    PadchatContinue,
}                                         from './padchat-schemas'

import { log }          from '../config'

export const resolverDict: {
  [idx: string]: Function,
} = {}

export interface BridgeOptions {
  memory: MemoryCard,
  // head?   : boolean,
  token:    string,
  endpoint: string,
  // profile:  Profile,
  // botWs:    WebSocket,
  // desperate in the future
  autoData: AutoDataType,
}

export interface FunctionType {
  userId:   string,
  msgId:    string,
  apiName:  string,
  param:    string[],
}

export interface AutoDataType {
  wxData?:    string,
  token?:     string,
  user_name?: string,
  nick_name?: string,
}

export interface InitType {
  message : string,
  status  : number,
}

export interface WXInitializeType {
  message : string, // WxUserInit成功
  status  : number,
}

export interface WXAddChatRoomMemberType {
  message : string, // "\n\u0010Everything+is+OK" (succeed)  || "\n\u0014MemberList+are+wrong" ('user has in the room')
  status  : number, // 0
}

export interface WXGetQRCodeType {
  qr_code : string,
}

export enum WXCheckQRCodeStatus {
  WaitScan    = 0,
  WaitConfirm = 1,
  Confirmed   = 2,
  Timeout     = 3,
  Cancel      = 4,
}

export interface WXCheckQRCodePayload {
  device_type  ?: string,   // android,
  expired_time  : number,   // 238,
  head_url     ?: string,   // http://wx.qlogo.cn/mmhead/ver_1/NkOvv1rTx3Dsqpicnhe0j7cVOR3psEAVfuhFLbmoAcwaob4eENNZlp3KIEsMgibfH4kRjDicFFXN3qdP6SGRXbo7GBs8YpN52icxSeBUX8xkZBA/0,
  nick_name    ?: string,   // 苏轼,
  password     ?: string,
  status        : number,   // 2 = success
  user_name    ?: string,   // wxid_zj2cahpwzgie12
}

export interface WXHeartBeatType {
  status  : number,   // 0
  message : string,   // ok
}

export interface WXGenerateWxDatType {
  data    : string,   // 62data,
  message : string,   // '',
  status  : number,   // 0
}

export interface WXLoadWxDatType {
  status  : number,   // 0
  message : string,   // ok
}

export interface StandardType {
  status  : number,   // 0
  message : string,   // ''
}

export interface WXGetLoginTokenType {
  message : string,
  status  : number,   // 0,
  token   : string,   // XXXXXXXX,
  uin     : number,   // 324216852
}

export interface WXAutoLoginType {
  email              : string,
  external?          : number,   // 0,
  long_link_server?  : string,   // szlong.weixin.qq.com,
  message            : string,   // �Everything+is+ok,
  nick_name          : string,
  phone_number       : string,
  qq                 : number,   // 0,
  short_link_server? : string    // szshort.weixin.qq.com:80,
  status             : number    // 0,
  uin?               : number    // 324216852,
  user_name          : string    // wxid_zj2cahpwzgie12
}

export interface WXLoginRequestType {
  status: number // 0
}

export interface WXSendMsgType {
  message : string,
  msg_id  : string,   // '5612827783578738216',
  status  : number,   // 0
}

export interface WXQRCodeLoginType {
  email             : string,   // sushishigeshiren@163.com,
  external          : number,   // 1,
  long_link_server  : string,   // szlong.weixin.qq.com,
  message           : string,   // �Everything+is+ok,
  nick_name         : string,   // 苏轼,
  phone_number      : string,   // 17326998117,
  qq                : number,   // 0,
  short_link_server : string,   // szshort.weixin.qq.com:80,
  status            : number,   // 0,
  uin               : number,   // 324216852,
  user_name         : string,   // wxid_zj2cahpwzgie12
}

export class Bridge extends EventEmitter {
  public botWs:       WebSocket
  public userId:      string        // User Token
  public autoData:    AutoDataType

  public username:    string | undefined
  public password:    string | undefined
  public nickname:    string | undefined

  public loginSucceed = false

  public cachePadchatRoomPayload    : { [id: string]: PadchatRoomPayload }
  public cachePadchatContactPayload : { [id: string]: PadchatContactPayload }

  private readonly state: StateSwitch

  constructor(
    public options: BridgeOptions,
  ) {
    super() // for EventEmitter
    log.verbose('PuppetPadchatBridge', 'constructor()')

    this.userId   = options.token

    this.botWs  = new WebSocket(
      this.options.endpoint,
      { perMessageDeflate: true },
    )

    this.autoData = options.autoData || {}

    this.cachePadchatRoomPayload = {}
    this.cachePadchatContactPayload = {}

    this.state = new StateSwitch('PuppetPadchatBridge')
  }

  public async start(): Promise<void> {
    this.cachePadchatRoomPayload    = {}
    this.cachePadchatContactPayload = {}
    this.loginSucceed          = false

    this.state.on('pending')

    const autoData: AutoDataType = await this.options.memory.get('autoData')
    log.silly('PuppetPadchat', 'initBridge, get autoData: %s', JSON.stringify(autoData))
    this.autoData = autoData || {}

    await this.initWs()

    // await some tasks...
    await this.init()
    await this.WXInitialize()

    // Check for 62 data, if has, then use WXLoadWxDat
    if (this.autoData && this.autoData.wxData) {
      log.info('PuppetPadchat', `start, get 62 data`)
      // this.WXLoadWxDat(bridge.autoData.wxData)
      await this.WXLoadWxDat(this.autoData.wxData)
    }

    if (this.autoData && this.autoData.token) {
      log.info('PuppetPadchat', `get ${this.autoData.nick_name || 'no nick_name'} token`)

      // Offline, then relogin
      log.info('PuppetPadchat', `offline, trying to relogin`)
      await this.WXAutoLogin(this.autoData.token)
    } else {
      await this.WXGetQRCode()
    }

    await this.checkLogin()

    this.state.on(true)
  }

  public async stop(): Promise<void> {

    this.state.off('pending')

    this.cachePadchatRoomPayload = {}
    this.cachePadchatContactPayload = {}

    await this.closeWs()

    this.state.off(true)
  }

  private async sendToWebSocket(name: string, args: string[]): Promise<any> {
    const msgId = cuid()
    const data: FunctionType = {
      userId:   this.userId,
      msgId:    msgId,
      apiName:  name,
      param:    [],
    }

    args.forEach(arg => {
      data.param.push(encodeURIComponent(arg))
    })

    const sendData = JSON.stringify(data)
    log.silly('PuppetPadchatBridge', 'sendToWebSocket: %s', sendData)
    this.botWs.send(sendData)

    return new Promise((resolve, reject) => {
      resolverDict[msgId] = resolve

      setTimeout(() => {
        delete resolverDict[msgId]
        // TODO: send json again or detect init()
        reject('PadChat Server timeout for msgId: ' + msgId + ', apiName: ' + name + ', args: ' + args.join(', '))
      }, 30000)

    })
  }

  public async initWs(): Promise<void> {
    this.botWs.removeAllListeners()

    this.botWs.on('message', wsMsg => {
      this.emit('ws', wsMsg)
    })
    // this.botWs.on('open', () => {
    //   console.log('3333')
    //   this.emit('open')
    // })

    await new Promise((resolve, reject) => {
      this.botWs.once('open', resolve)
      this.botWs.once('error', reject)
    })
  }

  public closeWs(): void {
    this.botWs.close()
  }

  /**
   * Init with WebSocket Server
   */
  public async init(): Promise<InitType> {
    const result: InitType = await this.sendToWebSocket('init', [])
    log.silly('PuppetPadchatBridge', 'init result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('cannot connect to WebSocket init')
    }
    return result
  }

  /**
   * Get WX block memory
   */
  public async WXInitialize(): Promise<WXInitializeType> {
    const result = await this.sendToWebSocket('WXInitialize', [])
    log.silly('PuppetPadchatBridge', 'WXInitialize result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('cannot connect to WebSocket WXInitialize')
    }
    return result
  }

  public async WXGetQRCode(): Promise<WXGetQRCodeType> {
    let result = await this.sendToWebSocket('WXGetQRCode', [])
    if (!result || !(result.qr_code)) {
      result = await this.WXGetQRCodeTwice()
    }

    log.silly('PuppetPadchatBridge', 'WXGetQRCode get qrcode successfully')
    this.checkQrcode()

    const qrCodeImageBuffer = Buffer.from(result.qr_code, 'base64')

    Jimp.read(qrCodeImageBuffer, (err, image) => {
      if (err) {
        this.emit('error', err)
        // console.log('err:', err)
        return
      }

      const qrCodeImageArray = new Uint8ClampedArray(image.bitmap.data.buffer)

      const qrCode = jsQR(
        qrCodeImageArray,
        image.bitmap.width,
        image.bitmap.height,
      )

      if (qrCode) {
        this.emit('scan', qrCode.data, 0)
      } else {
        log.warn('PuppetPadChatBridge', 'WXGetQRCode() qrCode decode fail.')
      }

    })

    return result
  }

  private async WXGetQRCodeTwice(): Promise<WXGetQRCodeType> {
    await this.WXInitialize()
    const resultTwice = await this.sendToWebSocket('WXGetQRCode', [])
    if (!resultTwice || !(resultTwice.qr_code)) {
      throw Error('WXGetQRCodeTwice error! canot get result from websocket server when calling WXGetQRCode after WXInitialize')
    }
    return resultTwice
  }

  public async WXCheckQRCode(): Promise<WXCheckQRCodePayload> {
    // this.checkQrcode()
    const result = await this.sendToWebSocket('WXCheckQRCode', [])
    log.silly('PuppetPadchatBridge', 'WXCheckQRCode result: %s', JSON.stringify(result))
    if (!result) {
      throw Error('cannot connect to WebSocket WXCheckQRCode')
    }
    return result
  }

  public async WXHeartBeat(): Promise<WXHeartBeatType> {
    const result = await this.sendToWebSocket('WXHeartBeat', [])
    log.silly('PuppetPadchatBridge', 'WXHeartBeat result: %s', JSON.stringify(result))
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
  private async WXSyncContact(): Promise<(PadchatRoomPayload | PadchatContactPayload)[]> {
    const result = await this.sendToWebSocket('WXSyncContact', [])
    if (!result) {
      throw Error('WXSyncContact error! canot get result from websocket server')
    }
    return result
  }

  public async getContactIdList(): Promise<string[]> {
    return Object.keys(this.cachePadchatContactPayload)
  //   const result = await this.syncContactOrRoom()
  //   if (result.contactIdList.length < 0) {
  //     throw Error('getContactIdList error! canot get contactIdList')
  //   }
  //   return result.contactIdList
  }

  public async getRoomIdList(): Promise<string[]> {
    const idList = Object.keys(this.cachePadchatRoomPayload)
    log.verbose('PuppetPadchatBridge', 'getRoomIdList() = %d', idList.length)
    return idList
  //   const result = await this.syncContactOrRoom()
  //   if (result.roomIdList.length < 0) {
  //     throw Error('getRoomIdList error! canot get contactIdList')
  //   }
  //   return result.roomIdList
  }

  public async syncContactsAndRooms(): Promise<void> {
    log.verbose('PuppetPadchat', `syncContactsAndRooms()`)

    let cont = true
    // const syncContactMap = new Map<string, PadchatContactRawPayload>()
    // const syncRoomMap = new Map<string, PadchatRoomRawPayload>()
    // let contactIdList: string[] = []
    // let roomIdList: string[] = []

    while (cont && this.state.on() && this.loginSucceed) {
      log.silly('PuppetPadchat', `syncContactsAndRooms() while()`)

      const syncContactList = await this.WXSyncContact()

      await new Promise(r => setTimeout(r, 1 * 1000))

      // console.log('syncContactList:', syncContactList)

      if (!Array.isArray(syncContactList) || syncContactList.length <= 0) {
        console.log('syncContactList:', syncContactList)
        log.error('PuppetPadchat', 'syncContactsAndRooms() cannot get array result!')
        continue
      }

      log.verbose('PuppetPadchat', 'syncContactsAndRooms() sync contact, got new/total: %d/%d',
                                    syncContactList.length,
                                    (
                                      Object.keys(this.cachePadchatContactPayload).length
                                      + Object.keys(this.cachePadchatRoomPayload).length
                                    ),
                  )

      syncContactList
      .forEach(syncContact => {
        if (syncContact.continue === PadchatContinue.Go) {
          if (syncContact.msg_type === PadchatContactMsgType.Contact) {
            console.log('syncContact:', syncContact.user_name, syncContact.nick_name)
            if (/@chatroom$/.test(syncContact.user_name)) {
              this.cachePadchatRoomPayload[syncContact.user_name] = syncContact as PadchatRoomPayload
              // syncRoomMap.set(syncContact.user_name, syncContact as PadchatRoomRawPayload)
            } else if (syncContact.user_name) {
              this.cachePadchatContactPayload[syncContact.user_name] = syncContact as PadchatContactPayload
              // syncContactMap.set(syncContact.user_name, syncContact as PadchatContactRawPayload)
            } else {
              throw new Error('no user_name')
            }
          }
        } else {
          log.info('PuppetPadchat', 'syncContactsAndRooms() sync contact done!')
          cont = false
          return
        }
      })

      log.verbose('PuppetPadchat', `syncContactsAndRooms(), continue to load via WXSyncContact ...`)
    }

    // contactIdList = contactIdList.filter(id => !!id)
    // roomIdList = roomIdList.filter(id => !!id)
    // if (contactIdList.length < 0) {
    //   throw Error('getContactIdList error! canot get contactIdList')
    // }

    // if (roomIdList.length < 0) {
    //   throw Error('getRoomIdList error! canot get getRoomIdList')
    // }
    // return {
    //   contactIdList: contactIdList,
    //   roomIdList: roomIdList,
    // }
  }

  /**
   * Generate 62 data
   */
  public async WXGenerateWxDat(): Promise<WXGenerateWxDatType> {
    const result = await this.sendToWebSocket('WXGenerateWxDat', [])
    log.silly('PuppetPadchatBridge', 'WXGenerateWxDat result: %s', JSON.stringify(result))
    if (!result || !(result.data) || result.status !== 0) {
      throw Error('WXGenerateWxDat error! canot get result from websocket server')
    }
    this.autoData.wxData = result.data
    return result
  }

  /**
   * Load 62 data
   * @param {string} wxData     autoData.wxData
   */
  public async WXLoadWxDat(wxData: string): Promise<WXLoadWxDatType> {
    const result = await this.sendToWebSocket('WXLoadWxDat', [wxData])
    if (!result || result.status !== 0) {
      throw Error('WXLoadWxDat error! canot get result from websocket server')
    }
    return result
  }

  public async WXGetLoginToken(): Promise<WXGetLoginTokenType> {
    const result = await this.sendToWebSocket('WXGetLoginToken', [])
    log.silly('PuppetPadchatBridge', 'WXGetLoginToken result: %s', JSON.stringify(result))
    if (!result || !result.token || result.status !== 0) {
      throw Error('WXGetLoginToken error! canot get result from websocket server')
    }
    this.autoData.token = result.token

    return result
  }

  /**
   * Login with token automatically
   * @param {string} token    autoData.token
   * @returns {string} user_name | ''
   */
  public async WXAutoLogin(token: string): Promise<WXAutoLoginType | ''> {
    const result = await this.sendToWebSocket('WXAutoLogin', [token])
    log.silly('PuppetPadchatBridge', 'WXAutoLogin result: %s, type: %s', JSON.stringify(result), typeof result)

    // should get qrcode again
    if (!result) {
      await this.WXGetQRCode()
      return ''
    }

    // should send wxloginRequest
    if (result.status !== 0) {
      await this.WXLoginRequest(token)
      return ''
    }

    // login succeed!
    this.username = result.user_name
    log.silly('PuppetPadchatBridge', 'WXAutoLogin bridge autoData user_name: %s', this.username)
    this.loginSucceed = true
    return result
  }

  /**
   * Login with QRcode
   * @param {string} token    autoData.token
   */
  public async WXLoginRequest(token: string): Promise<WXLoginRequestType | ''> {
    // TODO: should show result here
    const result = await this.sendToWebSocket('WXLoginRequest', [token])
    log.silly('PuppetPadchatBridge', 'WXLoginRequest result: %s, type: %s', JSON.stringify(result), typeof result)
    if (!result || result.status !== 0) {
      await this.WXGetQRCode()
      return ''
    } else {
      // check qrcode status
      log.silly('PuppetPadchatBridge', 'WXLoginRequest begin to check whether user has clicked confirm login')
      this.checkQrcode()
    }
    return result
  }

  /**
   * Send Text Message
   * @param {string} to       user_name
   * @param {string} content  text
   */
  public async WXSendMsg(to: string, content: string, at?: string): Promise<WXSendMsgType> {
    if (to) {
      const result = await this.sendToWebSocket('WXSendMsg', [to, content, at || ''])
      if (!result || result.status !== 0) {
        throw Error('WXSendMsg error! canot get result from websocket server')
      }
      return result
    }
    throw Error('PuppetPadchatBridge, WXSendMsg error! no to!')
  }

  /**
   * Send Image Message
   * @param {string} to     user_name
   * @param {string} data   image_data
   */
  public WXSendImage(to: string, data: string): void {
    this.sendToWebSocket('WXSendImage', [to, data])
  }

  /**
   * Get contact by contact id
   * @param {any} id        user_name
   */
  private async WXGetContact(id: string): Promise<PadchatContactPayload | PadchatRoomPayload> {
    const result = await this.sendToWebSocket('WXGetContact', [id])

    if (!result) {
      throw Error('PuppetPadchatBridge, WXGetContact, cannot get result from websocket server!')
    }

    log.silly('PuppetPadchatBridge', 'WXGetContact(%s) result: %s', id, JSON.stringify(result))

    if (!result.user_name) {
      log.warn('PuppetPadchatBridge', 'WXGetContact cannot get user_name, id: %s', id)
    }
    if (result.member) {
      result.member = JSON.parse(decodeURIComponent(result.member))
    }
    return result
  }

  /**
   * Get contact by contact id
   * @param {any} id        user_name
   */
  public async WXGetContactPayload(id: string): Promise<PadchatContactPayload> {
    if (/@chatroom$/.test(id)) {
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
    if (!(/@chatroom$/.test(id))) {
      throw Error(`should use WXGetContactPayload because get a contact id :${id}`)
    }
    const result = await this.WXGetContact(id) as PadchatRoomPayload
    return result
  }

  /**
   * Get room member by contact id
   * @param {any} id        chatroom_id
   */
  public async WXGetChatRoomMember(id: string): Promise<PadchatRoomMemberPayload> {
    const result = await this.sendToWebSocket('WXGetChatRoomMember', [id])
    if (!result) {
      throw Error('PuppetPadchatBridge, WXGetChatRoomMember, cannot get result from websocket server!')
    }

    log.silly('PuppetPadchatBridge', 'WXGetChatRoomMember() result: %s', JSON.stringify(result))

    if (!result.user_name || !result.member) {
      log.warn('PuppetPadchatBridge', 'WXGetChatRoomMember cannot get user_name or member! user_name: %s, member: %s', id, result.member)
    }

    // tslint:disable-next-line:max-line-length
    // change '[{"big_head":"http://wx.qlogo.cn/mmhead/ver_1/DpS0ZssJ5s8tEpSr9JuPTRxEUrCK0USrZcR3PjOMfUKDwpnZLxWXlD4Q38bJpcXBtwXWwevsul1lJqwsQzwItQ/0","chatroom_nick_name":"","invited_by":"wxid_7708837087612","nick_name":"李佳芮","small_head":"http://wx.qlogo.cn/mmhead/ver_1/DpS0ZssJ5s8tEpSr9JuPTRxEUrCK0USrZcR3PjOMfUKDwpnZLxWXlD4Q38bJpcXBtwXWwevsul1lJqwsQzwItQ/132","user_name":"qq512436430"},{"big_head":"http://wx.qlogo.cn/mmhead/ver_1/kcBj3gSibfFd2I9vQ8PBFyQ77cpPIfqkFlpTdkFZzBicMT6P567yj9IO6xG68WsibhqdPuG82tjXsveFATSDiaXRjw/0","chatroom_nick_name":"","invited_by":"wxid_7708837087612","nick_name":"梦君君","small_head":"http://wx.qlogo.cn/mmhead/ver_1/kcBj3gSibfFd2I9vQ8PBFyQ77cpPIfqkFlpTdkFZzBicMT6P567yj9IO6xG68WsibhqdPuG82tjXsveFATSDiaXRjw/132","user_name":"mengjunjun001"},{"big_head":"http://wx.qlogo.cn/mmhead/ver_1/3CsKibSktDV05eReoAicV0P8yfmuHSowfXAMvRuU7HEy8wMcQ2eibcaO1ccS95PskZchEWqZibeiap6Gpb9zqJB1WmNc6EdD6nzQiblSx7dC1eGtA/0","chatroom_nick_name":"","invited_by":"wxid_7708837087612","nick_name":"苏轼","small_head":"http://wx.qlogo.cn/mmhead/ver_1/3CsKibSktDV05eReoAicV0P8yfmuHSowfXAMvRuU7HEy8wMcQ2eibcaO1ccS95PskZchEWqZibeiap6Gpb9zqJB1WmNc6EdD6nzQiblSx7dC1eGtA/132","user_name":"wxid_zj2cahpwzgie12"},{"big_head":"http://wx.qlogo.cn/mmhead/ver_1/piaHuicak41b6ibmcEVxoWKnnhgGDG5EbaD0hibwkrRvKeDs3gs7XQrkym3Q5MlUeSKY8vw2FRVVstialggUxf2zic2O8CvaEsicSJcghf41nibA940/0","chatroom_nick_name":"","invited_by":"wxid_zj2cahpwzgie12","nick_name":"王宁","small_head":"http://wx.qlogo.cn/mmhead/ver_1/piaHuicak41b6ibmcEVxoWKnnhgGDG5EbaD0hibwkrRvKeDs3gs7XQrkym3Q5MlUeSKY8vw2FRVVstialggUxf2zic2O8CvaEsicSJcghf41nibA940/132","user_name":"wxid_7708837087612"}]'
    // to Array (PadchatRoomRawMember[])
    if (!Array.isArray(JSON.parse(decodeURIComponent(result.member)))) {
      log.error('PuppetPadchatBridge', 'WXGetChatRoomMember member: %s', result.member)
      throw Error('faild to parse chatroom member!')
    }
    result.member = JSON.parse(decodeURIComponent(result.member)) as PadchatRoomMember[]

    return result
  }

  /**
   * Login successfully by qrcode
   * @param {any} id        user_name
   * @param {any} password  password
   */
  public async WXQRCodeLogin(id: string, password: string): Promise<WXQRCodeLoginType> {
    const result = await this.sendToWebSocket('WXQRCodeLogin', [id, password])

    if (result && result.status === 0) {
      log.info('PuppetPadchatBridge', 'WXQRCodeLogin, login successfully!')
      this.username = result.user_name
      this.nickname = result.nick_name
      this.loginSucceed = true
    }

    if (result && (result.status === -3)) {
      throw Error('PuppetPadchatBridge, WXQRCodeLogin, wrong user_name or password')
    }

    if (result && (result.status === -301)) {
      log.warn('PuppetPadchatBridge', 'WXQRCodeLogin, redirect 301')

      if (!this.username || !this.password) {
        throw Error('PuppetPadchatBridge, WXQRCodeLogin, redirect 301 and cannot get username or password here, return!')
      }
      this.WXQRCodeLogin(this.username, this.password)
    }

    if (!result) {
      throw Error(`PuppetPadchatBridge, WXQRCodeLogin, unknown error, data: ${JSON.stringify(result)}`)
    }

    return result
  }

  public async checkQrcode(): Promise<void> {
    log.verbose('PuppetPadchatBridge', 'checkQrcode')
    const result = await this.WXCheckQRCode()

    if (result && result.status === WXCheckQRCodeStatus.WaitScan) {
      log.verbose('PuppetPadchatBridge', 'checkQrcode: Please scan the Qrcode!')

      setTimeout(() => {
        this.checkQrcode()
      }, 1000)

      return
    }

    if (result && result.status === WXCheckQRCodeStatus.WaitConfirm) {
      log.info('PuppetPadchatBridge', 'checkQrcode: Had scan the Qrcode, but not Login!')

      setTimeout(() => {
        this.checkQrcode()
      }, 1000)

      return
    }

    if (result && result.status === WXCheckQRCodeStatus.Confirmed) {
      log.info('PuppetPadchatBridge', 'checkQrcode: Trying to login... please wait')

      if (!result.user_name || !result.password) {
        throw Error('PuppetPadchatBridge, checkQrcode, cannot get username or password here, return!')
      }

      this.username = result.user_name
      // this.nickname = result.nick_name
      this.password = result.password

      this.WXQRCodeLogin(this.username, this.password)
      return
    }

    if (result && result.status === WXCheckQRCodeStatus.Timeout) {
      log.info('PuppetPadchatBridge', 'checkQrcode: Timeout')
      return
    }

    if (result && result.status === WXCheckQRCodeStatus.Cancel) {
      log.info('PuppetPadchatBridge', 'checkQrcode: Cancel by user')
      return
    }

    log.warn('PuppetPadchatBridge', 'checkQrcode: not know the reason, return data: %s', JSON.stringify(result))
    return
  }

  public async WXSetUserRemark(id: string, remark: string): Promise<StandardType> {
    const result = await this.sendToWebSocket('WXSetUserRemark', [id, remark])
    log.silly('PuppetPadchatBridge', 'WXSetUserRemark result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXSetUserRemark error! canot get result from websocket server')
    }
    return result
  }

  public async WXDeleteChatRoomMember(roomId: string, contactId: string): Promise<StandardType> {
    const result = await this.sendToWebSocket('WXDeleteChatRoomMember', [roomId, contactId])
    log.silly('PuppetPadchatBridge', 'WXDeleteChatRoomMember result: %s', JSON.stringify(result))
    if (!result || result.status !== 0) {
      throw Error('WXDeleteChatRoomMember error! canot get result from websocket server')
    }
    return result
  }

  public async WXAddChatRoomMember(roomId: string, contactId: string): Promise<boolean> {
    const result = (await this.sendToWebSocket('WXAddChatRoomMember', [roomId, contactId])) as WXAddChatRoomMemberType
    log.silly('PuppetPadchatBridge', 'WXAddChatRoomMember result: %s', JSON.stringify(result))
    if (result && result.status === -2028) {
      // result: {"message":"","status":-2028}
      // May be the owner has see not allow other people to join in the room (群聊邀请确认)
      log.warn('PuppetPadchatBridge', 'WXAddChatRoomMember failed! maybe owner open the should confirm first to invited others to join in the room.')
      return false
    }

    if (!result || result.status !== 0) {
      throw Error('WXAddChatRoomMember error! canot get result from websocket server')
    }

    // see more in WXAddChatRoomMemberType
    if (/OK/i.test(result.message)) {
      return true
    }
    return false
  }

  public async WXSetChatroomName(roomId: string, topic: string): Promise<StandardType> {
    const result = await this.sendToWebSocket('WXSetChatroomName', [roomId, topic])
    log.silly('PuppetPadchatBridge', 'WXSetChatroomName result: %s', JSON.stringify(result))
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
    const result = await this.sendToWebSocket('WXQuitChatRoom', [roomId])
    log.silly('PuppetPadchatBridge', 'WXQuitChatRoom result: %s', JSON.stringify(result))
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
    const result = await this.sendToWebSocket('WXAddUser', [strangerV1, strangerV2, type, verify])
    log.silly('PuppetPadchatBridge', 'WXAddUser result: %s', JSON.stringify(result))
    return result
  }

  public async WXAcceptUser(stranger: string, ticket: string): Promise<any> {
    const result = await this.sendToWebSocket('WXAcceptUser', [stranger, ticket])
    log.silly('PuppetPadchatBridge', 'WXAcceptUser result: %s', JSON.stringify(result))
    return result
  }

  public checkLogin() {
    log.silly('PuppetPadchat', `checkLogin`)

    // if (!this.bridge) {
    //   throw Error('cannot init bridge successfully!')
    // }

    if (this.loginSucceed === true) {
      log.silly('PuppetPadchat', `checkLogin, login successfully`)
      this.postLogin()
      return
    } else {
      log.silly('PuppetPadchat', `checkLogin, not login yet`)
      setTimeout(() => {
        this.checkLogin()
      }, 2000)
      return
    }
  }

  public async postLogin() {
    // if (!(this.bridge)) {
    //   throw Error('cannot init bridge successfully!')
    // }

    log.verbose('PuppetPadchatBridge', 'loginSucceed: Set heatbeat to websocket server')
    await this.WXHeartBeat()

    log.verbose('PuppetPadchatBridge', 'loginSucceed: Set token to websocket server')
    this.autoData.token = (await this.WXGetLoginToken()).token

    // Check 62 data. If has then use, or save 62 data here.
    if (!this.autoData.wxData || this.autoData.user_name !== this.username) {
      log.info('PuppetPadchatBridge', 'loginSucceed: No 62 data, or wrong 62 data')
      this.autoData.user_name = this.username
      this.autoData.nick_name = this.nickname
      this.autoData.wxData    = (await this.WXGenerateWxDat()).data
    }

    setTimeout(() => {
      this.saveConfig()
    }, 2 * 1000)

    return

    // Think more, whether it is need to syncContact
    // log.verbose('PuppetPadchatBridge', 'loginSucceed: SyncContact')
    // this.WXSyncContact()
  }

  public async saveConfig() {
    log.verbose('PuppetPadchatBridge', 'saveConfig, autoData: %s', JSON.stringify(this.autoData))
    if (this.autoData.wxData && this.autoData.token && this.autoData.user_name) {
      log.verbose('PuppetPadchatBridge', 'saveConfig: begin to save data to file')
      await this.options.memory.set('autoData', this.autoData)
      await this.options.memory.save()

      log.verbose('PuppetPadchatBridge', 'loginSucceed: Send ding to the bot, username: %s', this.username)
      await this.WXSendMsg(this.autoData.user_name, 'ding')

      const userId = this.autoData.user_name // Puppet userId different with WebSocket userId
      // const user = this.Contact.load(this.id)
      // await user.ready()
      this.emit('login', userId)

      log.verbose('PuppetPadchatBridge', 'loginSucceed: Send login to the bot, user_name: %s', this.username)
      await this.WXSendMsg(this.autoData.user_name, 'Bot on line!')

      return
    } else {
      log.verbose('PuppetPadchatBridge', 'no enough data, save again, %s', JSON.stringify(this.autoData))
      setTimeout( () => {
        this.saveConfig()
      }, 2 * 1000)
      return
    }
  }

}
