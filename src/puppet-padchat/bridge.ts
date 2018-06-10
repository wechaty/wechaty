import path   from 'path'
import os     from 'os'
import fs     from 'fs-extra'

import { MemoryCard }     from 'memory-card'
import { StateSwitch }    from 'state-switch'
import { FlashStoreSync } from 'flash-store'

import Misc           from '../misc'

import {
  PadchatContinue,

  PadchatContactMsgType,
  PadchatContactPayload,

  PadchatRoomMemberPayload,
  PadchatRoomPayload,
}                             from './padchat-schemas'

import {
  // AutoDataType,
  WXCheckQRCodeStatus,
}                             from './padchat-rpc.type'

import {
  PadchatRpc,
}                 from './padchat-rpc'

import {
  PadchatPureFunctionHelper as pfHelper,
}                                           from './pure-function-helper'

import {
  log,
}           from '../config'

const MEMORY_SLOT_WECHATY_PUPPET_PADCHAT = 'WECHATY_PUPPET_PADCHAT'
export interface PadchatMemorySlot {
  device: {
    [userId: string]: undefined | {
      token? : string,
      name?  : string,
      data   : string,
    },
  },
  currentUserId?: string,
}

export interface BridgeOptions {
  memory   : MemoryCard,
  endpoint : string,
  token    : string,
}

export class Bridge extends PadchatRpc {
  // private readonly padchatRpc : PadchatRpc
  // private autoData            : AutoDataType
  private memorySlot: PadchatMemorySlot

  private loginScanQrcode? : string
  private loginScanStatus? : number

  private loginTimer?: NodeJS.Timer

  private selfId?   : string
  private selfName? : string
  // private password? : string
  // private nickname? : string

  private cacheRoomRawPayload?       : FlashStoreSync<string, PadchatRoomPayload>
  private cacheContactRawPayload?    : FlashStoreSync<string, PadchatContactPayload>

  /**
   * cacheRoomMemberRawPayload[roomId1] = {
   *  contactId1: payload1,
   *  contactId2: payload2
   * }
   *
   * cacheRoomMemberRawPayload[roomId2] = {
   *  contactId2: payload3,
   *  contactId3: payload4,
   * }
   */
  private cacheRoomMemberRawPayload? : FlashStoreSync<
    string,
    {
      [contactId: string]: PadchatRoomMemberPayload,
    }
  >

  private readonly state: StateSwitch

  constructor(
    public options: BridgeOptions,
  ) {
    super(options.endpoint, options.token)
    log.verbose('PuppetPadchatBridge', 'constructor()')

    this.memorySlot = {
      device: {},
    }

    // this.padchatRpc = new PadchatRpc(options.endpoint, options.token)
    this.state      = new StateSwitch('PuppetPadchatBridge')
  }

  private async initCache(
    token  : string,
    selfId : string,
  ): Promise<void> {
    log.verbose('PuppetPadchatBridge', 'initCache(%s, %s)', token, selfId)

    if (   this.cacheRoomRawPayload
        || this.cacheRoomMemberRawPayload
        || this.cacheContactRawPayload
    ) {
      throw new Error('cache exists')
    }

    const baseDir = path.join(
      os.homedir(),
      path.sep,
      '.wechaty',
      'puppet-padchat-token-cache',
      path.sep,
      token,
      path.sep,
      selfId,
    )

    const baseDirExist = await fs.pathExists(baseDir)

    if (!baseDirExist) {
      await fs.mkdirp(baseDir)
    }

    this.cacheContactRawPayload    = new FlashStoreSync(path.join(baseDir, 'contact-raw-payload'))
    this.cacheRoomRawPayload       = new FlashStoreSync(path.join(baseDir, 'room-raw-payload'))
    this.cacheRoomMemberRawPayload = new FlashStoreSync(path.join(baseDir, 'room-member-raw-payload'))

    log.silly('PuppetPadchatBridge', 'initCache() workdir="%s"', baseDir)
  }

