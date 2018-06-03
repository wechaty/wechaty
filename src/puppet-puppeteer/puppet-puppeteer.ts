/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   @copyright 2016-2018 Huan LI <zixia@zixia.net>
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */
// import * as http    from 'http'
import * as path    from 'path'
import * as nodeUrl from 'url'

import * as bl      from 'bl'
import * as mime  from 'mime'
import * as request from 'request'

// import cloneClass   from 'clone-class'
import {
  FileBox,
}                   from 'file-box'
import {
  ThrottleQueue,
}                   from 'rx-queue'
import {
  Watchdog,
  WatchdogFood,
}                   from 'watchdog'

import {
  Puppet,
  PuppetOptions,
  Receiver,
}                     from '../puppet/'
import {
  config,
  log,
  Raven,
  qrCodeForChatie,
}                     from '../config'

import Misc           from '../misc'

import {
  isRoomId,
}                   from './misc'

import {
  Bridge,
  Cookie,
}                       from './bridge'
import Event            from './event'

import {
  WebAppMsgType,
  WebContactRawPayload,
  WebMessageMediaPayload,
  WebMessageRawPayload,
  WebMediaType,
  WebMessageType,
  WebRecomendInfo,
  // WebRoomRawMember,
  WebRoomRawPayload,
}                           from './web-schemas'

import {
  ContactPayload,
  // ContactQueryFilter,
  ContactType,

  FriendRequestPayload,
  FriendRequestPayloadReceive,
  FriendRequestPayloadConfirm,
  FriendRequestType,

  MessagePayload,
  MessageType,

  // RoomMemberQueryFilter,
  RoomPayload,
  // RoomQueryFilter,

  ScanPayload,
}                           from '../puppet/'

import {
  // Contact,
}                             from '../contact'
import {
  // Messageirection,
}                             from '../message'
import {
  // Room,
}                             from '../room'

export type PuppetFoodType = 'scan' | 'ding'
export type ScanFoodType   = 'scan' | 'login' | 'logout'

export class PuppetPuppeteer extends Puppet {
  public bridge       : Bridge

  public scanPayload? : ScanPayload

  public scanWatchdog: Watchdog<ScanFoodType>

  private fileId: number

  constructor(
    public options: PuppetOptions,
  ) {
    super(options)

    this.fileId = 0
    this.bridge = new Bridge({
      head    : config.head,
      profile : this.options.memory,
    })

    const SCAN_TIMEOUT  = 2 * 60 * 1000 // 2 minutes
    this.scanWatchdog   = new Watchdog<ScanFoodType>(SCAN_TIMEOUT, 'Scan')
  }

  public async start(): Promise<void> {
    log.verbose('PuppetPuppeteer', `start() with ${this.options.memory.name}`)

    this.state.on('pending')

    try {
      this.initWatchdog()
      this.initWatchdogForScan()

      this.bridge = await this.initBridge()
      log.verbose('PuppetPuppeteer', 'initBridge() done')

      /**
       *  state must set to `live`
       *  before feed Watchdog
       */
      this.state.on(true)

      /**
       * Feed the dog and start watch
       */
      const food: WatchdogFood = {
        data: 'inited',
        timeout: 2 * 60 * 1000, // 2 mins for first login
      }
      this.emit('watchdog', food)

      /**
       * Save cookie for every 5 minutes
       */
      const throttleQueue = new ThrottleQueue(5 * 60 * 1000)
      this.on('watchdog', data => throttleQueue.next(data))
      throttleQueue.subscribe(async data => {
        log.verbose('Wechaty', 'start() throttleQueue.subscribe() new item: %s', data)
        await this.saveCookie()
      })

      log.verbose('PuppetPuppeteer', 'start() done')

      this.emit('start')
      return

    } catch (e) {
      log.error('PuppetPuppeteer', 'start() exception: %s', e)

      this.state.off(true)
      this.emit('error', e)
      await this.stop()

      Raven.captureException(e)
      throw e
    }
  }

  private initWatchdog(): void {
    log.verbose('PuppetPuppeteer', 'initWatchdogForPuppet()')

    const puppet = this

    // clean the dog because this could be re-inited
    this.watchdog.removeAllListeners()

    // fix issue #981
    puppet.removeAllListeners('watchdog')

    puppet.on('watchdog', food => this.watchdog.feed(food))
    this.watchdog.on('feed', food => {
      log.silly('PuppetPuppeteer', 'initWatchdogForPuppet() dog.on(feed, food={type=%s, data=%s})', food.type, food.data)
      // feed the dog, heartbeat the puppet.
      // 201805 puppet no need to `heartbeat`?
      // puppet.emit('heartbeat', food.data)
    })

    this.watchdog.on('reset', async (food, timeout) => {
      log.warn('PuppetPuppeteer', 'initWatchdogForPuppet() dog.on(reset) last food:%s, timeout:%s',
                            food.data, timeout)
      try {
        await this.stop()
        await this.start()
      } catch (e) {
        puppet.emit('error', e)
      }
    })
  }

  /**
   * Deal with SCAN events
   *
   * if web browser stay at login qrcode page long time,
   * sometimes the qrcode will not refresh, leave there expired.
   * so we need to refresh the page after a while
   */
  private initWatchdogForScan(): void {
    log.verbose('PuppetPuppeteer', 'initWatchdogForScan()')

    const puppet = this
    const dog    = this.scanWatchdog

    // clean the dog because this could be re-inited
    dog.removeAllListeners()

    puppet.on('scan', info => dog.feed({
      data: info,
      type: 'scan',
    }))
    puppet.on('login',  user => {
      dog.feed({
        data: user,
        type: 'login',
      })
      // do not monitor `scan` event anymore
      // after user login
      dog.sleep()
    })

    // active monitor again for `scan` event
    puppet.on('logout', user => dog.feed({
      data: user,
      type: 'logout',
    }))

    dog.on('reset', async (food, timePast) => {
      log.warn('PuppetPuppeteer', 'initScanWatchdog() on(reset) lastFood: %s, timePast: %s',
                            food.data, timePast)
      try {
        await this.bridge.reload()
      } catch (e) {
        log.error('PuppetPuppeteer', 'initScanWatchdog() on(reset) exception: %s', e)
        try {
          log.error('PuppetPuppeteer', 'initScanWatchdog() on(reset) try to recover by bridge.{quit,init}()', e)
          await this.bridge.quit()
          await this.bridge.init()
          log.error('PuppetPuppeteer', 'initScanWatchdog() on(reset) recover successful')
        } catch (e) {
          log.error('PuppetPuppeteer', 'initScanWatchdog() on(reset) recover FAIL: %s', e)
          this.emit('error', e)
        }
      }
    })
  }

