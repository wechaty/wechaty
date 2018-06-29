import path   from 'path'
import os     from 'os'
import fs     from 'fs-extra'

import { MemoryCard }     from 'memory-card'
import { StateSwitch }    from 'state-switch'
import { FlashStoreSync } from 'flash-store'
import {
  Subscription,
}                         from 'rxjs'
import {
  DelayQueueExector,
}                         from 'rx-queue'
import { FileBox }        from 'file-box'

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
  fileBoxToQrcode,
  isContactId,
  isRoomId,
}                   from './pure-function-helpers/'

import {
  log,
}           from '../config'

const MEMORY_SLOT_NAME = 'WECHATY_PUPPET_PADCHAT'

export interface PadchatMemorySlot {
  device: {
    [userId: string]: undefined | {
      data  : string,
      token : string,
    },
  },
  currentUserId?: string,
}

export interface ManagerOptions {
  memory   : MemoryCard,
  endpoint : string,
  token    : string,
}

export class PadchatManager extends PadchatRpc {
  private memorySlot: PadchatMemorySlot

  private loginScanQrcode? : string
  private loginScanStatus? : number
  private loginScanTimer?  : NodeJS.Timer

  private userId?: string

  private cacheContactRawPayload?    : FlashStoreSync<string, PadchatContactPayload>
  private cacheRoomMemberRawPayload? : FlashStoreSync<string, {
    [contactId: string]: PadchatRoomMemberPayload,
  }>
  private cacheRoomRawPayload?       : FlashStoreSync<string, PadchatRoomPayload>

  private readonly state                  : StateSwitch
  private readonly delayQueueExecutor     : DelayQueueExector
  private delayQueueExecutorSubscription? : Subscription

  private syncContactAndRoomTimer?: NodeJS.Timer

  constructor(
    public options: ManagerOptions,
  ) {
    super(options.endpoint, options.token)
    log.verbose('PuppetPadchatManager', 'constructor()')

    this.memorySlot = {
      device: {},
    }

    this.state = new StateSwitch('PuppetPadchatManager')

    /**
     * Executer Queue: execute one task at a time,
     *  delay between them for 15 second
     */
    this.delayQueueExecutor = new DelayQueueExector(1000 * 15)

  }

  protected async initCache(
    token  : string,
    userId : string,
  ): Promise<void> {
    log.verbose('PuppetPadchatManager', 'initCache(%s, %s)', token, userId)

    if (   this.cacheContactRawPayload
        || this.cacheRoomMemberRawPayload
        || this.cacheRoomRawPayload
    ) {
      throw new Error('cache exists')
    }

    const baseDir = path.join(
      os.homedir(),
      path.sep,
      '.wechaty',
      'puppet-padchat-cache',
      path.sep,
      token,
      path.sep,
      userId,
    )

    const baseDirExist = await fs.pathExists(baseDir)

    if (!baseDirExist) {
      await fs.mkdirp(baseDir)
    }

    this.cacheContactRawPayload    = new FlashStoreSync(path.join(baseDir, 'contact-raw-payload'))
    this.cacheRoomMemberRawPayload = new FlashStoreSync(path.join(baseDir, 'room-member-raw-payload'))
    this.cacheRoomRawPayload       = new FlashStoreSync(path.join(baseDir, 'room-raw-payload'))

    await Promise.all([
      this.cacheContactRawPayload.ready(),
      this.cacheRoomMemberRawPayload.ready(),
      this.cacheRoomRawPayload.ready(),
    ])

    const roomMemberTotalNum = [...this.cacheRoomMemberRawPayload.values()].reduce(
      (accuVal, currVal) => {
        return accuVal + Object.keys(currVal).length
      },
      0,
    )

    log.verbose('PuppetPadchatManager', 'initCache() inited %d Contacts, %d RoomMembers, %d Rooms, cachedir="%s"',
                                      this.cacheContactRawPayload.size,
                                      roomMemberTotalNum,
                                      this.cacheRoomRawPayload.size,
                                      baseDir,
              )
  }

  protected async releaseCache(): Promise<void> {
    log.verbose('PuppetPadchatManager', 'releaseCache()')

    if (   this.cacheContactRawPayload
        && this.cacheRoomMemberRawPayload
        && this.cacheRoomRawPayload
    ) {
      log.silly('PuppetPadchatManager', 'releaseCache() closing caches ...')

      await Promise.all([
        this.cacheContactRawPayload.close(),
        this.cacheRoomMemberRawPayload.close(),
        this.cacheRoomRawPayload.close(),
      ])

      this.cacheContactRawPayload    = undefined
      this.cacheRoomMemberRawPayload = undefined
      this.cacheRoomRawPayload       = undefined

      log.silly('PuppetPadchatManager', 'releaseCache() cache closed.')
    } else {
      log.verbose('PuppetPadchatManager', 'releaseCache() cache not exist.')
    }
  }

