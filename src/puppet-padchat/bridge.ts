import { EventEmitter } from 'events'

import { MemoryCard }   from 'memory-card'
import { StateSwitch }  from 'state-switch'

import Misc           from '../misc'

import {
  PadchatContinue,
  // PadchatMsgType,
  // PadchatStatus,

  // PadchatPayload,
  // PadchatPayloadType,

  PadchatContactMsgType,
  PadchatContactPayload,

  // PadchatMessagePayload,

  // PadchatRoomMember,
  PadchatRoomMemberPayload,
  // PadchatRoomMemberListPayload,
  PadchatRoomPayload,
}                             from './padchat-schemas'

import {
  AutoDataType,
  // PadchatRpcRequest,
  // InitType,
  // WXGenerateWxDatType,
  // WXGetQRCodeType,
  // WXInitializeType,
  // WXCheckQRCodePayload,
  // WXHeartBeatType,
  // WXGetLoginTokenType,
  // WXAutoLoginType,
  // WXLoginRequestType,
  // WXSendMsgType,
  // WXLoadWxDatType,
  // WXQRCodeLoginType,
  WXCheckQRCodeStatus,
  StandardType,
  // WXAddChatRoomMemberType,
}                             from './padchat-rpc.type'

import {
  PadchatRpc,
}                 from './padchat-rpc'

import {
  PadchatPureFunctionHelper as pfHelper,
}                                           from './pure-function-helper'

import { log }          from '../config'

const AUTO_DATA_SLOT = 'autoData'

export interface BridgeOptions {
  memory   : MemoryCard,
  endpoint : string,
  token    : string,
}

export class Bridge extends EventEmitter {
  private readonly padchatRpc: PadchatRpc
  private autoData         : AutoDataType

  private loginScanQrCode? : string
  private loginScanStatus? : number

  private loginTimer?: NodeJS.Timer

  private selfId? : string
  // private password? : string
  // private nickname? : string

  private cacheRoomRawPayload       : { [id: string]: PadchatRoomPayload        }
  private cacheContactRawPayload    : { [id: string]: PadchatContactPayload     }

  /**
   * cacheRoomMemberRawPayload[roomId1][contactId1] = payload1
   * cacheRoomMemberRawPayload[roomId1][contactId2] = payload2
   *
   * cacheRoomMemberRawPayload[roomId2][contactId2] = payload3
   * cacheRoomMemberRawPayload[roomId2][contactId3] = payload4
   */
  private cacheRoomMemberRawPayload : {
    [roomId: string]: {
      [contactId: string]: PadchatRoomMemberPayload,
    },
  }

  private readonly state: StateSwitch

  constructor(
    public options: BridgeOptions,
  ) {
    super() // for EventEmitter
    log.verbose('PuppetPadchatBridge', 'constructor()')

    // this.userId   = options.token
    this.cacheRoomRawPayload       = {}
    this.cacheRoomMemberRawPayload = {}
    this.cacheContactRawPayload    = {}
    this.autoData                  = {}

    this.padchatRpc = new PadchatRpc(options.endpoint, options.token)
    this.state      = new StateSwitch('PuppetPadchatBridge')
  }

  public async start(): Promise<void> {
    log.verbose('PuppetPadchatBridge', `start()`)

    this.cacheRoomRawPayload       = {}
    this.cacheRoomMemberRawPayload = {}
    this.cacheContactRawPayload    = {}

    if (this.selfId) {
      throw new Error('selfId exist')
    }

    this.state.on('pending')

    await this.padchatRpc.start()
    this.padchatRpc.on('message', messageRawPayload => {
      log.silly('PuppetPadchatBridge', `start() padchatRpc.on('message')`)
      this.emit('message', messageRawPayload)
    })

    // TODO: 顺序变一下，要check user_name 的
    await this.loadAutoData()

    const restoreSucceed = await this.restoreLogin()

    if (!restoreSucceed) {
      this.startLogin()
    }

    this.state.on(true)
  }