  private releaseCache(): void {
    log.verbose('PuppetPadchatBridge', 'releaseCache(%s, %s)')

    if (   this.cacheRoomRawPayload
      && this.cacheRoomMemberRawPayload
      && this.cacheContactRawPayload
    ) {
      this.cacheContactRawPayload.clear()
      this.cacheRoomRawPayload.clear()
      this.cacheRoomMemberRawPayload.clear()
    } else {
      throw new Error('cache not exist')
    }
  }

  public async start(): Promise<void> {
    log.verbose('PuppetPadchatBridge', `start()`)

    if (this.selfId) {
      throw new Error('selfId exist')
    }

    this.state.on('pending')

    this.memorySlot = {
      ...this.memorySlot,
      ...await this.options.memory.get<PadchatMemorySlot>(MEMORY_SLOT_WECHATY_PUPPET_PADCHAT),
    }

    // await this.padchatRpc.start()
    await super.start()

    // this.padchatRpc.on('message', messageRawPayload => {
    //   log.silly('PuppetPadchatBridge', 'start() padchatRpc.on(message)')
    //   this.emit('message', messageRawPayload)
    // })

    // No need to call logout() in bridge, because PupetPadchat will call logout() when received the 'logout' event
    // this.padchatRpc.on('logout', data => {
    // this.on('logout', () => this.logout())

    await this.tryLoad62Data()

    const succeed = await this.tryAutoLogin(this.memorySlot)
    if (!succeed) {
      this.startCheckScan()
    }

    this.state.on(true)
  }

  public async stop(): Promise<void> {
    log.verbose('PuppetPadchatBridge', `stop()`)

    this.state.off('pending')

    if (this.loginTimer) {
      clearTimeout(this.loginTimer)
      this.loginTimer = undefined
    }

    // await this.padchatRpc.stop()
    await super.stop()

    this.releaseCache()

    this.selfId          = undefined
    this.loginScanQrcode = undefined

    this.state.off(true)
  }

  protected async login(userId: string, userName?: string): Promise<void> {
    log.verbose('PuppetPadchatBridge', `login(%s)`, userId)

    if (this.selfId) {
      throw new Error('userId exist')
    }
    this.selfId = userId
    if (userName) {
      this.selfName  = userName
    }

    await this.stopCheckScan()

    /**
     * Update Memory Slot
     */
    this.memorySlot = await this.refresh62Data(
      this.memorySlot,
      userId,
      userName,
    )
    await this.options.memory.set(MEMORY_SLOT_WECHATY_PUPPET_PADCHAT, this.memorySlot)
    await this.options.memory.save()

    /**
     * Init persistence cache
     */
    await this.initCache(this.options.token, this.selfId)

    this.emit('login', this.selfId)
  }

  public async logout(): Promise<void> {
    log.verbose('PuppetPadchatBridge', `logout()`)

    if (!this.selfId) {
      // throw new Error('no username')
      log.warn('PuppetPadchatBridge', 'logout() selfId not exist, already logout-ed')
      return
    }

    this.selfId = undefined
    this.releaseCache()

    this.startCheckScan()
  }

  protected async stopCheckScan(): Promise<void> {
    log.verbose('PuppetPadchatBridge', `stopCheckScan()`)

    if (this.loginTimer) {
      clearTimeout(this.loginTimer)
      this.loginTimer = undefined
    }
    this.loginScanQrcode = undefined
    this.loginScanStatus = undefined
  }

