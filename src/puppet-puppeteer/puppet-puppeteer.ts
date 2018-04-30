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
import * as request from 'request'
import * as bl from 'bl'

import cloneClass   from 'clone-class'
import {
  ThrottleQueue,
}                   from 'rx-queue'
import {
  Watchdog,
  WatchdogFood,
}                   from 'watchdog'

import {
  ContactQueryFilter,
  Puppet,
  PuppetOptions,
  RoomQueryFilter,
  ScanData,
}                     from '../puppet/'
import {
  config,
  log,
  Raven,
}                     from '../config'
import {
}                     from '../message'
import Profile        from '../profile'
import Misc           from '../misc'

import {
  Bridge,
  Cookie,
}                       from './bridge'
import Event            from './event'

import {
  MediaData,
  MsgRawObj,
  MediaType,
  MsgType,
}                           from './schema'

import {
  PuppeteerContact,
  PuppeteerContactRawObj,
}                             from './puppeteer-contact'
import PuppeteerMessage       from './puppeteer-message'
import {
  PuppeteerRoom,
  PuppeteerRoomRawObj,
}                             from './puppeteer-room'
import PuppeteerFriendRequest from './puppeteer-friend-request'

export type PuppetFoodType = 'scan' | 'ding'
export type ScanFoodType   = 'scan' | 'login' | 'logout'

export class PuppetPuppeteer extends Puppet {
  public bridge   : Bridge
  public scanInfo?: ScanData

  public scanWatchdog: Watchdog<ScanFoodType>

  private fileId: number
  private user? : PuppeteerContact

  constructor(
    public options: PuppetOptions,
  ) {
    super(options, {
      Contact:        PuppeteerContact,
      FriendRequest:  PuppeteerFriendRequest,
      Message:        PuppeteerMessage,
      Room:           PuppeteerRoom,
    })

    this.fileId = 0

    const SCAN_TIMEOUT  = 2 * 60 * 1000 // 2 minutes
    this.scanWatchdog   = new Watchdog<ScanFoodType>(SCAN_TIMEOUT, 'Scan')
  }

  public toString() {
    return `PuppetPuppeteer<${this.options.profile.name}>`
  }