  public async stop(): Promise<void> {
    log.verbose('PuppetPadchatBridge', `stop()`)

    this.state.off('pending')

    await this.padchatRpc.stop()

    this.cacheContactRawPayload    = {}
    this.cacheRoomRawPayload       = {}
    this.cacheRoomMemberRawPayload = {}

    this.selfId          = undefined
    this.loginScanQrCode = undefined
    if (this.loginTimer) {
      clearTimeout(this.loginTimer)
      this.loginTimer = undefined
    }

    this.state.off(true)
  }

  protected async login(username: string): Promise<void> {
    if (this.selfId) {
      throw new Error('username exist')
    }

    this.stopLogin()

    this.selfId = username
    this.emit('login', this.selfId)

    this.saveAutoData(this.selfId)

  }

  public logout(): void {
    if (!this.selfId) {
      throw new Error('no username')
    }

    this.selfId = undefined
    this.startLogin()
  }

  protected async stopLogin(): Promise<void> {
    log.verbose('PuppetPadchatBridge', `stopLogin()`)

    if (this.loginTimer) {
      clearTimeout(this.loginTimer)
      this.loginTimer = undefined
    }
    this.loginScanQrCode = undefined
    this.loginScanStatus = undefined
  }

  protected async startLogin(): Promise<void> {
    log.verbose('PuppetPadchatBridge', `startLogin()`)

    if (this.selfId) {
      log.warn('PuppetPadchatBridge', 'startLogin() this.username exist.')
      this.login(this.selfId)
      return
    }

    if (this.loginTimer) {
      log.warn('PuppetPadchatBridge', 'startLogin() this.scanTimer exist.')
      return
    }

    /**
     * 2. Wait user response
     */
    let waitUserResponse = true
    while (waitUserResponse) {
      const result = await this.padchatRpc.WXCheckQRCode()

      if (this.loginScanStatus !== result.status && this.loginScanQrCode) {
        this.loginScanStatus = result.status
        this.emit(
          'scan',
          this.loginScanQrCode,
          this.loginScanStatus,
        )
      }

      if (result.expired_time && result.expired_time < 10) {
        // result.expire_time is second
        // emit new qrcode before the old one expired
        waitUserResponse = false
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

          const loginResult = await this.padchatRpc.WXQRCodeLogin(result.user_name, result.password)

          this.autoData.nick_name = loginResult.nick_name
          this.autoData.user_name = loginResult.user_name

          this.login(loginResult.user_name)
          return

        case WXCheckQRCodeStatus.Timeout:
          log.silly('PuppetPadchatBridge', 'checkQrcode: Timeout')
          this.loginScanQrCode = undefined
          this.loginScanStatus = undefined
          waitUserResponse = false
          break

        case WXCheckQRCodeStatus.Cancel:
          log.silly('PuppetPadchatBridge', 'user cancel')
          this.loginScanQrCode = undefined
          this.loginScanStatus = undefined
          waitUserResponse = false
          break

        default:
          log.warn('PadchatBridge', 'startLogin() unknown WXCheckQRCodeStatus: ' + result.status)
          this.loginScanQrCode = undefined
          this.loginScanStatus = undefined
          waitUserResponse = false
          break
      }

      await new Promise(r => setTimeout(r, 1000))
    }

    await this.emitLoginQrCode()
    this.loginTimer = setTimeout(() => {
      this.loginTimer = undefined
      this.startLogin()
    }, 1000)
    return
  }