  protected async startCheckScan(): Promise<void> {
    log.verbose('PuppetPadchatBridge', `startCheckScan()`)

    if (this.selfId) {
      log.warn('PuppetPadchatBridge', 'startCheckScan() this.username exist.')
      this.login(this.selfId)
      return
    }

    if (this.loginTimer) {
      log.warn('PuppetPadchatBridge', 'startCheckScan() this.scanTimer exist.')
      return
    }

    /**
     * 2. Wait user response
     */
    let waitUserResponse = true
    while (waitUserResponse) {
      // const result = await this.padchatRpc.WXCheckQRCode()
      const result = await this.WXCheckQRCode()

      if (this.loginScanStatus !== result.status && this.loginScanQrcode) {
        this.loginScanStatus = result.status
        this.emit(
          'scan',
          this.loginScanQrcode,
          this.loginScanStatus,
        )
      }

      if (result.expired_time && result.expired_time < 10) {
        // result.expire_time is second
        // emit new qrcode before the old one expired
        this.loginScanQrcode = undefined
        this.loginScanStatus = undefined
        waitUserResponse = false
        continue
      }

      switch (result.status) {
        case WXCheckQRCodeStatus.WaitScan:
          log.silly('PuppetPadchatBridge', 'checkQrcode: Please scan the Qrcode!')
          break

        case WXCheckQRCodeStatus.WaitConfirm:
          /**
           * WXCheckQRCode result:
           * {
           *  "expired_time": 236,
           *  "head_url": "http://wx.qlogo.cn/mmhead/ver_1/5VaXXlAx53wb3M46gQpVtLiaVMd4ezhxOibJiaZXLf2ajTNPZloJI7QEpVxd4ibgpEnLF8gHVuLricaJesjJpsFiciaOw/0",
           *  "nick_name": "李卓桓",
           *  "status": 1
           * }
           */
          log.silly('PuppetPadchatBridge', 'checkQrcode: Had scan the Qrcode, but not Login!')
          break

        case WXCheckQRCodeStatus.Confirmed:
          log.silly('PuppetPadchatBridge', 'checkQrcode: Trying to login... please wait')

          if (!result.user_name || !result.password) {
            throw Error('PuppetPadchatBridge, checkQrcode, cannot get username or password here, return!')
          }

          // const loginResult = await this.padchatRpc.WXQRCodeLogin(result.user_name, result.password)
          const loginResult = await this.WXQRCodeLogin(result.user_name, result.password)

          // this.autoData.nick_name = loginResult.nick_name
          // this.autoData.user_name = loginResult.user_name

          this.login(
            loginResult.user_name,
            loginResult.nick_name,
          )
          return

        case WXCheckQRCodeStatus.Timeout:
          log.silly('PuppetPadchatBridge', 'checkQrcode: Timeout')
          this.loginScanQrcode = undefined
          this.loginScanStatus = undefined
          waitUserResponse = false
          break

        case WXCheckQRCodeStatus.Cancel:
          log.silly('PuppetPadchatBridge', 'user cancel')
          this.loginScanQrcode = undefined
          this.loginScanStatus = undefined
          waitUserResponse = false
          break

        default:
          log.warn('PadchatBridge', 'startCheckScan() unknown WXCheckQRCodeStatus: ' + result.status)
          this.loginScanQrcode = undefined
          this.loginScanStatus = undefined
          waitUserResponse = false
          break
      }

      await new Promise(r => setTimeout(r, 1000))
    }

    await this.emitLoginQrcode()
    this.loginTimer = setTimeout(() => {
      this.loginTimer = undefined
      this.startCheckScan()
    }, 1000)
    return
  }