  public async stop(): Promise<void> {
    log.verbose('PuppetPuppeteer', 'quit()')

    if (this.state.off()) {
      log.warn('PuppetPuppeteer', 'quit() is called on a OFF puppet. await ready(off) and return.')
      await this.state.ready('off')
      return
    }
    this.state.off('pending')

    log.verbose('PuppetPuppeteer', 'quit() make watchdog sleep before do quit')

    /**
     * Clean listeners for `watchdog`
     */
    this.watchdog.sleep()
    this.scanWatchdog.sleep()
    this.watchdog.removeAllListeners()
    this.scanWatchdog.removeAllListeners()
    this.removeAllListeners('watchdog')

    try {
      await this.bridge.quit()
      // register the removeListeners micro task at then end of the task queue
      setImmediate(() => this.bridge.removeAllListeners())
    } catch (e) {
      log.error('PuppetPuppeteer', 'quit() exception: %s', e.message)
      Raven.captureException(e)
      throw e
    } finally {
      this.state.off(true)
      this.emit('stop')
    }

  }

  private async initBridge(): Promise<Bridge> {
    log.verbose('PuppetPuppeteer', 'initBridge()')

    if (this.state.off()) {
      const e = new Error('initBridge() found targetState != live, no init anymore')
      log.warn('PuppetPuppeteer', e.message)
      throw e
    }

    this.bridge.on('ding'     , Event.onDing.bind(this))
    this.bridge.on('error'    , e => this.emit('error', e))
    this.bridge.on('log'      , Event.onLog.bind(this))
    this.bridge.on('login'    , Event.onLogin.bind(this))
    this.bridge.on('logout'   , Event.onLogout.bind(this))
    this.bridge.on('message'  , Event.onMessage.bind(this))
    this.bridge.on('scan'     , Event.onScan.bind(this))
    this.bridge.on('unload'   , Event.onUnload.bind(this))

    try {
      await this.bridge.init()
    } catch (e) {
      log.error('PuppetPuppeteer', 'initBridge() exception: %s', e.message)
      await this.bridge.quit().catch(console.error)
      this.emit('error', e)

      Raven.captureException(e)
      throw e
    }

    return this.bridge
  }

  public async messageRawPayload(id: string): Promise <WebMessageRawPayload> {
    const rawPayload = await this.bridge.getMessage(id)
    return rawPayload
  }

  public async messageRawPayloadParser(
    rawPayload: WebMessageRawPayload,
  ): Promise<MessagePayload> {
    log.verbose('PuppetPuppeteer', 'messageRawPayloadParser(%s) @ %s', rawPayload, this)

    const id                           = rawPayload.MsgId
    const fromId                       = rawPayload.MMActualSender               // MMPeerUserName
    const text: string                 = rawPayload.MMActualContent              // Content has @id prefix added by wx
    const timestamp: number            = rawPayload.MMDisplayTime                // Javascript timestamp of milliseconds
    const filename: undefined | string = this.filename(rawPayload) || undefined

    let roomId : undefined | string
    let toId   : undefined | string

    // FIXME: has there any better method to know the room ID?
    if (rawPayload.MMIsChatRoom) {
      if (isRoomId(rawPayload.FromUserName)) {
        roomId = rawPayload.FromUserName // MMPeerUserName always eq FromUserName ?
      } else if (isRoomId(rawPayload.ToUserName)) {
        roomId = rawPayload.ToUserName
      } else {
        throw new Error('parse found a room message, but neither FromUserName nor ToUserName is a room(/^@@/)')
      }

      // console.log('rawPayload.FromUserName: ', rawPayload.FromUserName)
      // console.log('rawPayload.ToUserName: ', rawPayload.ToUserName)
      // console.log('rawPayload.MMPeerUserName: ', rawPayload.MMPeerUserName)
    }

    if (rawPayload.ToUserName) {
      if (!isRoomId(rawPayload.ToUserName)) { // if a message in room without any specific receiver, then it will set to be `undefined`
        toId = rawPayload.ToUserName
      }
    }

    const type: MessageType = this.messageTypeFromWeb(rawPayload.MsgType)

    const payloadBase = {
      id,
      type,
      fromId,
      filename,
      text,
      timestamp,
    }

    let payload: MessagePayload

    if (toId) {
      payload = {
        ...payloadBase,
        toId,
        roomId,
      }
    } else if (roomId) {
      payload = {
        ...payloadBase,
        toId,
        roomId,
      }
    } else {
      throw new Error('neither roomId nor toId')
    }

    return payload
  }

  public async messageFile(messageId: string): Promise<FileBox> {
    const rawPayload = await this.messageRawPayload(messageId)
    const fileBox = await this.messageRawPayloadToFile(rawPayload)
    return fileBox
  }

  private async messageRawPayloadToFile(
    rawPayload: WebMessageRawPayload,
  ): Promise<FileBox> {
    let url = await this.messageRawPayloadToUrl(rawPayload)

    if (!url) {
      throw new Error('no url for type ' + MessageType[rawPayload.MsgType])
    }

    url = url.replace(/^https/i, 'http') // use http instead of https, because https will only success on the very first request!
    const parsedUrl = nodeUrl.parse(url)

    const filename = this.filename(rawPayload)

    if (!filename) {
      throw new Error('no filename')
    }

    const cookies = await this.cookies()

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36',

      // Accept: 'image/webp,image/*,*/*;q=0.8',
      // Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8', //  MsgType.IMAGE | VIDEO
      Accept: '*/*',

      Host: parsedUrl.hostname!, // 'wx.qq.com',  // MsgType.VIDEO | IMAGE

      // Referer: protocol + '//wx.qq.com/',
      Referer: url,

      // 'Upgrade-Insecure-Requests': 1, // MsgType.VIDEO | IMAGE

      Range: 'bytes=0-',

      // 'Accept-Encoding': 'gzip, deflate, sdch',
      // 'Accept-Encoding': 'gzip, deflate, sdch, br', // MsgType.IMAGE | VIDEO
      'Accept-Encoding': 'identity;q=1, *;q=0',

      'Accept-Language': 'zh-CN,zh;q=0.8', // MsgType.IMAGE | VIDEO
      // 'Accept-Language': 'zh-CN,zh;q=0.8,zh-TW;q=0.6,en-US;q=0.4,en;q=0.2',

      /**
       * pgv_pvi=6639183872; pgv_si=s8359147520; webwx_data_ticket=gSeBbuhX+0kFdkXbgeQwr6Ck
       */
      Cookie: cookies.map(c => `${c['name']}=${c['value']}`).join('; '),
    }

    const fileBox = FileBox.fromRemote(url, filename, headers)