  public async start(): Promise<void> {
    log.verbose('PuppetPuppeteer', `start() with ${this.options.profile}`)

    this.state.on('pending')

    try {
      this.initWatchdog()
      this.initWatchdogForScan()

      this.bridge = await this.initBridge(this.options.profile)
      log.verbose('PuppetPuppeteer', 'initBridge() done')

      /**
       *  state must set to `live`
       *  before feed Watchdog
       */
      this.state.on(true)

      const food: WatchdogFood = {
        data: 'inited',
        timeout: 2 * 60 * 1000, // 2 mins for first login
      }
      this.emit('watchdog', food)

      const throttleQueue = new ThrottleQueue(5 * 60 * 1000)
      this.on('heartbeat', data => throttleQueue.next(data))
      throttleQueue.subscribe(async data => {
        log.verbose('Wechaty', 'start() throttleQueue.subscribe() new item: %s', data)
        await this.saveCookie()
      })

      log.verbose('PuppetPuppeteer', 'start() done')
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

  public initWatchdog(): void {
    log.verbose('PuppetPuppeteer', 'initWatchdogForPuppet()')

    const puppet = this

    // clean the dog because this could be re-inited
    this.watchdog.removeAllListeners()

    puppet.on('watchdog', food => this.watchdog.feed(food))
    this.watchdog.on('feed', food => {
      log.silly('PuppetPuppeteer', 'initWatchdogForPuppet() dog.on(feed, food={type=%s, data=%s})', food.type, food.data)
      // feed the dog, heartbeat the puppet.
      puppet.emit('heartbeat', food.data)
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
  public initWatchdogForScan(): void {
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
    this.watchdog.sleep()
    this.scanWatchdog.sleep()

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
    }
  }

  public async initBridge(profile: Profile): Promise<Bridge> {
    log.verbose('PuppetPuppeteer', 'initBridge()')

    if (this.state.off()) {
      const e = new Error('initBridge() found targetState != live, no init anymore')
      log.warn('PuppetPuppeteer', e.message)
      throw e
    }

    const head = config.head
    // we have to set this.bridge right now,
    // because the Event.onXXX might arrive while we are initializing.
    this.bridge = new Bridge({
      head,
      profile,
    })

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

  /**
   * get self contact
   */
  public userSelf(): PuppeteerContact {
    log.verbose('PuppetPuppeteer', 'userSelf()')

    if (!this.user) {
      throw new Error('not logged in, no userSelf yet.')
    }

    return this.user
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

  private async uploadMedia(message: PuppeteerMessage, toUserName: string): Promise<MediaData> {
    if (message.type() === PuppeteerMessage.Type.TEXT) {
      throw new Error('require a Media Message')
    }

    const filename = message.filename()
    const ext      = message.ext()

    // const contentType = Misc.mime(ext)
    // const contentType = mime.getType(ext)
    const contentType = message.mimeType()
    if (!contentType) {
      throw new Error('no MIME Type found on mediaMessage: ' + message.filename())
    }
    let mediatype: MediaType

    switch (ext) {
      case '.bmp':
      case '.jpeg':
      case '.jpg':
      case '.png':
      case '.gif':
        mediatype = MediaType.IMAGE
        break
      case '.mp4':
        mediatype = MediaType.VIDEO
        break
      default:
        mediatype = MediaType.ATTACHMENT
    }

    const readStream = await message.readyStream()
    const buffer = <Buffer>await new Promise((resolve, reject) => {
      readStream.pipe(bl((err, data) => {
        if (err) reject(err)
        else resolve(data)
      }))
    })

    // Sending video files is not allowed to exceed 20MB
    // https://github.com/Chatie/webwx-app-tracker/blob/7c59d35c6ea0cff38426a4c5c912a086c4c512b2/formatted/webwxApp.js#L1115
    const MAX_FILE_SIZE   = 100 * 1024 * 1024
    const LARGE_FILE_SIZE = 25 * 1024 * 1024
    const MAX_VIDEO_SIZE  = 20 * 1024 * 1024

    if (mediatype === MediaType.VIDEO && buffer.length > MAX_VIDEO_SIZE)
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
    const fromUserName    = this.userSelf()!.id
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
      MediaType:     MediaType.ATTACHMENT,
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
    } as MediaData

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
          request.post(r, function (err, res, body) {
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

  public async sendMedia(message: PuppeteerMessage): Promise<boolean> {
    const to   = message.to()
    const room = message.room()

    let destinationId

    if (room) {
      destinationId = room.id
    } else {
      if (!to) {
        throw new Error('PuppetPuppeteer.sendMedia(): message with neither room nor to?')
      }
      destinationId = to.id
    }

    let mediaData: MediaData
    const rawObj = message.rawObj || {} as MsgRawObj

    if (!rawObj || !rawObj.MediaId) {
      try {
        mediaData = await this.uploadMedia(message, destinationId)
        message.rawObj = Object.assign(rawObj, mediaData)
        log.silly('PuppetPuppeteer', 'Upload completed, new rawObj:%s', JSON.stringify(message.rawObj))
      } catch (e) {
        log.error('PuppetPuppeteer', 'sendMedia() exception: %s', e.message)
        return false
      }
    } else {
      // To support forward file
      log.silly('PuppetPuppeteer', 'skip upload file, rawObj:%s', JSON.stringify(rawObj))
      mediaData = {
        ToUserName : destinationId,
        MediaId    : rawObj.MediaId,
        MsgType    : rawObj.MsgType,
        FileName   : rawObj.FileName,
        FileSize   : rawObj.FileSize,
        MMFileExt  : rawObj.MMFileExt,
      }
      if (rawObj.Signature) {
        mediaData.Signature = rawObj.Signature
      }
    }
    // console.log('mediaData.MsgType', mediaData.MsgType)
    // console.log('rawObj.MsgType', message.rawObj && message.rawObj.MsgType)

    mediaData.MsgType = this.extToType(message.ext())
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
      return false
    }
    return ret
  }

  /**
   * TODO: Test this function if it could work...
   */
  // public async forward(baseData: MsgRawObj, patchData: MsgRawObj): Promise<boolean> {
  public async forward(message: PuppeteerMessage, sendTo: PuppeteerContact | PuppeteerRoom): Promise<void> {

    log.silly('PuppetPuppeteer', 'forward() to: %s, message: %s)',
      sendTo, message.filename(),
      // patchData.ToUserName,
      // patchData.MMActualContent,
    )

    if (!message.rawObj) {
      throw new Error('no rawObj')
    }

    let m = Object.assign({}, message.rawObj)
    const newMsg = <MsgRawObj>{}
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
    if (m.FileSize >= largeFileSize && !m.Signature) {
      // if has RawObj.Signature, can forward the 25Mb+ file
      log.warn('MediaMessage', 'forward() Due to webWx restrictions, more than 25MB of files can not be downloaded and can not be forwarded.')
      throw new Error('forward() Due to webWx restrictions, more than 25MB of files can not be downloaded and can not be forwarded.')
    }

    newMsg.FromUserName         = this.user && this.user.id || ''
    newMsg.isTranspond          = true
    newMsg.MsgIdBeforeTranspond = m.MsgIdBeforeTranspond || m.MsgId
    newMsg.MMSourceMsgId        = m.MsgId
    // In room msg, the content prefix sender:, need to be removed, otherwise the forwarded sender will display the source message sender, causing self () to determine the error
    newMsg.Content      = Misc.unescapeHtml(m.Content.replace(/^@\w+:<br\/>/, '')).replace(/^[\w\-]+:<br\/>/, '')
    newMsg.MMIsChatRoom = sendTo instanceof PuppeteerRoom ? true : false

    // The following parameters need to be overridden after calling createMessage()

    m = Object.assign(m, newMsg)
    // for (let i = 0; i < sendToList.length; i++) {
      // newMsg.ToUserName = sendToList[i].id
      // // all call success return true
      // ret = (i === 0 ? true : ret) && await config.puppetInstance().forward(m, newMsg)
    // }
    newMsg.ToUserName = sendTo.id
    // ret = await config.puppetInstance().forward(m, newMsg)
    // return ret
    const baseData  = m
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

   public async send(message: PuppeteerMessage): Promise<void> {
    log.verbose('PuppetPuppeteer', 'send(%s)', message)

    const to   = message.to()
    const room = message.room()

    let destinationId

    if (room) {
      destinationId = room.id
    } else if (to) {
      destinationId = to.id
    } else {
      throw new Error('PuppetPuppeteer.send(): message with neither room nor to?')
    }

    if (message.type() === MsgType.TEXT) {
      log.silly('PuppetPuppeteer', 'send() TEXT message.')
      const text = message.text()

      log.silly('PuppetPuppeteer', 'send() destination: %s, text: %s)',
                              destinationId,
                              text,
                )

      try {
        await this.bridge.send(destinationId, text)
      } catch (e) {
        log.error('PuppetPuppeteer', 'send() exception: %s', e.message)
        Raven.captureException(e)
        throw e
      }
    } else {
      log.silly('PuppetPuppeteer', 'send() non-TEXT message.')

      const ret = await this.sendMedia(message)
      if (!ret) {
        throw new Error('sendMedia fail')
      }
    }
  }

  /**
   * Bot say...
   * send to `self` for notice / log
   */
  public async say(text: string): Promise<void> {
    if (!this.logonoff()) {
      throw new Error('can not say before login')
    }

    if (!text) {
      log.warn('PuppetPuppeteer', 'say(%s) can not say nothing', text)
      return
    }

    if (!this.user) {
      log.warn('PuppetPuppeteer', 'say(%s) can not say because no user', text)
      this.emit('error', new Error('no this.user for PuppetPuppeteer'))
      return
    }

    // const m = new Message()
    // m.to('filehelper')
    // m.text(content)

    // return await this.send(m)
    return await this.user.say(text)
  }

  public async login(user: PuppeteerContact): Promise<void> {
    log.warn('PuppetPuppeteer', 'login(%s)', user)
    this.user = user
    this.emit('login', user)
  }

  public logonoff(): boolean {
    return !!(this.user)
  }

  /**
   * logout from browser, then server will emit `logout` event
   */
  public async logout(): Promise<void> {
    log.verbose('PuppetPuppeteer', 'logout()')

    const user = this.userSelf()
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
      this.user = undefined
      this.emit('logout', user)
    }
  }

  public async getContact(id: string): Promise<PuppeteerContactRawObj | PuppeteerRoomRawObj> {
    try {
      return await this.bridge.getContact(id)
    } catch (e) {
      log.error('PuppetPuppeteer', 'getContact(%d) exception: %s', id, e.message)
      Raven.captureException(e)
      throw e
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

  public contactAlias(contact: PuppeteerContact)                      : Promise<string>
  public contactAlias(contact: PuppeteerContact, alias: string | null): Promise<void>

  public async contactAlias(
    contact: PuppeteerContact,
    alias?: string | null,
  ): Promise<string | void> {
    if (typeof alias === 'undefined') {
      throw new Error('to be implement')
    }

    try {
      const ret = await this.bridge.contactAlias(contact.id, alias)
      if (!ret) {
        log.warn('PuppetPuppeteer', 'contactRemark(%s, %s) bridge.contactAlias() return false',
                              contact.id, alias,
                            )
        throw new Error('bridge.contactAlias fail')
      }
    } catch (e) {
      log.warn('PuppetPuppeteer', 'contactRemark(%s, %s) rejected: %s', contact.id, alias, e.message)
      Raven.captureException(e)
      throw e
    }
  }

  private contactQueryFilterToFunctionString(
    query: ContactQueryFilter,
  ): string {
    log.verbose('PuppetPuppeteer', 'contactQueryFilterToFunctionString({ %s })',
                            Object.keys(query)
                                  .map(k => `${k}: ${query[k]}`)
                                  .join(', '),
              )

    if (Object.keys(query).length !== 1) {
      throw new Error('query only support one key. multi key support is not availble now.')
    }

    let filterKey                     = Object.keys(query)[0]
    let filterValue: string | RegExp  = query[filterKey]

    const keyMap = {
      name:   'NickName',
      alias:  'RemarkName',
    }

    filterKey = keyMap[filterKey]
    if (!filterKey) {
      throw new Error('unsupport filter key')
    }

    if (!filterValue) {
      throw new Error('filterValue not found')
    }

    /**
     * must be string because we need inject variable value
     * into code as variable namespecialContactList
     */
    let filterFunction: string

    if (filterValue instanceof RegExp) {
      filterFunction = `(function (c) { return ${filterValue.toString()}.test(c.${filterKey}) })`
    } else if (typeof filterValue === 'string') {
      filterValue = filterValue.replace(/'/g, '\\\'')
      filterFunction = `(function (c) { return c.${filterKey} === '${filterValue}' })`
    } else {
      throw new Error('unsupport name type')
    }

    return filterFunction
  }

  public async contactFindAll(query: ContactQueryFilter): Promise<PuppeteerContact[]> {

    const filterFunc = this.contactQueryFilterToFunctionString(query)

    try {
      const idList = await this.bridge.contactFind(filterFunc)
      return idList.map(id => {
        const c = PuppeteerContact.load(id) as PuppeteerContact
        c.puppet = this
        return c
      })
    } catch (e) {
      log.warn('PuppetPuppeteer', 'contactFind(%s) rejected: %s', filterFunc, e.message)
      Raven.captureException(e)
      throw e
    }
  }

  public async roomFindAll(
    query: RoomQueryFilter = { topic: /.*/ },
  ): Promise<PuppeteerRoom[]> {

    let topicFilter = query.topic

    if (!topicFilter) {
      throw new Error('topicFilter not found')
    }

    let filterFunction: string

    if (topicFilter instanceof RegExp) {
      filterFunction = `(function (c) { return ${topicFilter.toString()}.test(c) })`
    } else if (typeof topicFilter === 'string') {
      topicFilter = topicFilter.replace(/'/g, '\\\'')
      filterFunction = `(function (c) { return c === '${topicFilter}' })`
    } else {
      throw new Error('unsupport topic type')
    }

    try {
      const idList = await this.bridge.roomFind(filterFunction)
      return idList.map(id => {
        const r = PuppeteerRoom.load(id) as PuppeteerRoom
        r.puppet = this
        return r
      })
    } catch (e) {
      log.warn('PuppetPuppeteer', 'roomFind(%s) rejected: %s', filterFunction, e.message)
      Raven.captureException(e)
      throw e
    }
  }

  public async roomDel(room: PuppeteerRoom, contact: PuppeteerContact): Promise<void> {
    const roomId    = room.id
    const contactId = contact.id
    try {
      await this.bridge.roomDelMember(roomId, contactId)
    } catch (e) {
      log.warn('PuppetPuppeteer', 'roomDelMember(%s, %d) rejected: %s', roomId, contactId, e.message)
      Raven.captureException(e)
      throw e
    }
  }

  public async roomAdd(room: PuppeteerRoom, contact: PuppeteerContact): Promise<void> {
    const roomId    = room.id
    const contactId = contact.id
    try {
      await this.bridge.roomAddMember(roomId, contactId)
    } catch (e) {
      log.warn('PuppetPuppeteer', 'roomAddMember(%s) rejected: %s', contact, e.message)
      Raven.captureException(e)
      throw e
    }
  }

  public async roomTopic(room: PuppeteerRoom, topic: string): Promise<string> {
    if (!room || typeof topic === 'undefined') {
      return Promise.reject(new Error('room or topic not found'))
    }

    const roomId = room.id
    try {
      return await this.bridge.roomModTopic(roomId, topic)
    } catch (e) {
      log.warn('PuppetPuppeteer', 'roomTopic(%s) rejected: %s', topic, e.message)
      Raven.captureException(e)
      throw e
    }
  }

  public async roomCreate(contactList: PuppeteerContact[], topic: string): Promise<PuppeteerRoom> {
    if (!contactList || ! contactList.map) {
      throw new Error('contactList not found')
    }

    const contactIdList = contactList.map(c => c.id)

    try {
      const roomId = await this.bridge.roomCreate(contactIdList, topic)
      if (!roomId) {
        throw new Error('PuppetPuppeteer.roomCreate() roomId "' + roomId + '" not found')
      }
      const r = PuppeteerRoom.load(roomId) as PuppeteerRoom
      r.puppet = this
      return r

    } catch (e) {
      log.warn('PuppetPuppeteer', 'roomCreate(%s, %s) rejected: %s', contactIdList.join(','), topic, e.message)
      Raven.captureException(e)
      throw e
    }
  }

  /**
   * FriendRequest
   */
  public async friendRequestSend(contact: PuppeteerContact, hello: string): Promise<void> {
    if (!contact) {
      throw new Error('contact not found')
    }

    try {
      await this.bridge.verifyUserRequest(contact.id, hello)
    } catch (e) {
      log.warn('PuppetPuppeteer', 'bridge.verifyUserRequest(%s, %s) rejected: %s', contact.id, hello, e.message)
      Raven.captureException(e)
      throw e
    }
  }

  public async friendRequestAccept(contact: PuppeteerContact, ticket: string): Promise<void> {
    if (!contact || !ticket) {
      throw new Error('contact or ticket not found')
    }

    try {
      await this.bridge.verifyUserOk(contact.id, ticket)
    } catch (e) {
      log.warn('PuppetPuppeteer', 'bridge.verifyUserOk(%s, %s) rejected: %s', contact.id, ticket, e.message)
      Raven.captureException(e)
      throw e
    }
  }

  /**
   * @private
   * For issue #668
   */
  public async readyStable(): Promise<void> {
    log.verbose('PuppetPuppeteer', 'readyStable()')
    let counter = -1

    // tslint:disable-next-line:variable-name
    const MyContact = cloneClass(PuppeteerContact)
    MyContact.puppet = this

    async function stable(done: Function): Promise<void> {
      log.silly('PuppetPuppeteer', 'readyStable() stable() counter=%d', counter)

      const contactList = await MyContact.findAll()
      if (counter === contactList.length) {
        log.verbose('PuppetPuppeteer', 'readyStable() stable() READY counter=%d', counter)
        return done()
      }
      counter = contactList.length
      setTimeout(() => stable(done), 1000)
        .unref()
    }

    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        log.warn('PuppetPuppeteer', 'readyStable() stable() reject at counter=%d', counter)
        return reject(new Error('timeout after 60 seconds'))
      }, 60 * 1000)
      timer.unref()

      const done = () => {
        clearTimeout(timer)
        return resolve()
      }

      return stable(done)
    })

  }

  /**
   * https://www.chatie.io:8080/api
   * location.hostname = www.chatie.io
   * location.host = www.chatie.io:8080
   * See: https://stackoverflow.com/a/11379802/1123955
   */
  public async hostname(): Promise<string> {
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

  public async cookies(): Promise<Cookie[]> {
    return await this.bridge.cookies()
  }

  public async saveCookie(): Promise<void> {
    const cookieList = await this.bridge.cookies()
    this.options.profile.set('cookies', cookieList)
    this.options.profile.save()
  }

  public extToType(ext: string): MsgType {
    switch (ext) {
      case '.bmp':
      case '.jpeg':
      case '.jpg':
      case '.png':
        return MsgType.IMAGE
      case '.gif':
        return MsgType.EMOTICON
      case '.mp4':
        return MsgType.VIDEO
      default:
        return MsgType.APP
    }
  }

}

export default PuppetPuppeteer
