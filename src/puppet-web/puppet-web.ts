/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   @copyright 2016-2017 Huan LI <zixia@zixia.net>
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
import {
  config,
  HeadName,
  log,
  Raven,
  ScanInfo,
  WatchdogFood,
}                     from '../config'

import Contact        from '../contact'
import {
  Message,
  MediaMessage,
  MsgRawObj,
 }                    from '../message'
import {
  Puppet,
}                     from '../puppet'
import Room           from '../room'
import UtilLib        from '../util-lib'

import {
  Bridge,
  MediaData,
}                     from './bridge'
import Browser        from './browser'
import Event          from './event'
import Server         from './server'
import Watchdog       from './watchdog'

import * as request from 'request'
import * as bl from 'bl'

type MediaType = 'pic' | 'video' | 'doc'

const enum UploadMediaType {
  IMAGE      = 1,
  VIDEO      = 2,
  AUDIO      = 3,
  ATTACHMENT = 4,
}
export interface PuppetWebSetting {
  head?:    HeadName,
  profile?: string,
}
const DEFAULT_PUPPET_PORT = 18788 // W(87) X(88), ascii char code ;-]

export class PuppetWeb extends Puppet {

  public browser: Browser
  public bridge:  Bridge
  public server:  Server

  public scan: ScanInfo | null
  private port: number
  private fileId: number

  public lastScanEventTime: number
  public watchDogLastSaveSession: number
  public watchDogTimer: NodeJS.Timer | null
  public watchDogTimerTime: number

  constructor(public setting: PuppetWebSetting = {}) {
    super()
    this.fileId = 0

    if (!setting.head) {
      setting.head = config.head
    }
    this.on('watchdog', Watchdog.onFeed.bind(this))
  }

  public toString() { return `Class PuppetWeb({browser:${this.browser},port:${this.port}})` }

  public async init(): Promise<void> {
    log.verbose('PuppetWeb', `init() with head:${this.setting.head}, profile:${this.setting.profile}`)

    this.state.target('live')
    this.state.current('live', false)

    try {

      this.port = await UtilLib.getPort(DEFAULT_PUPPET_PORT)
      log.verbose('PuppetWeb', 'init() getPort %d', this.port)

      await this.initServer()
      log.verbose('PuppetWeb', 'initServer() done')

      this.browser = await this.initBrowser()
      log.verbose('PuppetWeb', 'initBrowser() done')

      try {
        this.bridge = await this.initBridge()
      } catch (e) {
        log.verbose('PuppetWeb', 'init() this.initBridge() exception: %s', e.message)

        const blockedMessage = await this.bridge.blockedMessageBody()
                            || await this.bridge.blockedMessageAlert()
        if (blockedMessage) {
          const error = new Error(blockedMessage)
          this.emit('error', error)
        }
        throw e
      }
      log.verbose('PuppetWeb', 'initBridge() done')

      const clicked = await this.browser.clickSwitchAccount()
      if (clicked) {
        log.verbose('PuppetWeb', 'init() bridge.clickSwitchAccount() clicked')
      }

      /**
       *  state must set to `live`
       *  before feed Watchdog
       */
      this.state.current('live')

      const food: WatchdogFood = {
        data: 'inited',
        timeout: 2 * 60 * 1000, // 2 mins for first login
      }
      this.emit('watchdog', food)

      log.verbose('PuppetWeb', 'init() done')
      return

    } catch (e) {
      log.error('PuppetWeb', 'init() exception: %s', e.stack)
      this.emit('error', e)
      await this.quit()
      this.state.target('dead')
      Raven.captureException(e)
      throw e
    }
  }