  public async start(): Promise<void> {
    log.verbose('PuppetPadchatManager', `start()`)

    if (this.userId) {
      throw new Error('userId exist')
    }

    this.state.on('pending')

    /**
     * Sometimes the RPC WebSocket will failure on connect in super.start(),
     *  if that's true then a Error will be throw out.
     *  Try again in the following while loop until the state is not on('pending')
     */
    while (this.state.on() === 'pending') {
      try {
        await super.start()
        break
      } catch (e) {
        log.warn('PuppetPadchatManager', 'start() super.start() exception: %s', e)
        await super.stop()
        await new Promise(r => setTimeout(r, 1000))
        log.warn('PuppetPadchatManager', 'start() super.start() retry now ...')
      }
    }

    if (this.delayQueueExecutorSubscription) {
      throw new Error('this.delayExecutorSubscription exist')
    } else {
      this.delayQueueExecutorSubscription = this.delayQueueExecutor.subscribe(unit => {
        log.verbose('PuppetPadchatManager', 'startQueues() delayQueueExecutor.subscribe(%s) executed', unit.name)
      })
    }

    this.memorySlot = {
      ...this.memorySlot,
      ...await this.options.memory.get<PadchatMemorySlot>(MEMORY_SLOT_NAME),
    }

    await this.tryLoad62Data()

    const succeed = await this.tryAutoLogin(this.memorySlot)
    if (!succeed) {
      await this.startCheckScan()
    }

    this.state.on(true)
  }

  public async stop(): Promise<void> {
    log.verbose('PuppetPadchatManager', `stop()`)

    this.state.off('pending')

    if (this.syncContactAndRoomTimer) {
      clearTimeout(this.syncContactAndRoomTimer)
      this.syncContactAndRoomTimer = undefined
    }

    if (this.delayQueueExecutorSubscription) {
      this.delayQueueExecutorSubscription.unsubscribe()
      this.delayQueueExecutorSubscription = undefined
    } else {
      log.warn('PuppetPadchatManager', 'stop() subscript not exist')
    }

    await this.stopCheckScan()
    await super.stop()
    await this.releaseCache()

    this.userId          = undefined
    this.loginScanQrcode = undefined
    this.loginScanStatus = undefined

    this.state.off(true)
  }

  protected async onLogin(userId: string): Promise<void> {
    log.verbose('PuppetPadchatManager', `login(%s)`, userId)

    if (this.userId) {
      throw new Error('userId exist')
    }
    this.userId = userId

    await this.stopCheckScan()

    /**
     * Update Memory Slot
     */
    this.memorySlot = await this.refreshMemorySlotData(
      this.memorySlot,
      userId,
    )
    await this.options.memory.set(MEMORY_SLOT_NAME, this.memorySlot)
    await this.options.memory.save()

    /**
     * Init persistence cache
     */
    await this.initCache(this.options.token, this.userId)

    /**
     * Refresh the login-ed user payload
     */
    if (this.cacheContactRawPayload) {
      this.cacheContactRawPayload.delete(this.userId)
      await this.contactRawPayload(this.userId)
    }

    this.emit('login', this.userId)
  }

  public async logout(): Promise<void> {
    log.verbose('PuppetPadchatManager', `logout()`)

    if (!this.userId) {
      log.warn('PuppetPadchatManager', 'logout() userId not exist, already logout-ed')
      return
    }

    this.userId = undefined
    await this.releaseCache()

    await this.startCheckScan()
  }

  protected async stopCheckScan(): Promise<void> {
    log.verbose('PuppetPadchatManager', `stopCheckScan()`)

    if (this.loginScanTimer) {
      clearTimeout(this.loginScanTimer)
      this.loginScanTimer = undefined
    }
    this.loginScanQrcode = undefined
    this.loginScanStatus = undefined
  }

