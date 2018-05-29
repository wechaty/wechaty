// import Profile          from '../profile'
import { log }          from '../config'
import { EventEmitter } from 'events'
import * as cuid        from 'cuid'
import * as WebSocket   from 'ws'
import * as fs          from 'fs'
import {
  PadchatContactRawPayload,
}                       from './padchat-schemas'

export const resolverDict: {
  [idx: string]: Function,
} = {}

export interface BridgeOptions {
  // head?   : boolean,
  userId:    string,
  // profile:  Profile,
  botWs:    WebSocket,
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

export interface WXGetQRCodeType {
  qr_code : string,
}

export interface WXCheckQRCodeType {
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

  constructor(
    public options: BridgeOptions,
  ) {
    super() // for EventEmitter
    log.verbose('PuppetPadchatBridge', 'constructor()')

    this.userId   = options.userId
    this.botWs    = options.botWs
    this.autoData = options.autoData || {}
    // this.state = new StateSwitch('PuppetPadchatBridge', log)
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
        reject('PadChat Server timeout')
      }, 30000)

    })
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

  // TODO: should generate qrcode here
  public async WXGetQRCode(): Promise<WXGetQRCodeType> {
    const result = await this.sendToWebSocket('WXGetQRCode', [])
    if (!result || !(result.qr_code)) {
      throw Error('WXGetQRCode error! canot get result from websocket server')
    }

    log.silly('PuppetPadchatBridge', 'WXGetQRCode get qrcode successfullt')
    this.checkQrcode()
    fs.writeFileSync('./demo.jpg', result.qr_code, {encoding: 'base64'})
    return result
  }

  public async WXCheckQRCode(): Promise<WXCheckQRCodeType> {
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

  // TODO
  // public WXSyncContact(): void {
  //   this.sendToWebSocket('WXSyncContact', [])
  // }

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
  public async WXAutoLogin(token: string): Promise<WXAutoLoginType> {
    const result = await this.sendToWebSocket('WXAutoLogin', [token])
    log.silly('PuppetPadchatBridge', 'WXAutoLogin result: %s, type: %s', JSON.stringify(result), typeof result)

    // should get qrcode again
    if (!result) {
      await this.WXGetQRCode()
    }

    // should send wxloginRequest
    if (result.status !== 0) {
      await this.WXLoginRequest(token)
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
  public async WXLoginRequest(token: string): Promise<WXLoginRequestType> {
    // TODO: should show result here
    const result = await this.sendToWebSocket('WXLoginRequest', [token])
    log.silly('PuppetPadchatBridge', 'WXLoginRequest result: %s, type: %s', JSON.stringify(result), typeof result)
    if (!result || result.status !== 0) {
      this.WXGetQRCode()
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
  public async WXGetContact(id: string): Promise<PadchatContactRawPayload> {
    const result = await this.sendToWebSocket('WXGetContact', [id])
    if (!result) {
      throw Error('PuppetPadchatBridge, WXGetContact, cannot get result from websocket server!')
    }
    if (result.user_name) {
      log.warn('PuppetPadchatBridge', 'WXGetContact cannot get user_name')
    }
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

    if (result && result.status === 0) {
      log.info('PuppetPadchatBridge', 'checkQrcode: Please scan the Qrcode!')

      setTimeout(() => {
        this.checkQrcode()
      }, 1000)

      return
    }

    if (result && result.status === 1) {
      log.info('PuppetPadchatBridge', 'checkQrcode: Had scan the Qrcode, but not Login!')

      setTimeout(() => {
        this.checkQrcode()
      }, 1000)

      return
    }

    if (result && result.status === 2) {
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

    if (result && result.status === 3) {
      log.info('PuppetPadchatBridge', 'checkQrcode: Timeout')
      return
    }

    if (result && result.status === 4) {
      log.info('PuppetPadchatBridge', 'checkQrcode: Cancel by user')
      return
    }

    log.warn('PuppetPadchatBridge', 'checkQrcode: not know the reason, return data: %s', JSON.stringify(result))
    return
  }
}