  /**
   * Offline, then relogin
   * emit qrcode or send login request to the user.
   */
  protected async tryAutoLogin(memorySlot: PadchatMemorySlot): Promise<boolean> {
    log.verbose('PuppetPadchatBridge', `tryAutoLogin(%s)`, memorySlot.currentUserId)

    const currentUserId = memorySlot.currentUserId
    if (!currentUserId) {
      log.silly('PuppetPadchatBridge', 'tryAutoLogin() currentUserId not found in memorySlot')
      return false
    }

    const deviceInfo = memorySlot.device[currentUserId]
    if (!deviceInfo) {
      log.silly('PuppetPadchatBridge', 'tryAutoLogin() deviceInfo not found for userId "%s"', currentUserId)
      return false
    }

    const token = deviceInfo.token
    if (!token) {
      log.silly('PuppetPadchatBridge', 'tryAutoLogin() token not found for userId "%s"', currentUserId)
      return false
    }

    // log.silly('PuppetPadchatBridge', `initLogin() autoData.token exist for %s`,
    //                                 this.autoData.nick_name || 'no nick_name',
    //           )

    /**
     * PadchatRpc WXAutoLogin result:
     * {
     *  "email": "",
     *  "external": "",
     *  "long_link_server": "hklong.weixin.qq.com",
     *  "message": "\n�\u0003<e>\n<ShowType>1</ShowType>\n<Content>
     *    <![CDATA[当前帐号于02:10在iPad设备上登录。若非本人操作，你的登录密码可能已经泄漏，请及时改密。紧急情况可前往http://weixin110.qq.com冻结帐号。]]></Content>
     *    \n<Url><![CDATA[]]></Url>\n<DispSec>30</DispSec>\n<Title><![CDATA[]]></Title>\n<Action>4</Action>\n<DelayConnSec>0</DelayConnSec>
     *    \n<Countdown>0</Countdown>\n<Ok><![CDATA[]]></Ok>\n<Cancel><![CDATA[]]></Cancel>\n</e>\n",
     *  "nick_name": "",
     *  "phone_number": "",
     *  "qq": 0,
     *  "short_link_server": "hkshort.weixin.qq.com:80",
     *  "status": -2023,
     *  "uin": 1928023446,
     *  "user_name": "wxid_5zj4i5htp9ih22"
     * }
     */

     /**
      * WXAutoLoginresult: {
      *   "email": "",
      *   "external": "",
      *   "long_link_server": "",
      *   "message": "\n�\u0002<e>\n<ShowType>1</ShowType>\n<Content><![CDATA[你已退出微信]]></Content>\n
      *     <Url><![CDATA[]]></Url>\n<DispSec>30</DispSec>\n<Title><![CDATA[]]></Title>\n<Action>4</Action>\n
      *     <DelayConnSec>0</DelayConnSec>\n<Countdown>0</Countdown>\n<Ok><![CDATA[]]></Ok>\n<Cancel><![CDATA[]]></Cancel>\n</e>\n",
      *   "nick_name": "",
      *   "phone_number": "",
      *   "qq": 0,
      *   "short_link_server": "",
      *   "status": -2023,
      *   "uin": 4763975,
      *   "user_name": "lizhuohuan"
      * }
      */

    /**
     * 1. Auto Login data invalid, emit QrCode for scan
     */
    const autoLoginResult = await this.WXAutoLogin(token)
    //  const autoLoginResult = await this.padchatRpc.WXAutoLogin(this.autoData.token)
    if (!autoLoginResult) {
      await this.emitLoginQrcode()
      return false
    }

    /**
     * 2 Auto Login Success
     */
    if (autoLoginResult.status === 0) {
      this.login(autoLoginResult.user_name)
      return true

    }

    /**
     * 3. Auto Login data valid, but need user to confirm.
     *  Send Login Request to User to be confirm(the same as the user had scaned the QrCode)
     *  with a valid Login Request, wait user to confirm on the phone.
     */
    const loginRequestResult = await this.WXLoginRequest(token)
    // const loginRequestResult = await this.padchatRpc.WXLoginRequest(this.autoData.token)
    if (loginRequestResult && loginRequestResult.status === 0) {
      return false
    }

    /**
     * 4 Send Login Request to user fail, emit QrCode for scan.
     */
    await this.emitLoginQrcode()
    return false
  }