  protected async startCheckScan(): Promise<void> {
    log.verbose('PuppetPadchatManager', `startCheckScan()`)

    if (this.userId) {
      log.warn('PuppetPadchatManager', 'startCheckScan() this.userId exist.')
      await this.onLogin(this.userId)
      return
    }

    if (this.loginScanTimer) {
      log.warn('PuppetPadchatManager', 'startCheckScan() this.loginScanTimer exist.')
      return
    }

    const checkScanInternalLoop = async () => {
      log.silly('PuppetPadchatManager', `startCheckScan() checkScanInternalLoop()`)

      /**
       * While we want to Wait user response
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
          /**
           * result.expire_time is second
           * emit new qrcode 10 seconds before the old one expired
           */
          this.loginScanQrcode = undefined
          this.loginScanStatus = undefined
          waitUserResponse = false
          continue
        }

        switch (result.status) {
          case WXCheckQRCodeStatus.WaitScan:
            log.silly('PuppetPadchatManager', 'checkQrcode: Please scan the Qrcode!')
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
            log.silly('PuppetPadchatManager', 'checkQrcode: Had scan the Qrcode, but not Login!')
            break

          case WXCheckQRCodeStatus.Confirmed:
            log.silly('PuppetPadchatManager', 'checkQrcode: Trying to login... please wait')

            if (!result.user_name || !result.password) {
              throw Error('PuppetPadchatManager, checkQrcode, cannot get username or password here, return!')
            }

            const loginResult = await this.WXQRCodeLogin(result.user_name, result.password)

            await this.onLogin(loginResult.user_name)
            return

          case WXCheckQRCodeStatus.Timeout:
            log.silly('PuppetPadchatManager', 'checkQrcode: Timeout')
            this.loginScanQrcode = undefined
            this.loginScanStatus = undefined
            waitUserResponse = false
            break

          case WXCheckQRCodeStatus.Cancel:
            log.silly('PuppetPadchatManager', 'user cancel')
            this.loginScanQrcode = undefined
            this.loginScanStatus = undefined
            waitUserResponse = false
            break

          default:
            log.warn('PuppetPadchatManager', 'startCheckScan() unknown WXCheckQRCodeStatus: ' + result.status)
            this.loginScanQrcode = undefined
            this.loginScanStatus = undefined
            waitUserResponse = false
            break
        }

        await new Promise(r => setTimeout(r, 1000))
      }

      await this.emitLoginQrcode()
      this.loginScanTimer = setTimeout(async () => {
        this.loginScanTimer = undefined
        await checkScanInternalLoop()
      }, 1000)