  /**
   * Offline, then relogin
   * emit qrcode or send login request to the user.
   */
  protected async restoreLogin(): Promise<boolean> {
    log.verbose('PuppetPadchatBridge', `initLogin()`)

    if (!this.autoData || !this.autoData.token) {
      return false
    }

    log.silly('PuppetPadchatBridge', `initLogin() autoData.token exist for %s`,
                                    this.autoData.nick_name || 'no nick_name',
              )

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
    const autoLoginResult = await this.padchatRpc.WXAutoLogin(this.autoData.token)

    if (!autoLoginResult) {
      /**
       * 1. No Auto Login, emit QrCode for scan
       */
      await this.emitLoginQrCode()
      return false
    }

    if (autoLoginResult.status === 0) {
      /**
       * 2 Auto Login Success
       */
      this.login(autoLoginResult.user_name)
      return true

    } else {
      /**
       * 3. Send Login Request to User to be confirm(the same as the user had scaned the QrCode)
       */
      const loginRequestResult = await this.padchatRpc.WXLoginRequest(this.autoData.token)

      if (!loginRequestResult || loginRequestResult.status !== 0) {
        /**
         * 3.1 Login Request Not Valid, emit QrCode for scan.
         */
        await this.emitLoginQrCode()
        return false

      } else {
        /**
         * 3.2 Login Request Valid, wait user to confirm on the phone.
         */
        return false
      }
    }
  }

  protected async emitLoginQrCode(): Promise<void> {
    log.verbose('PuppetPadchatBridge', `emitLoginQrCode()`)

    if (this.loginScanQrCode) {
      throw new Error('qrcode exist')
    }

    const result = await this.padchatRpc.WXGetQRCode()
    if (!result) {
      log.verbose('PuppetPadchatBridge', `emitLoginQrCode() result not found. Call WXInitialize() and try again ...`)
      await this.padchatRpc.WXInitialize()
      // wait 1 second and try again
      await new Promise(r => setTimeout(r, 1000))
      return await this.emitLoginQrCode()
    }

    const qrCodeText = await pfHelper.imageBase64ToQrCode(result.qr_code)

    this.loginScanQrCode = qrCodeText
    this.loginScanStatus = WXCheckQRCodeStatus.WaitScan

    this.emit(
      'scan',
      this.loginScanQrCode,
      this.loginScanStatus,
    )

  }

  protected async saveAutoData(selfId: string): Promise<void> {
    log.verbose('PuppetPadchatBridge', `loadAutoData(%s)`, selfId)

    await this.padchatRpc.WXHeartBeat()

    if (!this.autoData.wxData || this.autoData.user_name !== selfId) {
      log.verbose('PuppetPadchatBridge', `loadAutoData() user_name(%s) !== selfId(%s)`,
                                          this.autoData.user_name,
                                          selfId,
                  )
      this.autoData.wxData = (await this.padchatRpc.WXGenerateWxDat()).data
    }

    // Check 62 data. If has then use, or save 62 data here.
    this.autoData.token  = (await this.padchatRpc.WXGetLoginToken()).token

    if (!this.autoData.user_name || !this.autoData.wxData || !this.autoData.token) {
      throw new Error('autoData error')
    }

    await this.options.memory.set(AUTO_DATA_SLOT, this.autoData)
    await this.options.memory.save()
  }

  protected async loadAutoData(): Promise<void> {
    log.verbose('PuppetPadchatBridge', `loadAutoData()`)

    this.autoData = {
      ...await this.options.memory.get(AUTO_DATA_SLOT),
    }

    // Check for 62 data, if has, then use WXLoadWxDat
    // TODO: should check this.autoData.user_name here
    if (this.autoData.wxData) {
      log.silly('PuppetPadchatBridge', `loadAutoData() load 62 data`)
      await this.padchatRpc.WXLoadWxDat(this.autoData.wxData)
    }
  }

  public getContactIdList(): string[] {
    log.verbose('PuppetPadchatBridge', 'getContactIdList()')
    const contactIdList = Object.keys(this.cacheContactRawPayload)
    log.silly('PuppetPadchatBridge', 'getContactIdList() = %d', contactIdList.length)
    return contactIdList
  }

  public getRoomIdList(): string[] {
    log.verbose('PuppetPadchatBridge', 'getRoomIdList()')
    const roomIdList = Object.keys(this.cacheRoomRawPayload)
    log.verbose('PuppetPadchatBridge', 'getRoomIdList()=%d', roomIdList.length)
    return roomIdList
  }