  public async quit(): Promise<void> {
    log.verbose('PuppetWeb', 'quit() state target(%s) current(%s) stable(%s)',
                             this.state.target(),
                             this.state.current(),
                             this.state.stable(),
    )

    if (this.state.current() === 'dead') {
      if (this.state.inprocess()) {
        const e = new Error('quit() is called on a `dead` `inprocess()` browser')
        log.warn('PuppetWeb', e.message)
        throw e
      } else {
        log.warn('PuppetWeb', 'quit() is called on a `dead` browser. return directly.')
        return
      }
    }

    /**
     * must feed POISON to Watchdog
     * before state set to `dead` & `inprocess`
     */
    log.verbose('PuppetWeb', 'quit() kill watchdog before do quit')
    const food: WatchdogFood = {
      data: 'PuppetWeb.quit()',
      type: 'POISON',
    }
    this.emit('watchdog', food)

    this.state.target('dead')
    this.state.current('dead', false)

    try {

      await new Promise(async (resolve, reject) => {
        const timer = setTimeout(() => {
          const e = new Error('quit() Promise() timeout')
          log.warn('PuppetWeb', e.message)
          reject(e)
        }, 120 * 1000)

        if (this.bridge) {
          await this.bridge.quit()
                          .catch(e => { // fail safe
                            log.warn('PuppetWeb', 'quit() bridge.quit() exception: %s', e.message)
                            Raven.captureException(e)
                          })
          log.verbose('PuppetWeb', 'quit() bridge.quit() done')
        } else {
          log.warn('PuppetWeb', 'quit() no this.bridge')
        }

        if (this.server) {
          await this.server.quit()
                          .catch(e => { // fail safe
                            log.warn('PuppetWeb', 'quit() server.quit() exception: %s', e.message)
                            Raven.captureException(e)
                          })
          log.verbose('PuppetWeb', 'quit() server.quit() done')
        } else {
          log.warn('PuppetWeb', 'quit() no this.server')
        }

        if (this.browser) {
          await this.browser.quit()
                    .catch(e => { // fail safe
                      log.warn('PuppetWeb', 'quit() browser.quit() exception: %s', e.message)
                      Raven.captureException(e)
                    })
          log.verbose('PuppetWeb', 'quit() browser.quit() done')
        } else {
          log.warn('PuppetWeb', 'quit() no this.browser')
        }

        clearTimeout(timer)
        resolve()
        return

      })

      return

    } catch (e) {
      log.error('PuppetWeb', 'quit() exception: %s', e.message)
      Raven.captureException(e)
      throw e
    } finally {

      this.state.current('dead')

    }
  }

  public async initBrowser(): Promise<Browser> {
    log.verbose('PuppetWeb', 'initBrowser()')

    const browser = new Browser({
      head:         <HeadName>this.setting.head,
      sessionFile:  this.setting.profile,
    })

    browser.on('dead', Event.onBrowserDead.bind(this))

    if (this.state.target() === 'dead') {
      const e = new Error('found state.target()) != live, no init anymore')
      log.warn('PuppetWeb', 'initBrowser() %s', e.message)
      throw e
    }

    try {
      await browser.init()
    } catch (e) {
      log.error('PuppetWeb', 'initBrowser() exception: %s', e.message)
      Raven.captureException(e)
      throw e
    }
    return browser
  }

  public async initBridge(): Promise<Bridge> {
    log.verbose('PuppetWeb', 'initBridge()')

    const bridge = new Bridge(
      this, // use puppet instead of browser, is because browser might change(die) duaring run time,
      this.port,
    )

    if (this.state.target() === 'dead') {
      const e = new Error('initBridge() found targetState != live, no init anymore')
      log.warn('PuppetWeb', e.message)
      throw e
    }

    try {
      await bridge.init()
    } catch (e) {
      Raven.captureException(e)
      if (!this.browser) {
        log.warn('PuppetWeb', 'initBridge() without browser?')
      } else if (this.browser.dead()) {
        // XXX should make here simple: why this.browser.dead() then exception will not throw?
        log.warn('PuppetWeb', 'initBridge() found browser dead, wait it to restore')
      } else {
        log.error('PuppetWeb', 'initBridge() exception: %s', e.message)
        throw e
      }
    }
    return bridge
  }

  private async initServer(): Promise<void> {
    log.verbose('PuppetWeb', 'initServer()')
    this.server = new Server(this.port)

    /**
     * @depreciated 20160825 zixia
     *
     * when `unload` there should always be a `disconnect` event?
     */
    // server.on('unload'  , Event.onServerUnload.bind(this))

    this.server.on('connection' , Event.onServerConnection.bind(this))
    this.server.on('ding'       , Event.onServerDing.bind(this))
    this.server.on('disconnect' , Event.onServerDisconnect.bind(this))
    this.server.on('log'        , Event.onServerLog.bind(this))
    this.server.on('login'      , Event.onServerLogin.bind(this))
    this.server.on('logout'     , Event.onServerLogout.bind(this))
    this.server.on('message'    , Event.onServerMessage.bind(this))
    this.server.on('scan'       , Event.onServerScan.bind(this))

    if (this.state.target() === 'dead') {
      const e = new Error('initServer() found state.target() != live, no init anymore')
      log.warn('PuppetWeb', e.message)
      throw e
    }

    try {
      await this.server.init()
    } catch (e) {
      log.error('PuppetWeb', 'initServer() exception: %s', e.message)
      Raven.captureException(e)
      throw e
    }
    return
  }