  protected async emitLoginQrcode(): Promise<void> {
    log.verbose('PuppetPadchatBridge', `emitLoginQrCode()`)

    if (this.loginScanQrcode) {
      throw new Error('qrcode exist')
    }

    // const result = await this.padchatRpc.WXGetQRCode()
    const result = await this.WXGetQRCode()
    if (!result) {
      log.verbose('PuppetPadchatBridge', `emitLoginQrCode() result not found. Call WXInitialize() and try again ...`)
      // await this.padchatRpc.WXInitialize()
      await this.WXInitialize()
      // wait 1 second and try again
      await new Promise(r => setTimeout(r, 1000))
      return await this.emitLoginQrcode()
    }

    const qrcodeDecoded = await pfHelper.imageBase64ToQrcode(result.qr_code)

    this.loginScanQrcode = qrcodeDecoded
    this.loginScanStatus = WXCheckQRCodeStatus.WaitScan

    this.emit(
      'scan',
      this.loginScanQrcode,
      this.loginScanStatus,
    )
  }

  protected async refresh62Data(
    memorySlot: PadchatMemorySlot,
    userId   : string,
    userName?: string,
  ): Promise<PadchatMemorySlot> {
    log.verbose('PuppetPadchatBridge', `save62Data(%s, %s)`, userId, userName)

    // await this.padchatRpc.WXHeartBeat()
    await this.WXHeartBeat()

    const deviceCurrentUserId = memorySlot.currentUserId
    const deviceInfoDict      = memorySlot.device

    // if (!this.autoData.wxData || this.autoData.user_name !== userId) {
    if (deviceCurrentUserId !== userId) {
      log.verbose('PuppetPadchatBridge', `save62Data() user switch detected: from "%s(%s)" to "%s(%s)"`,
                                          deviceCurrentUserId && deviceInfoDict[deviceCurrentUserId]!.name,
                                          deviceCurrentUserId,
                                          userName,
                                          userId,
                  )
      memorySlot.currentUserId = userId
      memorySlot.device = {
        ...memorySlot.device,
        [userId]: {
          data : await this.WXGenerateWxDat(),
          name : userName,
        },
      }
    }

    memorySlot.device[userId]!.token = await this.WXGetLoginToken()

    return memorySlot
  }

  protected async tryLoad62Data(): Promise<void> {
    log.verbose('PuppetPadchatBridge', `tryLoad62Data()`)

    const deviceUserId   = this.memorySlot.currentUserId
    const deviceInfoDict = this.memorySlot.device

    if (   deviceUserId
        && deviceInfoDict
        && deviceUserId in deviceInfoDict
    ) {
      const deviceInfo = deviceInfoDict[deviceUserId]
      if (!deviceInfo) {
        throw new Error('deviceInfo not found')
      }
      log.silly('PuppetPadchatBridge', `tryLoad62Data() 62 data found: "%s"`, deviceInfo.data)
      await this.WXLoadWxDat(deviceInfo.data)
    } else {
      log.silly('PuppetPadchatBridge', `tryLoad62Data() 62 data not found`)
    }
  }

  public getContactIdList(): string[] {
    log.verbose('PuppetPadchatBridge', 'getContactIdList()')
    if (!this.cacheContactRawPayload) {
      throw new Error('cache not inited' )
    }
    const contactIdList = [...this.cacheContactRawPayload.keys()]
    log.silly('PuppetPadchatBridge', 'getContactIdList() = %d', contactIdList.length)
    return contactIdList
  }

  public getRoomIdList(): string[] {
    log.verbose('PuppetPadchatBridge', 'getRoomIdList()')
    if (!this.cacheRoomRawPayload) {
      throw new Error('cache not inited' )
    }
    const roomIdList = [...this.cacheRoomRawPayload.keys()]
    log.verbose('PuppetPadchatBridge', 'getRoomIdList()=%d', roomIdList.length)
    return roomIdList
  }

  public async getRoomMemberIdList(roomId: string): Promise<string[]> {
    log.verbose('PuppetPadchatBridge', 'getRoomMemberIdList(%d)', roomId)
    if (!this.cacheRoomMemberRawPayload) {
      throw new Error('cache not inited' )
    }

    const memberRawPayloadDict = this.cacheRoomMemberRawPayload.get(roomId)
                                || await this.syncRoomMember(roomId)

    if (!memberRawPayloadDict) {
      // or return [] ?
      throw new Error('roomId not found: ' + roomId)
    }

    const memberIdList = Object.keys(memberRawPayloadDict)

    log.verbose('PuppetPadchatBridge', 'getRoomMemberIdList(%d) length=%d', roomId, memberIdList.length)
    return memberIdList
  }