  public async getRoomMemberIdList(roomId: string): Promise<string[]> {
    log.verbose('PuppetPadchatBridge', 'getRoomMemberIdList(%d)', roomId)

    const memberRawPayloadDict = this.cacheRoomMemberRawPayload[roomId]
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

    const memberRawPayloadDict = this.cacheRoomMemberRawPayload[roomId]
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
    log.verbose('PuppetPadchatBridge', 'syncRoomMember(%s)', roomId)

    const memberListPayload = await this.padchatRpc.WXGetChatRoomMember(roomId)

    if (!memberListPayload) {
      throw new Error('no memberListPayload')
    }

    const memberDict: { [contactId: string]: PadchatRoomMemberPayload } = {}

    for (const memberPayload of memberListPayload.member) {
      log.info('PuppetPadchatBridge', 'syncRoomMember(%s) member(%s)="%s"',
                                      roomId,
                                      memberPayload.user_name,
                                      JSON.stringify(memberPayload),
                )

      const      contactId  = memberPayload.user_name
      memberDict[contactId] = memberPayload
    }

    this.cacheRoomMemberRawPayload[roomId] = {
      ...this.cacheRoomMemberRawPayload[roomId],
      ...memberDict,
    }

    return this.cacheRoomMemberRawPayload[roomId]
  }