      return
    }

    checkScanInternalLoop()
    .then(() => {
      log.silly('PuppetPadchatManager', `startCheckScan() checkScanInternalLoop() resolved`)
    })
    .catch(e => {
      log.warn('PuppetPadchatManager', 'startCheckScan() checkScanLoop() exception: %s', e)
      this.reset('startCheckScan() checkScanLoop() exception')
    })
    log.silly('PuppetPadchatManager', `startCheckScan() checkScanInternalLoop() set`)
  }

  /**
   * Offline, then relogin
   * emit qrcode or send login request to the user.
   */
  protected async tryAutoLogin(memorySlot: PadchatMemorySlot): Promise<boolean> {
    log.verbose('PuppetPadchatManager', `tryAutoLogin(%s)`, memorySlot.currentUserId)

    const currentUserId = memorySlot.currentUserId
    if (!currentUserId) {
      log.silly('PuppetPadchatManager', 'tryAutoLogin() currentUserId not found in memorySlot')
      return false
    }

    const deviceInfo = memorySlot.device[currentUserId]
    if (!deviceInfo) {
      log.silly('PuppetPadchatManager', 'tryAutoLogin() deviceInfo not found for userId "%s"', currentUserId)
      return false
    }

    const token = deviceInfo.token
    if (!token) {
      log.silly('PuppetPadchatManager', 'tryAutoLogin() token not found for userId "%s"', currentUserId)
      return false
    }

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
    if (!autoLoginResult) {

      /**
       * 1.1 Delete token for prevent future useless auto login retry
       */
      delete deviceInfo.token
      await this.options.memory.set(MEMORY_SLOT_NAME, memorySlot)
      await this.options.memory.save()

      await this.emitLoginQrcode()
      return false
    }

    /**
     * 2 Auto Login Success
     */
    if (autoLoginResult.status === 0) {
      await this.onLogin(autoLoginResult.user_name)
      return true

    }

    /**
     * 3. Auto Login data valid, but need user to confirm.
     *  Send Login Request to User to be confirm(the same as the user had scaned the QrCode)
     *  with a valid Login Request, wait user to confirm on the phone.
     */
    const loginRequestResult = await this.WXLoginRequest(token)
    if (loginRequestResult && loginRequestResult.status === 0) {
      return false
    }

    /**
     * 4 Send Login Request to user fail, emit QrCode for scan.
     */
    await this.emitLoginQrcode()

    /**
     * 5 Delete token for prevent future useless auto login retry
     */
    delete deviceInfo.token
    await this.options.memory.set(MEMORY_SLOT_NAME, memorySlot)
    await this.options.memory.save()

    return false
  }

  protected async emitLoginQrcode(): Promise<void> {
    log.verbose('PuppetPadchatManager', `emitLoginQrCode()`)

    if (this.loginScanQrcode) {
      throw new Error('qrcode exist')
    }

    const result = await this.WXGetQRCode()
    if (!result || !result.qr_code) {
      log.verbose('PuppetPadchatManager', `emitLoginQrCode() result not found. Call WXInitialize() and try again ...`)

      await this.WXInitialize()

      // wait 1 second and try again
      await new Promise(r => setTimeout(r, 1000))
      return await this.emitLoginQrcode()
    }

    const fileBox = FileBox.fromBase64(result.qr_code, 'qrcode.jpg')
    const qrcodeDecoded = await fileBoxToQrcode(fileBox)

    this.loginScanQrcode = qrcodeDecoded
    this.loginScanStatus = WXCheckQRCodeStatus.WaitScan

    this.emit(
      'scan',
      this.loginScanQrcode,
      this.loginScanStatus,
    )
  }

  protected async refreshMemorySlotData(
    memorySlot: PadchatMemorySlot,
    userId   : string,
  ): Promise<PadchatMemorySlot> {
    log.verbose('PuppetPadchatManager', `refresh62Data(%s, %s)`, userId)

    /**
     * must do a HeatBeat before WXGenerateWxData()
     */
    await this.WXHeartBeat()

    /**
     * 1. Empty memorySlot, init & return it
     */
    if (!memorySlot.currentUserId) {
      log.silly('PuppetPadchatManager', 'refresh62Data() memorySlot is empty, init & return it')

      const data  = await this.WXGenerateWxDat()
      const token = await this.WXGetLoginToken()

      memorySlot.currentUserId = userId
      memorySlot.device[userId] = {
        data,
        token,
      }

      return memorySlot
    }

    /**
     * 2. User account not changed between this and the last login session
     */
    if (memorySlot.currentUserId === userId) {
      log.silly('PuppetPadchatManager', 'refresh62Data() userId did not change since last login, keep the data as the same')

      // Update Token
      memorySlot.device[userId]!.token = await this.WXGetLoginToken()

      return memorySlot
    }

    /**
     * 3. Current user is a user that had used this memorySlot, use the old data for it.
     */
    if (userId in memorySlot.device) {
      log.silly('PuppetPadchatManager', 'refresh62Data() current userId has existing device info, set %s as currentUserId and use old data for it',
                                        userId,
                )
      memorySlot.currentUserId = userId

      memorySlot.device[userId] = {
        ...memorySlot.device[userId]!,
        token : await this.WXGetLoginToken(),
      }

      return memorySlot
    }

    /**
     * 4. New user login, generate 62data for it
     */
    // Build a new code block to make tslint happy: no-shadow-variable
    if (true) {
      log.verbose('PuppetPadchatManager', 'refresh62Data() user switch detected: from "%s" to "%s"',
                                          memorySlot.currentUserId,
                                          userId,
                  )

      const data  = await this.WXGenerateWxDat()
      const token = await this.WXGetLoginToken()

      memorySlot.currentUserId = userId
      memorySlot.device[userId] = {
        data,
        token,
      }

      return memorySlot
    }
  }

  protected async tryLoad62Data(): Promise<void> {
    log.verbose('PuppetPadchatManager', `tryLoad62Data()`)

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
      log.silly('PuppetPadchatManager', `tryLoad62Data() 62 data found: "%s"`, deviceInfo.data)
      await this.WXLoadWxDat(deviceInfo.data)
    } else {
      log.silly('PuppetPadchatManager', `tryLoad62Data() 62 data not found`)
    }
  }

  public getContactIdList(): string[] {
    log.verbose('PuppetPadchatManager', 'getContactIdList()')
    if (!this.cacheContactRawPayload) {
      throw new Error('cache not inited' )
    }
    const contactIdList = [...this.cacheContactRawPayload.keys()]
    log.silly('PuppetPadchatManager', 'getContactIdList() = %d', contactIdList.length)
    return contactIdList
  }

  public getRoomIdList(): string[] {
    log.verbose('PuppetPadchatManager', 'getRoomIdList()')
    if (!this.cacheRoomRawPayload) {
      throw new Error('cache not inited' )
    }
    const roomIdList = [...this.cacheRoomRawPayload.keys()]
    log.verbose('PuppetPadchatManager', 'getRoomIdList()=%d', roomIdList.length)
    return roomIdList
  }

  public roomMemberRawPayloadDirty(
    roomId: string,
  ): void {
    log.verbose('PuppetPadchatManager', 'roomMemberRawPayloadDirty(%d)', roomId)
    if (!this.cacheRoomMemberRawPayload) {
      throw new Error('cache not inited' )
    }
    this.cacheRoomMemberRawPayload.delete(roomId)
  }

  public async getRoomMemberIdList(
    roomId: string,
    dirty = false,
  ): Promise<string[]> {
    log.verbose('PuppetPadchatManager', 'getRoomMemberIdList(%d)', roomId)
    if (!this.cacheRoomMemberRawPayload) {
      throw new Error('cache not inited' )
    }

    if (dirty) {
      this.roomMemberRawPayloadDirty(roomId)
    }

    const memberRawPayloadDict = this.cacheRoomMemberRawPayload.get(roomId)
                                || await this.syncRoomMember(roomId)

    if (!memberRawPayloadDict) {
      // or return [] ?
      throw new Error('roomId not found: ' + roomId)
    }

    const memberIdList = Object.keys(memberRawPayloadDict)

    // console.log('memberRawPayloadDict:', memberRawPayloadDict)
    log.verbose('PuppetPadchatManager', 'getRoomMemberIdList(%d) length=%d', roomId, memberIdList.length)
    return memberIdList
  }

  public roomRawPayloadDirty(
    roomId: string,
  ): void {
    log.verbose('PuppetPadchatManager', 'roomRawPayloadDirty(%d)', roomId)
    if (!this.cacheRoomRawPayload) {
      throw new Error('cache not inited' )
    }
    this.cacheRoomRawPayload.delete(roomId)
  }

  public async roomMemberRawPayload(roomId: string): Promise<{ [contactId: string]: PadchatRoomMemberPayload }> {
    log.verbose('PuppetPadchatManager', 'roomMemberRawPayload(%s)', roomId)

    if (!this.cacheRoomMemberRawPayload) {
      throw new Error('cache not inited' )
    }

    const memberRawPayloadDict = this.cacheRoomMemberRawPayload.get(roomId)
                                || await this.syncRoomMember(roomId)

    if (!memberRawPayloadDict) {
      throw new Error('roomId not found: ' + roomId)
    }

    return memberRawPayloadDict
  }

  public async syncRoomMember(
    roomId: string,
  ): Promise<{ [contactId: string]: PadchatRoomMemberPayload }> {
    log.silly('PuppetPadchatManager', 'syncRoomMember(%s)', roomId)

    const memberListPayload = await this.WXGetChatRoomMember(roomId)

    if (!memberListPayload || !('user_name' in memberListPayload)) { // check user_name too becasue the server might return {}
      /**
       * Room Id not exist
       * See: https://github.com/lijiarui/wechaty-puppet-padchat/issues/64#issuecomment-397319016
       */
      this.roomMemberRawPayloadDirty(roomId)
      this.roomRawPayloadDirty(roomId)

      return {}

    }

    log.silly('PuppetPadchatManager', 'syncRoomMember(%s) total %d members',
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
    log.verbose('PuppetPadchatManager', `syncContactsAndRooms()`)

    let cont = true
    while (cont && this.state.on() && this.userId) {
      log.silly('PuppetPadchatManager', `syncContactsAndRooms() while() syncing WXSyncContact ...`)

      await new Promise(r => setTimeout(r, 10 * 1000))
      const syncContactList = await this.WXSyncContact()

      if (!Array.isArray(syncContactList) || syncContactList.length <= 0) {
        // {"apiName":"WXSyncContact","data":"%7B%22message%22%3A%22%E4%B8%8D%E6%94%AF%E6%8C%81%E7%9A%84%E8%AF%B7%E6%B1%82%22%2C%22status%22%3A-19%7D"}
        // data => { message: '不支持的请求', status: -19 }
        log.warn('PuppetPadchatManager', 'syncContactsAndRooms() cannot get array result: %s', JSON.stringify(syncContactList))
        cont = false
        return
      }

      if (   !this.cacheContactRawPayload
          || !this.cacheRoomRawPayload
      ) {
        throw new Error('no cache')
      }

      log.silly('PuppetPadchatManager', 'syncContactsAndRooms() syncing %d out of Contact(%d) & Room(%d) ...',
                                          syncContactList.length,
                                          this.cacheContactRawPayload.size,
                                          this.cacheRoomRawPayload.size,
                  )

      for (const syncContact of syncContactList) {

        if (syncContact.continue !== PadchatContinue.Go) {
          log.verbose('PuppetPadchatManager', 'syncContactsAndRooms() sync contact done!')
          cont = false
          break
        }

        if (syncContact.msg_type === PadchatContactMsgType.Contact) {
          if (isRoomId(syncContact.user_name)) {
            /**
             * Room
             */
            log.silly('PuppetPadchatManager', 'syncContactsAndRooms() updating Room %s(%s)',
                        syncContact.nick_name,
                        syncContact.user_name,
            )
            const roomId = syncContact.user_name
            const roomPayload = syncContact as PadchatRoomPayload

            this.cacheRoomRawPayload.set(roomId, roomPayload)

            /**
             * Use delay queue executor to sync room:
             *  add syncRoomMember task to the queue
             */
            await this.delayQueueExecutor.execute(
              () => this.syncRoomMember(roomId),
              `syncRoomMember(${roomId})`,
            )
            log.silly('PuppetPadchatManager', 'syncContactsAndRooms() added sync room(%s) task to delayQueueExecutor', roomId)

          } else if (isContactId(syncContact.user_name)) {
            /**
             * Contact
             */
            log.silly('PuppetPadchatManager', 'syncContactsAndRooms() updating Contact %s(%s)',
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
            // HeartBeat??? discard it in silent
          } else {
            log.silly('PuppetPadchatManager', `syncContactsAndRooms() skip for syncContact.msg_type=%s(%s) %s`,
              syncContact.msg_type && PadchatContactMsgType[syncContact.msg_type],
              syncContact.msg_type,
              JSON.stringify(syncContact),
            )
          }
        }
      }
    }

    this.syncContactAndRoomTimer = setTimeout(async () => {
      await this.syncContactsAndRooms()
    }, 3 * 60 * 60 * 1000)

  }

  public contactRawPayloadDirty(
    contactId: string,
  ): void {
    log.verbose('PuppetPadchatManager', 'contactRawPayloadDirty(%d)', contactId)
    if (!this.cacheContactRawPayload) {
      throw new Error('cache not inited' )
    }
    this.cacheContactRawPayload.delete(contactId)
  }

  public async contactRawPayload(contactId: string): Promise<PadchatContactPayload> {
    log.silly('PuppetPadchatManager', 'contactRawPayload(%s)', contactId)

    const rawPayload = await Misc.retry(async (retry, attempt) => {
      log.silly('PuppetPadchatManager', 'contactRawPayload(%s) retry() attempt=%d', contactId, attempt)

      if (!this.cacheContactRawPayload) {
        throw new Error('no cache')
      }

      if (this.cacheContactRawPayload.has(contactId)) {
        return this.cacheContactRawPayload.get(contactId)
      }

      const tryRawPayload =  await this.WXGetContactPayload(contactId)

      // check user_name too becasue the server might return {}
      // See issue #1358 https://github.com/Chatie/wechaty/issues/1358
      if (tryRawPayload /* && tryRawPayload.user_name */) {
        this.cacheContactRawPayload.set(contactId, tryRawPayload)
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
    log.verbose('PuppetPadchatManager', 'roomRawPayload(%s)', id)

    const rawPayload = await Misc.retry(async (retry, attempt) => {
      log.silly('PuppetPadchatManager', 'roomRawPayload(%s) retry() attempt=%d', id, attempt)

      if (!this.cacheRoomRawPayload) {
        throw new Error('no cache')
      }

      if (this.cacheRoomRawPayload.has(id)) {
        return this.cacheRoomRawPayload.get(id)
      }

      const tryRawPayload = await this.WXGetRoomPayload(id)

      // check user_name too becasue the server might return {}
      // See issue #1358 https://github.com/Chatie/wechaty/issues/1358
      if (tryRawPayload /* && tryRawPayload.user_name */) {
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

  public ding(data?: string): void {
    log.verbose('PuppetPadchatManager', 'ding(%s)', data || '')
    // TODO: healthy check
    this.emit('dong')
    return
  }
}

export default PadchatManager
