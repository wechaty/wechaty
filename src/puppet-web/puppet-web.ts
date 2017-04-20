/**
 *
 * wechaty: Wechat for Bot. and for human who talk to bot/robot
 *
 * Class PuppetWeb
 *
 * use to control wechat in web browser.
 *
 * Licenst: ISC
 * https://github.com/zixia/wechaty
 *
 *
 * Class PuppetWeb
 *
 */
import {
  Config,
  HeadName,
  ScanInfo,
  WatchdogFood,
  log,
}                         from '../config'

import { Contact }        from '../contact'
import {
  Message,
  MediaMessage,
 }                        from '../message'
import { Puppet }         from '../puppet'
import { Room }           from '../room'
import { UtilLib }        from '../util-lib'

import { Bridge }         from './bridge'
import { Browser }        from './browser'
import { Event }          from './event'
import { Server }         from './server'
import { Watchdog }       from './watchdog'

import * as request from 'request'
import * as bl from 'bl'

type MediaType = 'pic' | 'video' | 'doc'

const enum UploadMediaType {
  IMAGE = 1,
  VIDEO = 2,
  AUDIO = 3,
  ATTACHMENT = 4,
}
export type PuppetWebSetting = {
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

  public lastScanEventTime: number
  public watchDogLastSaveSession: number
  public watchDogTimer: NodeJS.Timer | null
  public watchDogTimerTime: number

  constructor(public setting: PuppetWebSetting = {}) {
    super()

    if (!setting.head) {
      setting.head = Config.head
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

      await this.initBrowser()
      log.verbose('PuppetWeb', 'initBrowser() done')

      await this.initBridge()
      log.verbose('PuppetWeb', 'initBridge() done')

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
      }
      log.warn('PuppetWeb', 'quit() is called on a `dead` browser. return directly.')
      return
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

        await this.bridge.quit()
                        .catch(e => { // fail safe
                          log.warn('PuppetWeb', 'quit() bridge.quit() exception: %s', e.message)
                        })
        log.verbose('PuppetWeb', 'quit() bridge.quit() done')

        await this.server.quit()
                        .catch(e => { // fail safe
                          log.warn('PuppetWeb', 'quit() server.quit() exception: %s', e.message)
                        })
        log.verbose('PuppetWeb', 'quit() server.quit() done')

        await this.browser.quit()
                  .catch(e => { // fail safe
                    log.warn('PuppetWeb', 'quit() browser.quit() exception: %s', e.message)
                  })
        log.verbose('PuppetWeb', 'quit() browser.quit() done')

        clearTimeout(timer)
        resolve()
        return

      })

      this.state.current('dead')

      return

    } catch (e) {
      log.error('PuppetWeb', 'quit() exception: %s', e.message)
      this.state.current('dead')
      throw e
    }
  }

  public async initBrowser(): Promise<void> {
    log.verbose('PuppetWeb', 'initBrowser()')

    this.browser = new Browser({
      head:         <HeadName>this.setting.head,
      sessionFile:  this.setting.profile,
    })

    this.browser.on('dead', Event.onBrowserDead.bind(this))

    if (this.state.target() === 'dead') {
      const e = new Error('found state.target()) != live, no init anymore')
      log.warn('PuppetWeb', 'initBrowser() %s', e.message)
      throw e
    }

    try {
      await this.browser.init()
    } catch (e) {
      log.error('PuppetWeb', 'initBrowser() exception: %s', e.message)
      throw e
    }
    return
  }

  public async initBridge(): Promise<void> {
    log.verbose('PuppetWeb', 'initBridge()')

    this.bridge = new Bridge(
      this, // use puppet instead of browser, is because browser might change(die) duaring run time,
      this.port,
    )

    if (this.state.target() === 'dead') {
      const e = new Error('initBridge() found targetState != live, no init anymore')
      log.warn('PuppetWeb', e.message)
      throw e
    }

    try {
      await this.bridge.init()
    } catch (e) {
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
    return
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

    await this.server.init()
                .catch(e => {
                  log.error('PuppetWeb', 'initServer() exception: %s', e.message)
                  throw e
                })
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
      let json = await this.bridge.getBaseRequest();
      let obj = JSON.parse(json)
      return obj.BaseRequest
    } catch (e) {
      log.error('PuppetWeb', 'send() exception: %s', e.message)
      throw e
    }
  }

  private async uploadMedia(mediaMessage: MediaMessage, toUserName: string): Promise<string> {
    if (!mediaMessage)
      throw new Error('require mediaMessage')

    let filename = mediaMessage.filename()
    let ext = mediaMessage.ext()

    let contentType = UtilLib.mime(ext)
    let mediatype: MediaType

    switch (ext) {
      case 'bmp':
      case 'jpeg':
      case 'jpg':
      case 'png':
        mediatype = 'pic'
        break
      case 'mp4':
        mediatype = 'video'
        break
      default:
        mediatype = 'doc'
    }

    let readStream = await mediaMessage.readyStream()
    let buffer = <Buffer>await new Promise((resolve, reject) => {
      readStream.pipe(bl((err, data) => {
        if (err) reject(err)
        else resolve(data)
      }))
    })

    // Sending video files is not allowed to exceed 20MB
    // https://github.com/Chatie/webwx-app-tracker/blob/7c59d35c6ea0cff38426a4c5c912a086c4c512b2/formatted/webwxApp.js#L1115
    const videoMaxSize = 20 * 1024 * 1024
    if (mediatype === 'video' && buffer.length > videoMaxSize)
      throw new Error(`Sending video files is not allowed to exceed ${videoMaxSize / 1024 / 1024}MB`)

    let md5 = UtilLib.md5(buffer)

    let baseRequest = await this.getBaseRequest()
    let passTicket = await this.bridge.getPassticket()
    let uploadMediaUrl = await this.bridge.getUploadMediaUrl()
    let cookie = await this.browser.readCookie()
    let first = cookie.find(c => c.name === 'webwx_data_ticket')
    let webwxDataTicket = first && first.value
    let size = buffer.length

    let hostname = this.browser.hostname
    let uploadMediaRequest = {
      BaseRequest: baseRequest,
      FileMd5: md5,
      FromUserName: this.self().id,
      ToUserName: toUserName,
      UploadType: 2,
      ClientMediaId: +new Date,
      MediaType: UploadMediaType.ATTACHMENT,
      StartPos: 0,
      DataLen: size,
      TotalLen: size,
    }

    let formData = {
      id: 'WU_FILE_1',
      name: filename,
      type: contentType,
      lastModifiedDate: Date().toString(),
      size: size,
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

    let mediaId = await new Promise((resolve, reject) => {
      request.post({
        url: uploadMediaUrl + '?f=json',
        headers: {
          Referer: `https://${hostname}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36',
        },
        formData,
      }, function (err, res, body) {
        if (err) reject(err)
        else {
          let obj = JSON.parse(body)
          resolve(obj.MediaId)
        }
      })
    })
    if (!mediaId)
      throw new Error('upload fail')
    return mediaId as string
  }

  public async sendMedia(message: MediaMessage): Promise<void> {
    const to = message.to()
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

    const mediaId = await this.uploadMedia(message, destinationId)
    let msgType = UtilLib.msgType(message.ext())

    log.silly('PuppetWeb', 'send() destination: %s, mediaId: %s)',
      destinationId,
      mediaId,
    )

    try {
      await this.bridge.sendMedia(destinationId, mediaId, msgType)
    } catch (e) {
      log.error('PuppetWeb', 'send() exception: %s', e.message)
      throw e
    }
    return
  }

   public async send(message: Message | MediaMessage): Promise<void> {
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

    if (message instanceof MediaMessage) {
      await this.sendMedia(message)
    } else {
      const content = message.content()

      log.silly('PuppetWeb', 'send() destination: %s, content: %s)',
        destinationId,
        content,
      )

      try {
        await this.bridge.send(destinationId, content)
      } catch (e) {
        log.error('PuppetWeb', 'send() exception: %s', e.message)
        throw e
      }
    }
    return
  }

  /**
   * Bot say...
   * send to `filehelper` for notice / log
   */
  public async say(content: string): Promise<void> {
    if (!this.logined()) {
      throw new Error('can not say before login')
    }

    const m = new Message()
    m.to('filehelper')
    m.content(content)

    await this.send(m)
    return
  }

  /**
   * logout from browser, then server will emit `logout` event
   */
  public async logout(): Promise<void> {
    try {
      await this.bridge.logout()
    } catch (e) {
      log.error('PuppetWeb', 'logout() exception: %s', e.message)
      throw e
    }
  }

  public async getContact(id: string): Promise<any> {
    try {
      return await this.bridge.getContact(id)
    } catch (e) {
      log.error('PuppetWeb', 'getContact(%d) exception: %s', id, e.message)
      throw e
    }
  }

  public async ding(data?: any): Promise<string> {
    try {
      return await this.bridge.ding(data)
    } catch (e) {
      log.warn('PuppetWeb', 'ding(%s) rejected: %s', data, e.message)
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
      throw e
    }
  }

  /**
   * FriendRequest
   */
  public async friendRequestSend(contact: Contact, hello: string): Promise<boolean> {
    if (!this.bridge) {
      return Promise.reject(new Error('fail: no bridge(yet)!'))
    }

    if (!contact) {
      throw new Error('contact not found')
    }

    try {
      return await this.bridge.verifyUserRequest(contact.id, hello)
    } catch (e) {
      log.warn('PuppetWeb', 'bridge.verifyUserRequest(%s, %s) rejected: %s', contact.id, hello, e.message)
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
      throw e
    }
  }
}