  public async syncContactsAndRooms(): Promise<void> {
    log.verbose('PuppetPadchatBridge', `syncContactsAndRooms()`)

    let cont = true
    while (cont && this.state.on() && this.selfId) {
      log.silly('PuppetPadchatBridge', `syncContactsAndRooms() while() syncing WXSyncContact ...`)

      const syncContactList = await this.padchatRpc.WXSyncContact()

      await new Promise(r => setTimeout(r, 1 * 1000))

      // console.log('syncContactList:', syncContactList)

      if (!Array.isArray(syncContactList) || syncContactList.length <= 0) {
        console.log('syncContactList:', syncContactList)
        log.error('PuppetPadchatBridge', 'syncContactsAndRooms() cannot get array result!')
        continue
      }

      log.verbose('PuppetPadchatBridge', 'syncContactsAndRooms() sync contact, got new/total: %d/%d',
                                    syncContactList.length,
                                    (
                                      Object.keys(this.cacheContactRawPayload).length
                                      + Object.keys(this.cacheRoomRawPayload).length
                                    ),
                  )

      for (const syncContact of syncContactList) {

        if (syncContact.continue !== PadchatContinue.Go) {
          log.verbose('PuppetPadchatBridge', 'syncContactsAndRooms() sync contact done!')
          cont = false
          break
        }

        if (syncContact.msg_type === PadchatContactMsgType.Contact) {
          log.verbose('PuppetPadchatBridge', 'syncContactsAndRooms() sync for %s(%s)',
                                              syncContact.nick_name,
                                              syncContact.user_name,
                      )

          if (pfHelper.isRoomId(syncContact.user_name)) { // /@chatroom$/.test(syncContact.user_name)) {
            /**
             * Room
             */
            // user_name or chatroom_id ?
            const roomId = syncContact.user_name
            const roomPayload = syncContact as PadchatRoomPayload

            this.cacheRoomRawPayload[roomId] = roomPayload
            await this.syncRoomMember(roomId)

          } else if (pfHelper.isContactId(syncContact.user_name)) {
            /**
             * Contact
             */
            const contactPayload = syncContact as PadchatContactPayload
            const contactId = contactPayload.user_name

            this.cacheContactRawPayload[contactId] = contactPayload

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

  // private async WXGetContact(id: string): Promise<PadchatContactPayload | PadchatRoomPayload> {
  //   const result = await this.jsonRpcCall('WXGetContact', [id])

  //   if (!result) {
  //     throw Error('PuppetPadchatBridge, WXGetContact, cannot get result from websocket server!')
  //   }

  //   log.silly('PuppetPadchatBridge', 'WXGetContact(%s) result: %s', id, JSON.stringify(result))

  //   if (!result.user_name) {
  //     log.warn('PuppetPadchatBridge', 'WXGetContact cannot get user_name, id: %s', id)
  //   }
  //   if (result.member) {
  //     result.member = JSON.parse(decodeURIComponent(result.member))
  //   }
  //   return result
  // }

  public async contactRawPayload(id: string): Promise<PadchatContactPayload> {
    log.verbose('PuppetPadchatBridge', 'contactRawPayload(%s)', id)

    const rawPayload = await Misc.retry(async (retry, attempt) => {
      log.verbose('PuppetPadchatBridge', 'contactRawPayload(%s) retry() attempt=%d', id, attempt)

      if (id in this.cacheContactRawPayload) {
        return this.cacheContactRawPayload[id]
      }

      const tryRawPayload =  await this.padchatRpc.WXGetContactPayload(id)
      if (tryRawPayload) {
        this.cacheContactRawPayload[id] = tryRawPayload
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

      if (id in this.cacheRoomRawPayload) {
        return this.cacheRoomRawPayload[id]
      }

      const tryRawPayload = await this.padchatRpc.WXGetRoomPayload(id)
      if (tryRawPayload) {
        this.cacheRoomRawPayload[id] = tryRawPayload
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
    const result = await this.padchatRpc.WXHeartBeat()
    return result.message
  }

  public async WXSetUserRemark(contactId: string, alias: string): Promise<void> {
    await this.padchatRpc.WXSetUserRemark(contactId, alias)
  }

  public async WXSendMsg(to: string, content: string, at = ''): Promise<void> {
    await this.padchatRpc.WXSendMsg(to, content, at)
    return
  }

  public async WXSendImage(to: string, data: string): Promise<void> {
    await this.padchatRpc.WXSendImage(to, data)
  }

  // public async WXGetChatRoomMember(id: string): Promise<PadchatRoomMemberPayload> {
  //   log.verbose('PuppetPadchatBridge', 'WXGetChatRoomMember(%s)', id)

  //   let lastResult: PadchatRoomMemberPayload
  //   const result = await Misc.retry(async (retry, attempt) => {
  //     log.silly('PuppetPadchatBridge', 'WXGetChatRoomMember(%s) retry() attempt=%d', id, attempt)

  //     try {
  //       lastResult = await this.padchatRpc.WXGetChatRoomMember(id)
  //       if (lastResult.member.length <= 0) {
  //         throw new Error('no room member for room ' + id)
  //       }
  //       return lastResult
  //     } catch (e) {
  //       return retry(e)
  //     }
  //   }).catch(e => {
  //     log.silly('PuppetPadchatBridge', 'WXGetChatRoomMember(%s) retry() fail: %s', id, e)
  //     return lastResult
  //   })

  //   return result
  // }

  public async WXDeleteChatRoomMember(roomId: string, contactId: string): Promise<StandardType> {
    const result = await this.padchatRpc.WXDeleteChatRoomMember(roomId, contactId)
    return result
  }

  public async WXAddChatRoomMember(roomId: string, contactId: string): Promise<number> {
    const result = await this.padchatRpc.WXAddChatRoomMember(roomId, contactId)
    return result
  }

  public async WXSetChatroomName(roomId: string, topic: string): Promise<void> {
    await this.padchatRpc.WXSetChatroomName(roomId, topic)
    return
  }

  public async WXQuitChatRoom(roomId: string): Promise<void> {
    await this.padchatRpc.WXQuitChatRoom(roomId)
  }

  public async WXAddUser(strangerV1: string, strangerV2: string, type: string, verify: string): Promise<void> {
    await this.padchatRpc.WXAddUser(strangerV1, strangerV2, type, verify)
  }
}
