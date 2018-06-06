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

  private loginQrCode?: string

  private loginTimer?: NodeJS.Timer

  private selfId? : string
  // private password? : string
  // private nickname? : string

  // private loginSucceed = false

  private cacheRoomRawPayload    : { [id: string]: PadchatRoomPayload }
  private cacheContactRawPayload : { [id: string]: PadchatContactPayload }

  private readonly state: StateSwitch

  constructor(
    public options: BridgeOptions,
  ) {
    super() // for EventEmitter
    log.verbose('PuppetPadchatBridge', 'constructor()')

    // this.userId   = options.token
    this.cacheRoomRawPayload = {}
    this.cacheContactRawPayload = {}

    this.state = new StateSwitch('PuppetPadchatBridge')
    this.autoData = {}
    this.padchatRpc = new PadchatRpc(options.endpoint, options.token)
  }

  public async start(): Promise<void> {
    log.verbose('PuppetPadchatBridge', `start()`)

    this.cacheRoomRawPayload    = {}
    this.cacheContactRawPayload = {}

    if (this.selfId) {
      throw new Error('username exist')
    }

    this.state.on('pending')

    await this.padchatRpc.start()
    this.padchatRpc.on('message', messageRawPayload => {
      this.emit('message', messageRawPayload)
    })

    await this.loadAutoData()

    await this.restoreLogin()

    this.startLogin()

    this.state.on(true)
  }

  protected async login(username: string): Promise<void> {
    if (this.selfId) {
      throw new Error('username exist')
    }

    this.stopLogin()

    this.saveAutoData()

    this.emit('login', this.selfId = username)
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
    this.loginQrCode = undefined
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
    let lastStatus = WXCheckQRCodeStatus.Unknown
    let loop = true
    while (loop) {
      const result = await this.padchatRpc.WXCheckQRCode()

      if (lastStatus !== result.status && this.loginQrCode) {
        lastStatus = result.status
        this.emit('scan', this.loginQrCode, result.status)
      }

      switch (result.status) {
        case WXCheckQRCodeStatus.WaitScan:
          log.silly('PuppetPadchatBridge', 'checkQrcode: Please scan the Qrcode!')
          break

        case WXCheckQRCodeStatus.WaitConfirm:
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
          this.loginQrCode = undefined
          loop = false
          break

        case WXCheckQRCodeStatus.Cancel:
          log.silly('PuppetPadchatBridge', 'user cancel')
          this.loginQrCode = undefined
          loop = false
          break

        default:
          throw new Error('unknown status: ' + result.status)
      }

      await new Promise(r => setTimeout(r, 1000))
    }

    await this.emitLoginQrCode()
    this.loginTimer = setTimeout(this.startLogin.bind(this), 1000)
    return
  }

  protected async restoreLogin(): Promise<void> {
    /**
     * 1. The following `if/else` block: emit qrcode or send login request to the user.
     */
    if (this.autoData && this.autoData.token) {
      log.silly('PuppetPadchatBridge', `initLogin() autoData.token exist for %s`,
                                      this.autoData.nick_name || 'no nick_name',
                )
      // Offline, then relogin
      const autoLoginResult = await this.padchatRpc.WXAutoLogin(this.autoData.token)

      if (autoLoginResult) {
        if (autoLoginResult.status === 0) {
          /**
           * 1.1 Auto Login Success, return username as the result
           */
          this.selfId = autoLoginResult.user_name
          return

        } else {
          /**
           * 1.2. Send Login Request to User to be confirm(the same as the user had scaned the QrCode)
           */
          const loginRequestResult = await this.padchatRpc.WXLoginRequest(this.autoData.token)

          if (!loginRequestResult || loginRequestResult.status !== 0) {
            /**
             * 1.2.1 Login Request Not Valid, emit QrCode for scan.
             */
            await this.emitLoginQrCode()
          }
        }
      } else {
        /**
         * 1.3. No Auto Login, emit QrCode for scan
         */
        await this.emitLoginQrCode()
      }
    }
    return
  }

  protected async emitLoginQrCode(): Promise<void> {
    log.verbose('PuppetPadchatBridge', `emitLoginQrCode()`)

    if (this.loginQrCode) {
      throw new Error('qrcode exist')
    }

    const result = await this.padchatRpc.WXGetQRCode()
    if (!result) {
      // if fail, do we need to await this.WXInitialize() again???
      throw new Error('waitLogin() WXGetQrCode() return nothing')
    }

    const qrCodeText = await pfHelper.imageBase64ToQrCode(result.qr_code)

    this.emit(
      'scan',
      this.loginQrCode = qrCodeText,
      0,
    )

  }

  protected async saveAutoData(): Promise<void> {
    log.verbose('PuppetPadchatBridge', `loadAutoData()`)

    // Check 62 data. If has then use, or save 62 data here.
    this.autoData.token  = (await this.padchatRpc.WXGetLoginToken()).token
    this.autoData.wxData = (await this.padchatRpc.WXGenerateWxDat()).data

    if (!this.autoData.user_name || !this.autoData.wxData || !this.autoData.token) {
      throw new Error('autoData error')
    }

    await this.options.memory.set(AUTO_DATA_SLOT, this.autoData)
    await this.options.memory.save()
  }

  protected async loadAutoData(): Promise<void> {
    log.verbose('PuppetPadchatBridge', `loadAutoData()`)

    const autoData: AutoDataType = await this.options.memory.get(AUTO_DATA_SLOT)
    this.autoData = { ...autoData || {} }

    // Check for 62 data, if has, then use WXLoadWxDat
    if (autoData.wxData) {
      log.silly('PuppetPadchatBridge', `start(), get 62 data`)
      await this.padchatRpc.WXLoadWxDat(autoData.wxData)
    }
  }

  public async stop(): Promise<void> {
    log.verbose('PuppetPadchatBridge', `stop()`)

    this.state.off('pending')

    this.cacheContactRawPayload = {}
    this.cacheRoomRawPayload    = {}

    await this.padchatRpc.stop()

    this.state.off(true)
  }

  public async getContactIdList(): Promise<string[]> {
    return Object.keys(this.cacheContactRawPayload)
  }

  public async getRoomIdList(): Promise<string[]> {
    const idList = Object.keys(this.cacheRoomRawPayload)
    log.verbose('PuppetPadchatBridge', 'getRoomIdList() = %d', idList.length)
    return idList
  }

  public async syncContactsAndRooms(): Promise<void> {
    log.verbose('PuppetPadchatBridge', `syncContactsAndRooms()`)

    let cont = true
    // const syncContactMap = new Map<string, PadchatContactPayload>()
    // const syncRoomMap = new Map<string, PadchatRoomPayload>()
    // let contactIdList: string[] = []
    // let roomIdList: string[] = []

    while (cont && this.state.on() && this.selfId) {
      log.silly('PuppetPadchatBridge', `syncContactsAndRooms() while()`)

      const syncContactList = await this.padchatRpc.WXSyncContact()

      await new Promise(r => setTimeout(r, 1 * 100))

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

      syncContactList
      .forEach(syncContact => {
        if (syncContact.continue === PadchatContinue.Go) {
          if (syncContact.msg_type === PadchatContactMsgType.Contact) {
            console.log('syncContact:', syncContact.user_name, syncContact.nick_name)
            if (pfHelper.isRoomId(syncContact.user_name)) { // /@chatroom$/.test(syncContact.user_name)) {
              this.cacheRoomRawPayload[syncContact.user_name] = syncContact as PadchatRoomPayload
              // syncRoomMap.set(syncContact.user_name, syncContact as PadchatRoomPayload)
            } else if (syncContact.user_name) {
              this.cacheContactRawPayload[syncContact.user_name] = syncContact as PadchatContactPayload
              // syncContactMap.set(syncContact.user_name, syncContact as PadchatContactPayload)
            } else {
              throw new Error('no user_name')
            }
          }
        } else {
          log.info('PuppetPadchatBridge', 'syncContactsAndRooms() sync contact done!')
          cont = false
          return
        }
      })

      log.verbose('PuppetPadchatBridge', `syncContactsAndRooms(), continue to load via WXSyncContact ...`)
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

  // public async WXGetContactPayload(id: string): Promise<PadchatContactPayload> {
  //   if (!pfHelper.isContactId(id)) { // /@chatroom$/.test(id)) {
  //     throw Error(`should use WXGetRoomPayload because get a room id :${id}`)
  //   }
  //   const result = await this.padchatRpc.WXGetContact(id) as PadchatContactPayload
  //   return result
  // }

  // public async WXGetRoomPayload(id: string): Promise<PadchatRoomPayload> {
  //   if (!pfHelper.isRoomId(id)) { // (/@chatroom$/.test(id))) {
  //     throw Error(`should use WXGetContactPayload because get a contact id :${id}`)
  //   }
  //   const result = await this.padchatRpc.WXGetContact(id) as PadchatRoomPayload
  //   return result
  // }

  // public async WXSetUserRemark(id: string, remark: string): Promise<StandardType> {
  //   return await this.padchatRpc.WXSetUserRemark(id, remark)
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

  public async ding(data: string): Promise<string> {
    const result = await this.padchatRpc.WXHeartBeat(data)
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

  public async WXGetChatRoomMember(id: string): Promise<PadchatRoomMemberPayload> {
    const result = this.padchatRpc.WXGetChatRoomMember(id)
    return result
  }

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

  public async WXHeartBeat(data = 'ding'): Promise<string> {
    const result = await this.padchatRpc.WXHeartBeat(data)
    return result.message
  }
}