  public async roomMemberRawPayload(roomId: string, contactId: string): Promise<PadchatRoomMemberPayload> {
    log.verbose('PuppetPadchatBridge', 'roomMemberRawPayload(%s)', roomId)

    if (!this.cacheRoomMemberRawPayload) {
      throw new Error('cache not inited' )
    }

    const memberRawPayloadDict = this.cacheRoomMemberRawPayload.get(roomId)
                                || await this.syncRoomMember(roomId)

    if (!memberRawPayloadDict) {
      throw new Error('roomId not found: ' + roomId)
    }

    const memberRawPayload = memberRawPayloadDict[contactId]
    if (!memberRawPayload) {
      throw new Error('contactId not found in room member dict')
    }

    return memberRawPayload
  }

  public async syncRoomMember(
    roomId: string,
  ): Promise<{ [contactId: string]: PadchatRoomMemberPayload }> {
    log.silly('PuppetPadchatBridge', 'syncRoomMember(%s)', roomId)

    // const memberListPayload = await this.padchatRpc.WXGetChatRoomMember(roomId)
    const memberListPayload = await this.WXGetChatRoomMember(roomId)

    if (!memberListPayload) {
      throw new Error('no memberListPayload')
    }

    log.silly('PuppetPadchatBridge', 'syncRoomMember(%s) total %d members',
                                      roomId,
                                      Object.keys(memberListPayload).length,
              )

    const memberDict: { [contactId: string]: PadchatRoomMemberPayload } = {}

    for (const memberPayload of memberListPayload.member) {
      const      contactId  = memberPayload.user_name
      memberDict[contactId] = memberPayload
    }

    if (!this.cacheRoomMemberRawPayload) {
      throw new Error('cache not inited' )
    }

    const oldMemberDict = this.cacheRoomMemberRawPayload.get(roomId)
    const newMemberDict = {
      ...oldMemberDict,
      ...memberDict,
    }
    this.cacheRoomMemberRawPayload.set(roomId, newMemberDict)

    return newMemberDict
  }