    return fileBox
  }

  private messageTypeFromWeb(webMsgType: WebMessageType): MessageType {
    switch (webMsgType) {
      case WebMessageType.TEXT:
        return MessageType.Text

      case WebMessageType.EMOTICON:
      case WebMessageType.IMAGE:
        return MessageType.Image

      case WebMessageType.VOICE:
        return MessageType.Audio

      case WebMessageType.MICROVIDEO:
      case WebMessageType.VIDEO:
        return MessageType.Video

      case WebMessageType.TEXT:
        return MessageType.Text

      /**
       * Treat those Types as TEXT
       *
       * FriendRequest is a SYS message
       * FIXME: should we use better message type at here???
       */
      case WebMessageType.SYS:
      case WebMessageType.APP:
        return MessageType.Text

      // VERIFYMSG           = 37,
      // POSSIBLEFRIEND_MSG  = 40,
      // SHARECARD           = 42,
      // LOCATION            = 48,
      // VOIPMSG             = 50,
      // STATUSNOTIFY        = 51,
      // VOIPNOTIFY          = 52,
      // VOIPINVITE          = 53,
      // SYSNOTICE           = 9999,
      // RECALLED            = 10002,
      default:
        log.warn('PuppetPuppeteer', 'messageTypeFromWeb(%d) un-supported WebMsgType, treat as TEXT', webMsgType)
        return MessageType.Text
    }
  }

  /**
   * TODO: Test this function if it could work...
   */
  // public async forward(baseData: MsgRawObj, patchData: MsgRawObj): Promise<boolean> {
  public async messageForward(
    receiver  : Receiver,
    messageId : string,
  ): Promise<void> {

    log.silly('PuppetPuppeteer', 'forward(receiver=%s, messageId=%s)',
                                  receiver,
                                  messageId,
              )

    let rawPayload = await this.messageRawPayload(messageId)

    // rawPayload = Object.assign({}, rawPayload)

    const newMsg = <WebMessageRawPayload>{}
    const largeFileSize = 25 * 1024 * 1024
    // let ret = false
    // if you know roomId or userId, you can use `Room.load(roomId)` or `Contact.load(userId)`
    // let sendToList: Contact[] = [].concat(sendTo as any || [])
    // sendToList = sendToList.filter(s => {
    //   if ((s instanceof Room || s instanceof Contact) && s.id) {
    //     return true
    //   }
    //   return false
    // }) as Contact[]
    // if (sendToList.length < 1) {
    //   throw new Error('param must be Room or Contact and array')
    // }
    if (rawPayload.FileSize >= largeFileSize && !rawPayload.Signature) {
      // if has RawObj.Signature, can forward the 25Mb+ file
      log.warn('MediaMessage', 'forward() Due to webWx restrictions, more than 25MB of files can not be downloaded and can not be forwarded.')
      throw new Error('forward() Due to webWx restrictions, more than 25MB of files can not be downloaded and can not be forwarded.')
    }

    newMsg.FromUserName         = this.id || ''
    newMsg.isTranspond          = true
    newMsg.MsgIdBeforeTranspond = rawPayload.MsgIdBeforeTranspond || rawPayload.MsgId
    newMsg.MMSourceMsgId        = rawPayload.MsgId
    // In room msg, the content prefix sender:, need to be removed, otherwise the forwarded sender will display the source message sender, causing self () to determine the error
    newMsg.Content      = Misc.unescapeHtml(rawPayload.Content.replace(/^@\w+:<br\/>/, '')).replace(/^[\w\-]+:<br\/>/, '')
    newMsg.MMIsChatRoom = receiver.roomId ? true : false

    // The following parameters need to be overridden after calling createMessage()

    rawPayload = Object.assign(rawPayload, newMsg)
    // for (let i = 0; i < sendToList.length; i++) {
      // newMsg.ToUserName = sendToList[i].id
      // // all call success return true
      // ret = (i === 0 ? true : ret) && await config.puppetInstance().forward(m, newMsg)
    // }
    newMsg.ToUserName = receiver.contactId || receiver.roomId as string
    // ret = await config.puppetInstance().forward(m, newMsg)
    // return ret
    const baseData  = rawPayload
    const patchData = newMsg

    try {
      const ret = await this.bridge.forward(baseData, patchData)
      if (!ret) {
        throw new Error('forward failed')
      }
    } catch (e) {
      log.error('PuppetPuppeteer', 'forward() exception: %s', e.message)
      Raven.captureException(e)
      throw e
    }
  }

  public async messageSendText(
    receiver : Receiver,
    text     : string,
  ): Promise<void> {
    log.verbose('PuppetPuppeteer', 'messageSendText(receiver=%s, text=%s)', JSON.stringify(receiver), text)

    let destinationId

    if (receiver.roomId) {
      destinationId = receiver.roomId
    } else if (receiver.contactId) {
      destinationId = receiver.contactId
    } else {
      throw new Error('PuppetPuppeteer.messageSendText(): message with neither room nor to?')
    }

    log.silly('PuppetPuppeteer', 'messageSendText() destination: %s, text: %s)',
                                  destinationId,
                                  text,
              )

    try {
      await this.bridge.send(destinationId, text)
    } catch (e) {
      log.error('PuppetPuppeteer', 'messageSendText() exception: %s', e.message)
      Raven.captureException(e)
      throw e
    }
  }

  public async login(userId: string): Promise<void> {
    return super.login(userId)
  }

  /**
   * logout from browser, then server will emit `logout` event
   */
  public async logout(): Promise<void> {
    log.verbose('PuppetPuppeteer', 'logout()')

    const user = this.selfId()
    if (!user) {
      log.warn('PuppetPuppeteer', 'logout() without self()')
      return
    }

    try {
      await this.bridge.logout()
    } catch (e) {
      log.error('PuppetPuppeteer', 'logout() exception: %s', e.message)
      Raven.captureException(e)
      throw e
    } finally {
      this.id = undefined
      this.emit('logout', user)
    }
  }

  /**
   *
   * Contact
   *
   */
  public async contactRawPayload(id: string): Promise<WebContactRawPayload> {
    log.silly('PuppetPuppeteer', 'contactRawPayload(%s) @ %s', id, this)
    try {
      const rawPayload = await this.bridge.getContact(id) as WebContactRawPayload
      return rawPayload
    } catch (e) {
      log.error('PuppetPuppeteer', 'contactRawPayload(%s) exception: %s', id, e.message)
      Raven.captureException(e)
      throw e
    }

  }

  public async contactRawPayloadParser(
    rawPayload: WebContactRawPayload,
  ): Promise<ContactPayload> {
    log.silly('PuppetPuppeteer', 'contactParseRawPayload(Object.keys(payload).length=%d)',
                                    Object.keys(rawPayload).length,
                )
    if (!Object.keys(rawPayload).length) {
      log.error('PuppetPuppeteer', 'contactParseRawPayload(Object.keys(payload).length=%d)',
                                    Object.keys(rawPayload).length,
                )
      log.error('PuppetPuppeteer', 'contactParseRawPayload() got empty rawPayload!')
      throw new Error('empty raw payload')
      // return {
      //   gender: Gender.Unknown,
      //   type:   Contact.Type.Unknown,
      // }
    }

    // this.id = rawPayload.UserName   // MMActualSender??? MMPeerUserName??? `getUserContact(message.MMActualSender,message.MMPeerUserName).HeadImgUrl`
    // uin:        rawPayload.Uin,    // stable id: 4763975 || getCookie("wxuin")

    return {
      id:         rawPayload.UserName,
      weixin:     rawPayload.Alias,  // Wechat ID
      name:       Misc.plainText(rawPayload.NickName || ''),
      alias:      rawPayload.RemarkName,
      gender:     rawPayload.Sex,
      province:   rawPayload.Province,
      city:       rawPayload.City,
      signature:  rawPayload.Signature,

      address:    rawPayload.Alias, // XXX: need a stable address for user

      star:       !!rawPayload.StarFriend,
      friend:     rawPayload.stranger === undefined
                    ? undefined
                    : !rawPayload.stranger, // assign by injectio.js
      avatar:     rawPayload.HeadImgUrl,
      /**
       * @see 1. https://github.com/Chatie/webwx-app-tracker/blob/7c59d35c6ea0cff38426a4c5c912a086c4c512b2/formatted/webwxApp.js#L3243
       * @see 2. https://github.com/Urinx/WeixinBot/blob/master/README.md
       * @ignore
       */
      // tslint:disable-next-line
      type:      (!!rawPayload.UserName && !rawPayload.UserName.startsWith('@@') && !!(rawPayload.VerifyFlag & 8))
                    ? ContactType.Official
                    : ContactType.Personal,
      /**
       * @see 1. https://github.com/Chatie/webwx-app-tracker/blob/7c59d35c6ea0cff38426a4c5c912a086c4c512b2/formatted/webwxApp.js#L3246
       * @ignore
       */
      // special:       specialContactList.indexOf(rawPayload.UserName) > -1 || /@qqim$/.test(rawPayload.UserName),
    }
  }

  public async ding(data?: any): Promise<string> {
    try {
      return await this.bridge.ding(data)
    } catch (e) {
      log.warn('PuppetPuppeteer', 'ding(%s) rejected: %s', data, e.message)
      Raven.captureException(e)
      throw e
    }
  }

  public async contactAvatar(contactId: string): Promise<FileBox> {
    log.verbose('PuppetPuppeteer', 'contactAvatar(%s)', contactId)
    const payload = await this.contactPayload(contactId)
    if (!payload.avatar) {
      throw new Error('Can not get avatar: no payload.avatar!')
    }

    try {
      const hostname = await this.hostname()
      const avatarUrl = `http://${hostname}${payload.avatar}&type=big` // add '&type=big' to get big image
      const cookieList = await this.cookies()
      log.silly('PuppeteerContact', 'avatar() url: %s', avatarUrl)

      /**
       * FileBox headers (will be used in NodeJS.http.get param options)
       */
      const headers = {
        cookie: cookieList.map(c => `${c['name']}=${c['value']}`).join('; '),
      }
      // return Misc.urlStream(avatarUrl, cookies)

      // const contact = this.Contact.load(contactId)
      // await contact.ready()

      const fileName = (payload.name || 'unknown') + '-avatar.jpg'
      return FileBox.fromRemote(
        avatarUrl,
        fileName,
        headers,
      )

    } catch (err) {
      log.warn('PuppeteerContact', 'avatar() exception: %s', err.stack)
      Raven.captureException(err)
      throw err
    }
  }

  public contactAlias(contactId: string)                      : Promise<string>
  public contactAlias(contactId: string, alias: string | null): Promise<void>

  public async contactAlias(
    contactId : string,
    alias?    : string | null,
  ): Promise<string | void> {
    if (typeof alias === 'undefined') {
      throw new Error('to be implement')
    }

    try {
      const ret = await this.bridge.contactAlias(contactId, alias)
      if (!ret) {
        log.warn('PuppetPuppeteer', 'contactRemark(%s, %s) bridge.contactAlias() return false',
                              contactId, alias,
                            )
        throw new Error('bridge.contactAlias fail')
      }
    } catch (e) {
      log.warn('PuppetPuppeteer', 'contactRemark(%s, %s) rejected: %s', contactId, alias, e.message)
      Raven.captureException(e)
      throw e
    }
  }

  // private contactQueryFilterToFunctionString(
  //   query: ContactQueryFilter,
  // ): string {
  //   log.verbose('PuppetPuppeteer', 'contactQueryFilterToFunctionString({ %s })',
  //                           Object.keys(query)
  //                                 .map(k => `${k}: ${query[k as keyof ContactQueryFilter]}`)
  //                                 .join(', '),
  //             )

  //   if (Object.keys(query).length !== 1) {
  //     throw new Error('query only support one key. multi key support is not availble now.')
  //   }

  //   const filterKey = Object.keys(query)[0] as keyof ContactQueryFilter

  //   let filterValue: string | RegExp | undefined  = query[filterKey]
  //   if (!filterValue) {
  //     throw new Error('filterValue not found')
  //   }

  //   const protocolKeyMap = {
  //     name:   'NickName',
  //     alias:  'RemarkName',
  //   }

  //   const protocolFilterKey = protocolKeyMap[filterKey]
  //   if (!protocolFilterKey) {
  //     throw new Error('unsupport protocol filter key')
  //   }

  //   /**
  //    * must be string because we need inject variable value
  //    * into code as variable namespecialContactList
  //    */
  //   let filterFunction: string

  //   if (filterValue instanceof RegExp) {
  //     filterFunction = `(function (c) { return ${filterValue.toString()}.test(c.${protocolFilterKey}) })`
  //   } else if (typeof filterValue === 'string') {
  //     filterValue = filterValue.replace(/'/g, '\\\'')
  //     filterFunction = `(function (c) { return c.${protocolFilterKey} === '${filterValue}' })`
  //   } else {
  //     throw new Error('unsupport name type')
  //   }

  //   return filterFunction
  // }

  public async contactList(): Promise<string[]> {
    const idList = await this.bridge.contactList()
    return idList
  }

  // public async contactFindAll(
  //   query: ContactQueryFilter = { name: /.*/ },
  // ): Promise<string[]> {

  //   const filterFunc = this.contactQueryFilterToFunctionString(query)

  //   try {
  //     const idList = await this.bridge.contactFind(filterFunc)
  //     return idList
  //   } catch (e) {
  //     log.warn('PuppetPuppeteer', 'contactFind(%s) rejected: %s', filterFunc, e.message)
  //     Raven.captureException(e)
  //     throw e
  //   }
  // }

  /**
   *
   * Room
   *
   */
  public async roomRawPayload(id: string): Promise<WebRoomRawPayload> {
    log.verbose('PuppetPuppeteer', 'roomRawPayload(%s)', id)

    try {
      let rawPayload: WebRoomRawPayload | undefined  // = await this.bridge.getContact(room.id) as PuppeteerRoomRawPayload

      // let currNum = rawPayload.MemberList && rawPayload.MemberList.length || 0
      // let prevNum = room.memberList().length  // rawPayload && rawPayload.MemberList && this.rawObj.MemberList.length || 0

      let prevLength = 0

      /**
       * @todo use Misc.retry() to replace the following loop
       */
      let ttl = 7
      while (ttl--/* && currNum !== prevNum */) {
        rawPayload = await this.bridge.getContact(id) as undefined | WebRoomRawPayload

        if (rawPayload) {
          const currLength = rawPayload.MemberList && rawPayload.MemberList.length || -1

          log.silly('PuppetPuppeteer', `roomPayload() this.bridge.getContact(%s) MemberList.length:(prev:%d, curr:%d) at ttl:%d`,
            id,
            prevLength,
            currLength,
            ttl,
          )

          if (prevLength === currLength) {
            log.silly('PuppetPuppeteer', `roomPayload() puppet.getContact(%s) done at ttl:%d with length:%d`, this.id, ttl, currLength)
            return rawPayload
          }
          if (currLength >= prevLength) {
            prevLength = currLength
          } else {
            log.warn('PuppetPuppeteer', 'roomRawPayload() currLength(%d) <= prevLength(%d) ???',
                                        currLength,
                                        prevLength,
                    )
          }
        }

        log.silly('PuppetPuppeteer', `roomPayload() puppet.getContact(${id}) retry at ttl:%d`, ttl)
        await new Promise(r => setTimeout(r, 1000)) // wait for 1 second
      }

      throw new Error('no payload')

    } catch (e) {
      log.error('PuppetPuppeteer', 'roomRawPayload(%s) exception: %s', id, e.message)
      Raven.captureException(e)
      throw e
    }
  }

  public async roomRawPayloadParser(
    rawPayload: WebRoomRawPayload,
  ): Promise<RoomPayload> {
    log.verbose('PuppetPuppeteer', 'roomRawPayloadParser(%s)', rawPayload)

    // const payload = await this.roomPayload(rawPayload.UserName)

    // console.log(rawPayload)
    // const memberList = (rawPayload.MemberList || [])
    //                     .map(m => this.Contact.load(m.UserName))
    // await Promise.all(memberList.map(c => c.ready()))

    const id            = rawPayload.UserName
    const rawMemberList = rawPayload.MemberList || []
    const memberIdList  = rawMemberList.map(rawMember => rawMember.UserName)

    // const nameMap         = await this.roomParseMap('name'        , rawPayload.MemberList)
    // const roomAliasMap    = await this.roomParseMap('roomAlias'   , rawPayload.MemberList)
    // const contactAliasMap = await this.roomParseMap('contactAlias', rawPayload.MemberList)

    const aliasDict = {} as { [id: string]: string | undefined }

    if (Array.isArray(rawPayload.MemberList)) {
      rawPayload.MemberList.forEach(rawMember => {
        aliasDict[rawMember.UserName] = rawMember.DisplayName
      })
      // const memberListPayload = await Promise.all(
      //   rawPayload.MemberList
      //     .map(rawMember => rawMember.UserName)
      //     .map(contactId => this.contactPayload(contactId)),
      // )
      // console.log(memberListPayload)
      // memberListPayload.forEach(payload => aliasDict[payload.id] = payload.alias)
      // console.log(aliasDict)
    }

    const roomPayload: RoomPayload = {
      id,
      topic:      Misc.plainText(rawPayload.NickName || ''),
      memberIdList,
      aliasDict,
      // nameMap,
      // roomAliasMap,
      // contactAliasMap,
    }
    // console.log(roomPayload)
    return roomPayload
  }

  // private async roomParseMap(
  //   parseSection   : keyof RoomMemberQueryFilter,
  //   rawMemberList? : WebRoomRawMember[],
  // ): Promise<{ string, string }> {
  //   log.verbose('PuppetPuppeteer', 'roomParseMap(%s, rawMemberList.length=%d)',
  //                                   parseSection,
  //                                   rawMemberList && rawMemberList.length,
  //               )

  //   const dict: Map<string, string> = new Map<string, string>()

  //   const updateMember = async (member: WebRoomRawMember) => {
  //     let tmpName: string
  //     // console.log(member)
  //     const payload = await this.contactPayload(member.UserName)
  //     // contact.ready().then(() => console.log('###############', contact.name()))
  //     // console.log(contact)
  //     // log.silly('PuppetPuppeteer', 'roomParseMap() memberList.forEach(contact=%s)', contact)

  //     switch (parseSection) {
  //       case 'name':
  //         tmpName = payload.name || ''
  //         break
  //       case 'roomAlias':
  //         tmpName = member.DisplayName
  //         break
  //       case 'contactAlias':
  //         tmpName = payload.alias || ''
  //         break
  //       default:
  //         throw new Error('parseMap failed, member not found')
  //     }
  //     /**
  //      * ISSUE #64 emoji need to be striped
  //      * ISSUE #104 never use remark name because sys group message will never use that
  //      * @rui: Wrong for 'never use remark name because sys group message will never use that', see more in the latest comment in #104
  //      * @rui: webwx's NickName here return contactAlias, if not set contactAlias, return name
  //      * @rui: 2017-7-2 webwx's NickName just ruturn name, no contactAlias
  //      */
  //     dict.set(member.UserName, Misc.stripEmoji(tmpName))
  //   }
  //   if (Array.isArray(rawMemberList)) {
  //     await Promise.all(rawMemberList.map(updateMember))
  //   }
  //   return dict
  // }

  public async roomList(): Promise<string[]> {
    log.verbose('PuppetPupppeteer', 'roomList()')

    const idList = await this.bridge.roomList()
    return idList
  }

  // public async roomFindAll(
  //   query: RoomQueryFilter = { topic: /.*/ },
  // ): Promise<string[]> {

  //   let topicFilter = query.topic

  //   if (!topicFilter) {
  //     throw new Error('topicFilter not found')
  //   }

  //   let filterFunction: string

  //   if (topicFilter instanceof RegExp) {
  //     filterFunction = `(function (c) { return ${topicFilter.toString()}.test(c) })`
  //   } else if (typeof topicFilter === 'string') {
  //     topicFilter = topicFilter.replace(/'/g, '\\\'')
  //     filterFunction = `(function (c) { return c === '${topicFilter}' })`
  //   } else {
  //     throw new Error('unsupport topic type')
  //   }

  //   try {
  //     const idList = await this.bridge.roomFind(filterFunction)
  //     return idList
  //   } catch (e) {
  //     log.warn('PuppetPuppeteer', 'roomFind(%s) rejected: %s', filterFunction, e.message)
  //     Raven.captureException(e)
  //     throw e
  //   }
  // }

  public async roomDel(
    roomId    : string,
    contactId : string,
  ): Promise<void> {
    try {
      await this.bridge.roomDelMember(roomId, contactId)
    } catch (e) {
      log.warn('PuppetPuppeteer', 'roomDelMember(%s, %d) rejected: %s', roomId, contactId, e.message)
      Raven.captureException(e)
      throw e
    }
  }

  public async roomAvatar(roomId: string): Promise<FileBox> {
    log.verbose('PuppetPuppeteer', 'roomAvatar(%s)', roomId)

    const payload = await this.roomPayload(roomId)

    if (payload.avatar) {
      return FileBox.fromUrl(payload.avatar)
    }
    log.warn('PuppetPuppeteer', 'roomAvatar() avatar not found, use the chatie default.')
    return qrCodeForChatie()
  }

  public async roomAdd(
    roomId    : string,
    contactId : string,
  ): Promise<void> {
    try {
      await this.bridge.roomAddMember(roomId, contactId)
    } catch (e) {
      log.warn('PuppetPuppeteer', 'roomAddMember(%s) rejected: %s', contactId, e.message)
      Raven.captureException(e)
      throw e
    }
  }

  public async roomTopic(
    roomId : string,
    topic  : string,
  ): Promise<string> {
    try {
      return await this.bridge.roomModTopic(roomId, topic)
    } catch (e) {
      log.warn('PuppetPuppeteer', 'roomTopic(%s) rejected: %s', topic, e.message)
      Raven.captureException(e)
      throw e
    }
  }

  public async roomCreate(
    contactIdList : string[],
    topic         : string,
  ): Promise<string> {
    try {
      const roomId = await this.bridge.roomCreate(contactIdList, topic)
      if (!roomId) {
        throw new Error('PuppetPuppeteer.roomCreate() roomId "' + roomId + '" not found')
      }
      return roomId

    } catch (e) {
      log.warn('PuppetPuppeteer', 'roomCreate(%s, %s) rejected: %s', contactIdList.join(','), topic, e.message)
      Raven.captureException(e)
      throw e
    }
  }

  public async roomQuit(roomId: string): Promise<void> {
    log.warn('PuppetPuppeteer', 'roomQuit(%s) not supported by Web API', roomId)
  }

  /**
   *
   * FriendRequest
   *
   */
  public async friendRequestRawPayload(id: string): Promise<WebMessageRawPayload> {
    log.warn('PuppetPuppeteer', 'friendRequestRawPayload(%s)', id)

    const rawPayload = await this.bridge.getMessage(id)
    if (!rawPayload) {
      throw new Error('no rawPayload')
    }
    return rawPayload
  }

  public async friendRequestRawPayloadParser(rawPayload: WebMessageRawPayload): Promise<FriendRequestPayload> {
    log.warn('PuppetPuppeteer', 'friendRequestRawPayloadParser(%s)', rawPayload)

    switch (rawPayload.MsgType) {
      case WebMessageType.VERIFYMSG:
        if (!rawPayload.RecommendInfo) {
          throw new Error('no RecommendInfo')
        }
        const recommendInfo: WebRecomendInfo = rawPayload.RecommendInfo

        if (!recommendInfo) {
          throw new Error('no recommendInfo')
        }

        const payloadReceive: FriendRequestPayloadReceive = {
          id        : rawPayload.MsgId,
          contactId : recommendInfo.UserName,
          hello     : recommendInfo.Content,
          ticket    : recommendInfo.Ticket,
          type      : FriendRequestType.Receive,
        }
        return payloadReceive

      case WebMessageType.SYS:
        const payloadConfirm: FriendRequestPayloadConfirm = {
          id        : rawPayload.MsgId,
          contactId : rawPayload.FromUserName,
          type      : FriendRequestType.Confirm,
        }
        return payloadConfirm
      default:
        throw new Error('not supported friend request message raw payload')
    }
  }

  public async friendRequestSend(
    contactId : string,
    hello     : string,
  ): Promise<void> {
    try {
      await this.bridge.verifyUserRequest(contactId, hello)
    } catch (e) {
      log.warn('PuppetPuppeteer', 'bridge.verifyUserRequest(%s, %s) rejected: %s', contactId, hello, e.message)
      Raven.captureException(e)
      throw e
    }
  }

  public async friendRequestAccept(
    contactId : string,
    ticket    : string,
  ): Promise<void> {
    try {
      await this.bridge.verifyUserOk(contactId, ticket)
    } catch (e) {
      log.warn('PuppetPuppeteer', 'bridge.verifyUserOk(%s, %s) rejected: %s', contactId, ticket, e.message)
      Raven.captureException(e)
      throw e
    }
  }

  /**
   * @private
   * For issue #668
   */
  public async waitStable(): Promise<void> {
    log.verbose('PuppetPuppeteer', 'readyStable()')

    let   prevLength = -1
    let   ttl        = 60
    const sleepTime  = 60 * 1000 / ttl

    while (ttl-- > 0) {
      const contactIdList = await this.contactList()
      if (prevLength === contactIdList.length) {
        log.verbose('PuppetPuppeteer', 'readyStable() stable() READY length=%d', prevLength)
        return
      }
      prevLength = contactIdList.length

      await new Promise(r => setTimeout(r, sleepTime))
    }

    log.warn('PuppetPuppeteer', 'readyStable() TTL expired. Final length=%d', prevLength)
  }

  /**
   * https://www.chatie.io:8080/api
   * location.hostname = www.chatie.io
   * location.host = www.chatie.io:8080
   * See: https://stackoverflow.com/a/11379802/1123955
   */
  private async hostname(): Promise<string> {
    try {
      const name = await this.bridge.hostname()
      if (!name) {
        throw new Error('no hostname found')
      }
      return name
    } catch (e) {
      log.error('PuppetPuppeteer', 'hostname() exception:%s', e)
      this.emit('error', e)
      throw e
    }
  }

  private async cookies(): Promise<Cookie[]> {
    return await this.bridge.cookies()
  }

  public async saveCookie(): Promise<void> {
    const cookieList = await this.bridge.cookies()
    this.options.memory.set('cookies', cookieList)
    this.options.memory.save()
  }

  private extToType(ext: string): WebMessageType {
    switch (ext) {
      case '.bmp':
      case '.jpeg':
      case '.jpg':
      case '.png':
        return WebMessageType.IMAGE
      case '.gif':
        return WebMessageType.EMOTICON
      case '.mp4':
        return WebMessageType.VIDEO
      default:
        return WebMessageType.APP
    }
  }

  // public async readyMedia(): Promise<this> {
  private async messageRawPayloadToUrl(
    rawPayload: WebMessageRawPayload,
  ): Promise<null | string> {
    log.silly('PuppetPuppeteer', 'readyMedia()')

    // let type = MessageType.Unknown
    let url: undefined | string

    try {

      switch (rawPayload.MsgType) {
        case WebMessageType.EMOTICON:
          // type = MessageType.Emoticon
          url = await this.bridge.getMsgEmoticon(rawPayload.MsgId)
          break
        case WebMessageType.IMAGE:
          // type = MessageType.Image
          url = await this.bridge.getMsgImg(rawPayload.MsgId)
          break
        case WebMessageType.VIDEO:
        case WebMessageType.MICROVIDEO:
          // type = MessageType.Video
          url = await this.bridge.getMsgVideo(rawPayload.MsgId)
          break
        case WebMessageType.VOICE:
          // type = MessageType.Audio
          url = await this.bridge.getMsgVoice(rawPayload.MsgId)
          break

        case WebMessageType.APP:
          switch (rawPayload.AppMsgType) {
            case WebAppMsgType.ATTACH:
              if (!rawPayload.MMAppMsgDownloadUrl) {
                throw new Error('no MMAppMsgDownloadUrl')
              }
              // had set in Message
              // type = MessageType.Attachment
              url = rawPayload.MMAppMsgDownloadUrl
              break

            case WebAppMsgType.URL:
            case WebAppMsgType.READER_TYPE:
              if (!rawPayload.Url) {
                throw new Error('no Url')
              }
              // had set in Message
              // type = MessageType.Attachment
              url = rawPayload.Url
              break

            default:
              const e = new Error('ready() unsupported typeApp(): ' + rawPayload.AppMsgType)
              log.warn('PuppeteerMessage', e.message)
              throw e
          }
          break

        case WebMessageType.TEXT:
          if (rawPayload.SubMsgType === WebMessageType.LOCATION) {
            // type = MessageType.Image
            url = await this.bridge.getMsgPublicLinkImg(rawPayload.MsgId)
          }
          break

        default:
          /**
           * not a support media message, do nothing.
           */
          return null
          // return this
      }

      if (!url) {
        // if (!this.payload.url) {
        //   /**
        //    * not a support media message, do nothing.
        //    */
        //   return this
        // }
        // url = this.payload.url
        // return {
        //   type: MessageType.Unknown,
        // }
        return null
      }

    } catch (e) {
      log.warn('PuppetPuppeteer', 'ready() exception: %s', e.message)
      Raven.captureException(e)
      throw e
    }

    return url

  }

  private filename(
    rawPayload: WebMessageRawPayload,
  ): string {
    log.verbose('PuppetPuppeteer', 'filename()')

    let filename = rawPayload.FileName || rawPayload.MediaId || rawPayload.MsgId

    const re = /\.[a-z0-9]{1,7}$/i
    if (!re.test(filename)) {
      if (rawPayload.MMAppMsgFileExt) {
        filename += '.' + rawPayload.MMAppMsgFileExt
      } else {
        filename += this.extname(rawPayload)
      }
    }

    log.silly('PuppetPuppeteer', 'filename()=%s, build from rawPayload', filename)
    return filename
  }

  private extname(
    rawPayload: WebMessageRawPayload,
  ): string {
    let ext: string

    // const type = this.type()

    switch (rawPayload.MsgType) {
      case WebMessageType.EMOTICON:
        ext = '.gif'
        break

      case WebMessageType.IMAGE:
        ext = '.jpg'
        break

      case WebMessageType.VIDEO:
      case WebMessageType.MICROVIDEO:
        ext = '.mp4'
        break

      case WebMessageType.VOICE:
        ext = '.mp3'
        break

      case WebMessageType.APP:
        switch (rawPayload.AppMsgType) {
          case WebAppMsgType.URL:
            ext = '.url' // XXX
            break
          default:
            ext = '.' + rawPayload.MsgType
            break
        }
        break

      case WebMessageType.TEXT:
        if (rawPayload.SubMsgType === WebMessageType.LOCATION) {
          ext = '.jpg'
        }
        ext = '.' + rawPayload.MsgType

        break

      default:
        log.silly('PuppeteerMessage', `ext() got unknown type: ${rawPayload.MsgType}`)
        ext = '.' + rawPayload.MsgType
    }

    return ext

  }

  private async uploadMedia(
    file       : FileBox,
    toUserName : string,
  ): Promise<WebMessageMediaPayload> {
    const filename = file.name
    const ext      = path.extname(filename) //  message.ext()

    // const contentType = Misc.mime(ext)
    const contentType = mime.getType(ext)
    // const contentType = message.mimeType()
    if (!contentType) {
      throw new Error('no MIME Type found on mediaMessage: ' + file.name)
    }
    let mediatype: WebMediaType

    switch (ext) {
      case '.bmp':
      case '.jpeg':
      case '.jpg':
      case '.png':
      case '.gif':
        mediatype = WebMediaType.Image
        break
      case '.mp4':
        mediatype = WebMediaType.Video
        break
      default:
        mediatype = WebMediaType.Attachment
    }

    const buffer = await new Promise<Buffer>((resolve, reject) => {
      file.pipe(bl((err: Error, data: Buffer) => {
        if (err) reject(err)
        else resolve(data)
      }))
    })

    // Sending video files is not allowed to exceed 20MB
    // https://github.com/Chatie/webwx-app-tracker/blob/7c59d35c6ea0cff38426a4c5c912a086c4c512b2/formatted/webwxApp.js#L1115
    const MAX_FILE_SIZE   = 100 * 1024 * 1024
    const LARGE_FILE_SIZE = 25 * 1024 * 1024
    const MAX_VIDEO_SIZE  = 20 * 1024 * 1024

    if (mediatype === WebMediaType.Video && buffer.length > MAX_VIDEO_SIZE)
      throw new Error(`Sending video files is not allowed to exceed ${MAX_VIDEO_SIZE / 1024 / 1024}MB`)
    if (buffer.length > MAX_FILE_SIZE) {
      throw new Error(`Sending files is not allowed to exceed ${MAX_FILE_SIZE / 1024 / 1024}MB`)
    }

    const md5 = Misc.md5(buffer)

    const baseRequest     = await this.getBaseRequest()
    const passTicket      = await this.bridge.getPassticket()
    const uploadMediaUrl  = await this.bridge.getUploadMediaUrl()
    const checkUploadUrl  = await this.bridge.getCheckUploadUrl()
    const cookie          = await this.bridge.cookies()
    const first           = cookie.find(c => c.name === 'webwx_data_ticket')
    const webwxDataTicket = first && first.value
    const size            = buffer.length
    const fromUserName    = this.selfId()
    const id              = 'WU_FILE_' + this.fileId
    this.fileId++

    const hostname = await this.bridge.hostname()
    const headers = {
      Referer: `https://${hostname}`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36',
      Cookie: cookie.map(c => c.name + '=' + c.value).join('; '),
    }

    log.silly('PuppetPuppeteer', 'uploadMedia() headers:%s', JSON.stringify(headers))

    const uploadMediaRequest = {
      BaseRequest:   baseRequest,
      FileMd5:       md5,
      FromUserName:  fromUserName,
      ToUserName:    toUserName,
      UploadType:    2,
      ClientMediaId: +new Date,
      MediaType:     WebMediaType.Attachment,
      StartPos:      0,
      DataLen:       size,
      TotalLen:      size,
      Signature:     '',
      AESKey:        '',
    }

    const checkData = {
      BaseRequest:  baseRequest,
      FromUserName: fromUserName,
      ToUserName:   toUserName,
      FileName:     filename,
      FileSize:     size,
      FileMd5:      md5,
      FileType:     7,              // If do not have this parameter, the api will fail
    }

    const mediaData = {
      ToUserName: toUserName,
      MediaId:    '',
      FileName:   filename,
      FileSize:   size,
      FileMd5:    md5,
      MMFileExt:  ext,
    } as WebMessageMediaPayload

    // If file size > 25M, must first call checkUpload to get Signature and AESKey, otherwise it will fail to upload
    // https://github.com/Chatie/webwx-app-tracker/blob/7c59d35c6ea0cff38426a4c5c912a086c4c512b2/formatted/webwxApp.js#L1132 #1182
    if (size > LARGE_FILE_SIZE) {
      let ret
      try {
        ret = <any> await new Promise((resolve, reject) => {
          const r = {
            url: `https://${hostname}${checkUploadUrl}`,
            headers,
            json: checkData,
          }
          request.post(r, (err, _ /* res */, body) => {
            try {
              if (err) {
                reject(err)
              } else {
                let obj = body
                if (typeof body !== 'object') {
                  log.silly('PuppetPuppeteer', 'updateMedia() typeof body = %s', typeof body)
                  try {
                    obj = JSON.parse(body)
                  } catch (e) {
                    log.error('PuppetPuppeteer', 'updateMedia() body = %s', body)
                    log.error('PuppetPuppeteer', 'updateMedia() exception: %s', e)
                    this.emit('error', e)
                  }
                }
                if (typeof obj !== 'object' || obj.BaseResponse.Ret !== 0) {
                  const errMsg = obj.BaseResponse || 'api return err'
                  log.silly('PuppetPuppeteer', 'uploadMedia() checkUpload err:%s \nreq:%s\nret:%s', JSON.stringify(errMsg), JSON.stringify(r), body)
                  reject(new Error('chackUpload err:' + JSON.stringify(errMsg)))
                }
                resolve({
                  Signature : obj.Signature,
                  AESKey    : obj.AESKey,
                })
              }
            } catch (e) {
              reject(e)
            }
          })
        })
      } catch (e) {
        log.error('PuppetPuppeteer', 'uploadMedia() checkUpload exception: %s', e.message)
        throw e
      }
      if (!ret.Signature) {
        log.error('PuppetPuppeteer', 'uploadMedia(): chackUpload failed to get Signature')
        throw new Error('chackUpload failed to get Signature')
      }
      uploadMediaRequest.Signature = ret.Signature
      uploadMediaRequest.AESKey    = ret.AESKey
      mediaData.Signature          = ret.Signature
    } else {
      delete uploadMediaRequest.Signature
      delete uploadMediaRequest.AESKey
    }

    log.verbose('PuppetPuppeteer', 'uploadMedia() webwx_data_ticket: %s', webwxDataTicket)
    log.verbose('PuppetPuppeteer', 'uploadMedia() pass_ticket: %s', passTicket)

    const formData = {
      id,
      name: filename,
      type: contentType,
      lastModifiedDate: Date().toString(),
      size,
      mediatype,
      uploadmediarequest: JSON.stringify(uploadMediaRequest),
      webwx_data_ticket: webwxDataTicket,
      pass_ticket: passTicket || '',
      filename: {
        value: buffer,
        options: {
          filename,
          contentType,
          size,
        },
      },
    }
    let mediaId: string
    try {
      mediaId = <string>await new Promise((resolve, reject) => {
        try {
          request.post({
            url: uploadMediaUrl + '?f=json',
            headers,
            formData,
          }, function (err, _, body) {
            if (err) { reject(err) }
            else {
              let obj = body
              if (typeof body !== 'object') {
                obj = JSON.parse(body)
              }
              resolve(obj.MediaId || '')
            }
          })
        } catch (e) {
          reject(e)
        }
      })
    } catch (e) {
      log.error('PuppetPuppeteer', 'uploadMedia() uploadMedia exception: %s', e.message)
      throw new Error('uploadMedia err: ' + e.message)
    }
    if (!mediaId) {
      log.error('PuppetPuppeteer', 'uploadMedia(): upload fail')
      throw new Error('PuppetPuppeteer.uploadMedia(): upload fail')
    }
    return Object.assign(mediaData, { MediaId: mediaId })
  }

  public async messageSendFile(
    receiver : Receiver,
    file     : FileBox,
  ): Promise<void> {
    log.verbose('PuppetPuppeteer', 'messageSendFile(receiver=%s, file=%s)',
                                    JSON.stringify(receiver),
                                    file.toString(),
                )

    let destinationId

    if (receiver.roomId) {
      destinationId = receiver.roomId
    } else if (receiver.contactId) {
      destinationId = receiver.contactId
    } else {
      throw new Error('PuppetPuppeteer.messageSendFile(): message with neither room nor to?')
    }

    let mediaData: WebMessageMediaPayload
    let rawPayload = {} as WebMessageRawPayload

    if (!rawPayload || !rawPayload.MediaId) {
      try {
        mediaData = await this.uploadMedia(file, destinationId)
        rawPayload = Object.assign(rawPayload, mediaData)
        log.silly('PuppetPuppeteer', 'Upload completed, new rawObj:%s', JSON.stringify(rawPayload))
      } catch (e) {
        log.error('PuppetPuppeteer', 'sendMedia() exception: %s', e.message)
        throw e
      }
    } else {
      // To support forward file
      log.silly('PuppetPuppeteer', 'skip upload file, rawObj:%s', JSON.stringify(rawPayload))
      mediaData = {
        ToUserName : destinationId,
        MediaId    : rawPayload.MediaId,
        MsgType    : rawPayload.MsgType,
        FileName   : rawPayload.FileName,
        FileSize   : rawPayload.FileSize,
        MMFileExt  : rawPayload.MMFileExt,
      }
      if (rawPayload.Signature) {
        mediaData.Signature = rawPayload.Signature
      }
    }
    // console.log('mediaData.MsgType', mediaData.MsgType)
    // console.log('rawObj.MsgType', message.rawObj && message.rawObj.MsgType)

    mediaData.MsgType = this.extToType(path.extname(file.name))
    log.silly('PuppetPuppeteer', 'sendMedia() destination: %s, mediaId: %s, MsgType; %s)',
      destinationId,
      mediaData.MediaId,
      mediaData.MsgType,
    )
    let ret = false
    try {
      ret = await this.bridge.sendMedia(mediaData)
    } catch (e) {
      log.error('PuppetPuppeteer', 'sendMedia() exception: %s', e.message)
      Raven.captureException(e)
      throw e
    }
    if (!ret) {
      throw new Error('sendMedia fail')
    }
  }

  private async getBaseRequest(): Promise<any> {
    try {
      const json = await this.bridge.getBaseRequest()
      const obj = JSON.parse(json)
      return obj.BaseRequest
    } catch (e) {
      log.error('PuppetPuppeteer', 'send() exception: %s', e.message)
      Raven.captureException(e)
      throw e
    }
  }

}

export default PuppetPuppeteer