  public reset(reason?: string): void {
    log.verbose('PuppetWeb', 'reset(%s)', reason)

    if (this.browser) {
      this.browser.dead('restart required by reset()')
    } else {
      log.warn('PuppetWeb', 'reset() without browser')
    }
  }

  public logined(): boolean { return !!(this.user) }

  /**
   * get self contact
   */
  public self(): Contact {
    log.verbose('PuppetWeb', 'self()')

    if (this.user) {
      return this.user
    }
    throw new Error('PuppetWeb.self() no this.user')
  }

  private async getBaseRequest(): Promise<any> {
    try {
      const json = await this.bridge.getBaseRequest();
      const obj = JSON.parse(json)
      return obj.BaseRequest
    } catch (e) {
      log.error('PuppetWeb', 'send() exception: %s', e.message)
      Raven.captureException(e)
      throw e
    }
  }

  private async uploadMedia(mediaMessage: MediaMessage, toUserName: string): Promise<MediaData> {
    if (!mediaMessage)
      throw new Error('require mediaMessage')

    const filename = mediaMessage.filename()
    const ext = mediaMessage.ext()

    const contentType = UtilLib.mime(ext)
    let mediatype: MediaType

    switch (ext) {
      case 'bmp':
      case 'jpeg':
      case 'jpg':
      case 'png':
      case 'gif':
        mediatype = 'pic'
        break
      case 'mp4':
        mediatype = 'video'
        break
      default:
        mediatype = 'doc'
    }

    const readStream = await mediaMessage.readyStream()
    const buffer = <Buffer>await new Promise((resolve, reject) => {
      readStream.pipe(bl((err, data) => {
        if (err) reject(err)
        else resolve(data)
      }))
    })

    // Sending video files is not allowed to exceed 20MB
    // https://github.com/Chatie/webwx-app-tracker/blob/7c59d35c6ea0cff38426a4c5c912a086c4c512b2/formatted/webwxApp.js#L1115
    const videoMaxSize = 20 * 1024 * 1024
    const bigFileSize = 25 * 1024 * 1024
    const maxFileSize = 100 * 1024 * 1024
    if (mediatype === 'video' && buffer.length > videoMaxSize)
      throw new Error(`Sending video files is not allowed to exceed ${videoMaxSize / 1024 / 1024}MB`)
    if (buffer.length > maxFileSize) {
      throw new Error(`Sending files is not allowed to exceed ${maxFileSize / 1024 / 1024}MB`)
    }

    const md5 = UtilLib.md5(buffer)

    const baseRequest = await this.getBaseRequest()
    const passTicket = await this.bridge.getPassticket()
    const uploadMediaUrl = await this.bridge.getUploadMediaUrl()
    const checkUploadUrl = await this.bridge.getCheckUploadUrl()
    const cookie = await this.browser.readCookie()
    const first = cookie.find(c => c.name === 'webwx_data_ticket')
    const webwxDataTicket = first && first.value
    const size = buffer.length
    const fromUserName = this.self().id
    const id = 'WU_FILE_' + this.fileId
    this.fileId++

    const hostname = await this.browser.hostname()
    const headers = {
      Referer: `https://${hostname}`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36',
    }

    const uploadMediaRequest = {
      BaseRequest:   baseRequest,
      FileMd5:       md5,
      FromUserName:  fromUserName,
      ToUserName:    toUserName,
      UploadType:    2,
      ClientMediaId: +new Date,
      MediaType:     UploadMediaType.ATTACHMENT,
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

    const mediaData = <MediaData>{
      ToUserName: toUserName,
      MediaId:    '',
      FileName:   filename,
      FileSize:   size,
      FileMd5:    md5,
      MMFileId:   id,
      MMFileExt:  ext,
      Signature:  '',
    }

    // If file size > 25M, must first call checkUpload to get Signature and AESKey, otherwise it will fail to upload
    // https://github.com/Chatie/webwx-app-tracker/blob/7c59d35c6ea0cff38426a4c5c912a086c4c512b2/formatted/webwxApp.js#L1132 #1182
    if (size > bigFileSize) {
      let ret
      try {
        ret = <any> await new Promise((resolve, reject) => {
          request.post({
            url: `https://${hostname}${checkUploadUrl}?pass_ticket=${passTicket}`,
            headers,
            json: checkData,
          }, function (err, res, body) {
            if (err) {
              reject(err)
            } else {
              let obj = body
              if (typeof body !== 'object') {
                obj = JSON.parse(body)
              }
              if (typeof obj !== 'object' || obj.BaseResponse.Ret !== 0) {
                const errMsg = obj.BaseResponse || 'api return err'
                log.silly('PuppetWeb', 'uploadMedia() checkUpload err: ' + errMsg)
                reject(new Error('chackUpload err:' + errMsg))
              }
              resolve({
                Signature: obj.Signature,
                AESKey: obj.AESKey,
              })
            }
          })
        })
      } catch (e) {
        log.error('PuppetWeb', 'uploadMedia() exception: %s', e.message)
        throw e
      }
      if (!ret.Signature) {
        log.error('PuppetWeb', 'uploadMedia(): chackUpload failed to get Signature')
        throw new Error('chackUpload failed to get Signature')
      }
      uploadMediaRequest.Signature = ret.Signature
      uploadMediaRequest.AESKey    = ret.AESKey
      mediaData.Signature          = ret.Signature
    }

    log.verbose('PuppetWeb', 'uploadMedia() webwx_data_ticket: %s', webwxDataTicket)
    log.verbose('PuppetWeb', 'uploadMedia() pass_ticket: %s', passTicket)

    const formData = {
      id,
      name: filename,
      type: contentType,
      lastModifiedDate: Date().toString(),
      size,
      mediatype,
      uploadmediarequest: JSON.stringify(uploadMediaRequest),
      webwx_data_ticket: webwxDataTicket,
      pass_ticket: passTicket,
      filename: {
        value: buffer,
        options: {
          filename,
          contentType,
          size,
        },
      },
    }
    let mediaId
    try {
      mediaId = <string>await new Promise((resolve, reject) => {
        request.post({
          url: uploadMediaUrl + '?f=json',
          headers,
          formData,
        }, function (err, res, body) {
          if (err) { reject(err) }
          else {
            let obj = body
            if (typeof body !== 'object') {
              obj = JSON.parse(body)
            }
            resolve(obj.MediaId || '')
          }
        })
      })
    } catch (e) {
      log.error('PuppetWeb', 'uploadMedia() exception: %s', e.message)
      throw new Error('uploadMedia err: ' + e.message)
    }
    if (!mediaId) {
      log.error('PuppetWeb', 'uploadMedia(): upload fail')
      throw new Error('PuppetWeb.uploadMedia(): upload fail')
    }
    return Object.assign(mediaData, { MediaId: mediaId as string })
  }

  public async sendMedia(message: MediaMessage): Promise<boolean> {
    const to = message.to()
    const room = message.room()

    let destinationId

    if (room) {
      destinationId = room.id
    } else {
      if (!to) {
        throw new Error('PuppetWeb.sendMedia(): message with neither room nor to?')
      }
      destinationId = to.id
    }

    let mediaData
    try {
      mediaData = await this.uploadMedia(message, destinationId)
    } catch (e) {
      log.error('PuppetWeb', 'sendMedia() exception: %s', e.message)
      return false
    }
    mediaData.MsgType = UtilLib.msgType(message.ext())

    log.silly('PuppetWeb', 'sendMedia() destination: %s, mediaId: %s)',
      destinationId,
      mediaData.MediaId,
    )
    let ret = false
    try {
      ret = await this.bridge.sendMedia(mediaData)
    } catch (e) {
      log.error('PuppetWeb', 'sendMedia() exception: %s', e.message)
      Raven.captureException(e)
      return false
    }
    return ret
  }

  public async forward(baseData: MsgRawObj, patchData: MsgRawObj): Promise<boolean> {

    log.silly('PuppetWeb', 'forward() destination: %s, content: %s)',
      patchData.ToUserName,
      patchData.MMActualContent,
    )
    let ret = false
    try {
      // log.info('PuppetWeb', `forward() baseData: ${JSON.stringify(baseData)}\n`)
      // log.info('PuppetWeb', `forward() patchData: ${JSON.stringify(patchData)}\n`)

      ret = await this.bridge.forward(baseData, patchData)
    } catch (e) {
      log.error('PuppetWeb', 'forward() exception: %s', e.message)
      Raven.captureException(e)
      throw e
    }
    return ret
  }

   public async send(message: Message | MediaMessage): Promise<boolean> {
    const to   = message.to()
    const room = message.room()

    let destinationId

    if (room) {
      destinationId = room.id
    } else {
      if (!to) {
        throw new Error('PuppetWeb.send(): message with neither room nor to?')
      }
      destinationId = to.id
    }

    let ret = false

    if (message instanceof MediaMessage) {
      ret = await this.sendMedia(message)
    } else {
      const content = message.content()

      log.silly('PuppetWeb', 'send() destination: %s, content: %s)',
        destinationId,
        content,
      )

      try {
        ret = await this.bridge.send(destinationId, content)
      } catch (e) {
        log.error('PuppetWeb', 'send() exception: %s', e.message)
        Raven.captureException(e)
        throw e
      }
    }
    return ret
  }

  /**
   * Bot say...
   * send to `filehelper` for notice / log
   */
  public async say(content: string): Promise<boolean> {
    if (!this.logined()) {
      throw new Error('can not say before login')
    }

    if (!content) {
      log.warn('PuppetWeb', 'say(%s) can not say nothing', content)
      return false
    }

    const m = new Message()
    m.to('filehelper')
    m.content(content)

    return await this.send(m)
  }

  /**
   * logout from browser, then server will emit `logout` event
   */
  public async logout(): Promise<void> {
    try {
      await this.bridge.logout()
    } catch (e) {
      log.error('PuppetWeb', 'logout() exception: %s', e.message)
      Raven.captureException(e)
      throw e
    }
  }

  public async getContact(id: string): Promise<any> {
    try {
      return await this.bridge.getContact(id)
    } catch (e) {
      log.error('PuppetWeb', 'getContact(%d) exception: %s', id, e.message)
      Raven.captureException(e)
      throw e
    }
  }

  public async ding(data?: any): Promise<string> {
    try {
      return await this.bridge.ding(data)
    } catch (e) {
      log.warn('PuppetWeb', 'ding(%s) rejected: %s', data, e.message)
      Raven.captureException(e)
      throw e
    }
  }

  public async contactAlias(contact: Contact, remark: string|null): Promise<boolean> {
    try {
      const ret = await this.bridge.contactRemark(contact.id, remark)
      if (!ret) {
        log.warn('PuppetWeb', 'contactRemark(%s, %s) bridge.contactRemark() return false',
                              contact.id, remark,
        )
      }
      return ret

    } catch (e) {
      log.warn('PuppetWeb', 'contactRemark(%s, %s) rejected: %s', contact.id, remark, e.message)
      Raven.captureException(e)
      throw e
    }
  }

  public contactFind(filterFunc: string): Promise<Contact[]> {
    if (!this.bridge) {
      return Promise.reject(new Error('contactFind fail: no bridge(yet)!'))
    }
    return this.bridge.contactFind(filterFunc)
                      .then(idList => idList.map(id => Contact.load(id)))
                      .catch(e => {
                        log.warn('PuppetWeb', 'contactFind(%s) rejected: %s', filterFunc, e.message)
                        Raven.captureException(e)
                        throw e
                      })
  }

  public roomFind(filterFunc: string): Promise<Room[]> {
    if (!this.bridge) {
      return Promise.reject(new Error('findRoom fail: no bridge(yet)!'))
    }
    return this.bridge.roomFind(filterFunc)
                      .then(idList => idList.map(id => Room.load(id)))
                      .catch(e => {
                        log.warn('PuppetWeb', 'roomFind(%s) rejected: %s', filterFunc, e.message)
                        Raven.captureException(e)
                        throw e
                      })
  }

  public roomDel(room: Room, contact: Contact): Promise<number> {
    if (!this.bridge) {
      return Promise.reject(new Error('roomDelMember fail: no bridge(yet)!'))
    }
    const roomId    = room.id
    const contactId = contact.id
    return this.bridge.roomDelMember(roomId, contactId)
                      .catch(e => {
                        log.warn('PuppetWeb', 'roomDelMember(%s, %d) rejected: %s', roomId, contactId, e.message)
                        Raven.captureException(e)
                        throw e
                      })
  }

  public roomAdd(room: Room, contact: Contact): Promise<number> {
    if (!this.bridge) {
      return Promise.reject(new Error('fail: no bridge(yet)!'))
    }
    const roomId    = room.id
    const contactId = contact.id
    return this.bridge.roomAddMember(roomId, contactId)
                      .catch(e => {
                        log.warn('PuppetWeb', 'roomAddMember(%s) rejected: %s', contact, e.message)
                        Raven.captureException(e)
                        throw e
                      })
  }

  public roomTopic(room: Room, topic: string): Promise<string> {
    if (!this.bridge) {
      return Promise.reject(new Error('fail: no bridge(yet)!'))
    }
    if (!room || typeof topic === 'undefined') {
      return Promise.reject(new Error('room or topic not found'))
    }

    const roomId = room.id
    return this.bridge.roomModTopic(roomId, topic)
                      .catch(e => {
                        log.warn('PuppetWeb', 'roomTopic(%s) rejected: %s', topic, e.message)
                        Raven.captureException(e)
                        throw e
                      })
  }

  public async roomCreate(contactList: Contact[], topic: string): Promise<Room> {
    if (!this.bridge) {
      return Promise.reject(new Error('fail: no bridge(yet)!'))
    }

    if (!contactList || ! contactList.map) {
      throw new Error('contactList not found')
    }

    const contactIdList = contactList.map(c => c.id)

    try {
      const roomId = await this.bridge.roomCreate(contactIdList, topic)
      if (!roomId) {
        throw new Error('PuppetWeb.roomCreate() roomId "' + roomId + '" not found')
      }
      return  Room.load(roomId)

    } catch (e) {
      log.warn('PuppetWeb', 'roomCreate(%s, %s) rejected: %s', contactIdList.join(','), topic, e.message)
      Raven.captureException(e)
      throw e
    }
  }

  /**
   * FriendRequest
   */
  public async friendRequestSend(contact: Contact, hello: string): Promise<boolean> {
    if (!this.bridge) {
      throw new Error('fail: no bridge(yet)!')
    }

    if (!contact) {
      throw new Error('contact not found')
    }

    try {
      return await this.bridge.verifyUserRequest(contact.id, hello)
    } catch (e) {
      log.warn('PuppetWeb', 'bridge.verifyUserRequest(%s, %s) rejected: %s', contact.id, hello, e.message)
      Raven.captureException(e)
      throw e
    }
  }

  public async friendRequestAccept(contact: Contact, ticket: string): Promise<boolean> {
    if (!this.bridge) {
      return Promise.reject(new Error('fail: no bridge(yet)!'))
    }

    if (!contact || !ticket) {
      throw new Error('contact or ticket not found')
    }

    try {
      return await this.bridge.verifyUserOk(contact.id, ticket)
    } catch (e) {
      log.warn('PuppetWeb', 'bridge.verifyUserOk(%s, %s) rejected: %s', contact.id, ticket, e.message)
      Raven.captureException(e)
      throw e
    }
  }

  /**
   * @private
   * For issue #668
   */
  public async readyStable(): Promise<void> {
    log.verbose('PuppetWeb', 'readyStable()')
    let counter = -1

    async function stable(resolve: Function): Promise<void> {
      log.silly('PuppetWeb', 'readyStable() stable() counter=%d', counter)
      const contactList = await Contact.findAll()
      if (counter === contactList.length) {
        log.verbose('PuppetWeb', 'readyStable() stable() READY counter=%d', counter)
        return resolve()
      }
      counter = contactList.length
      setTimeout(() => stable(resolve), 1000)
        .unref()
    }

    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        log.warn('PuppetWeb', 'readyStable() stable() reject at counter=%d', counter)
        return reject(new Error('timeout after 60 seconds'))
      }, 60 * 1000)
      timer.unref()

      const myResolve = () => {
        clearTimeout(timer)
        resolve()
      }

      setTimeout(() => stable(myResolve), 1000)
    })

  }
}

export default PuppetWeb