  public async syncContactsAndRooms(): Promise<void> {
    log.verbose('PuppetPadchatBridge', `syncContactsAndRooms()`)

    let cont = true
    while (cont && this.state.on() && this.selfId) {
      log.silly('PuppetPadchatBridge', `syncContactsAndRooms() while() syncing WXSyncContact ...`)

      // const syncContactList = await this.padchatRpc.WXSyncContact()
      const syncContactList = await this.WXSyncContact()

      await new Promise(r => setTimeout(r, 1 * 1000))

      // console.log('syncContactList:', syncContactList)

      if (!Array.isArray(syncContactList) || syncContactList.length <= 0) {
        console.log('syncContactList:', syncContactList)
        log.error('PuppetPadchatBridge', 'syncContactsAndRooms() cannot get array result!')
        continue
      }

      if (   !this.cacheContactRawPayload
          || !this.cacheRoomRawPayload
      ) {
        throw new Error('no cache')
      }

      log.silly('PuppetPadchatBridge', 'syncContactsAndRooms() updating %d to Contact(%d) & Room(%d) ...',
                                          syncContactList.length,
                                          this.cacheContactRawPayload.size,
                                          this.cacheRoomRawPayload.size,
                  )

      for (const syncContact of syncContactList) {

        if (syncContact.continue !== PadchatContinue.Go) {
          log.verbose('PuppetPadchatBridge', 'syncContactsAndRooms() sync contact done!')
          cont = false
          break
        }

        if (syncContact.msg_type === PadchatContactMsgType.Contact) {
          if (pfHelper.isRoomId(syncContact.user_name)) { // /@chatroom$/.test(syncContact.user_name)) {
            /**
             * Room
             */
            log.silly('PuppetPadchatBridge', 'syncContactsAndRooms() updating Room %s(%s)',
                        syncContact.nick_name,
                        syncContact.user_name,
            )
            const roomId = syncContact.user_name
            const roomPayload = syncContact as PadchatRoomPayload

            this.cacheRoomRawPayload.set(roomId, roomPayload)
            await this.syncRoomMember(roomId)

          } else if (pfHelper.isContactId(syncContact.user_name)) {
            /**
             * Contact
             */
            log.silly('PuppetPadchatBridge', 'syncContactsAndRooms() updating Contact %s(%s)',
                        syncContact.nick_name,
                        syncContact.user_name,
            )
            const contactPayload = syncContact as PadchatContactPayload
            const contactId = contactPayload.user_name

            this.cacheContactRawPayload.set(contactId, contactPayload)

          } else {
            throw new Error('id is neither room nor contact')
          }
        } else {
          // {"continue":1,"msg_type":2048,"status":1,"uin":4763975}
          if (   syncContact.continue === PadchatContinue.Go
              && syncContact.msg_type === PadchatContactMsgType.N11_2048
              && typeof syncContact.uin !== 'undefined'
          ) {
            // XXX: HeartBeat???
            // discard it in silent
          } else {
            log.silly('PuppetPadchatBridge', `syncContactsAndRooms() skip for syncContact.msg_type=%s(%s) %s`,
              syncContact.msg_type && PadchatContactMsgType[syncContact.msg_type],
              syncContact.msg_type,
              JSON.stringify(syncContact),
            )
          }
        }
      }
    }
  }

  public async contactRawPayload(contactid: string): Promise<PadchatContactPayload> {
    log.silly('PuppetPadchatBridge', 'contactRawPayload(%s)', contactid)

    const rawPayload = await Misc.retry(async (retry, attempt) => {
      log.silly('PuppetPadchatBridge', 'contactRawPayload(%s) retry() attempt=%d', contactid, attempt)

      if (!this.cacheContactRawPayload) {
        throw new Error('no cache')
      }

      if (this.cacheContactRawPayload.has(contactid)) {
        return this.cacheContactRawPayload.get(contactid)
      }

      // const tryRawPayload =  await this.padchatRpc.WXGetContactPayload(contactid)
      const tryRawPayload =  await this.WXGetContactPayload(contactid)
      if (tryRawPayload) {
        this.cacheContactRawPayload.set(contactid, tryRawPayload)
        return tryRawPayload
      }
      return retry(new Error('tryRawPayload empty'))
    })

    if (!rawPayload) {
      throw new Error('no raw payload')
    }
    return rawPayload
  }

  public async roomRawPayload(id: string): Promise<PadchatRoomPayload> {
    log.verbose('PuppetPadchatBridge', 'roomRawPayload(%s)', id)

    const rawPayload = await Misc.retry(async (retry, attempt) => {
      log.silly('PuppetPadchatBridge', 'roomRawPayload(%s) retry() attempt=%d', id, attempt)

      if (!this.cacheRoomRawPayload) {
        throw new Error('no cache')
      }

      if (this.cacheRoomRawPayload.has(id)) {
        return this.cacheRoomRawPayload.get(id)
      }

      // const tryRawPayload = await this.padchatRpc.WXGetRoomPayload(id)
      const tryRawPayload = await this.WXGetRoomPayload(id)
      if (tryRawPayload) {
        this.cacheRoomRawPayload.set(id, tryRawPayload)
        return tryRawPayload
      }
      return retry(new Error('tryRawPayload empty'))
    })

    if (!rawPayload) {
      throw new Error('no raw payload')
    }
    return rawPayload
  }

  public async ding(): Promise<string> {
    // const result = await this.padchatRpc.WXHeartBeat()
    const result = await this.WXHeartBeat()
    return result.message
  }
}

export default Bridge
