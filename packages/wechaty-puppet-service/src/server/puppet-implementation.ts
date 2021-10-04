import {
  google,
  grpc,
  puppet as pbPuppet,
}                     from 'wechaty-grpc'

import {
  log,
  FileBox,

  Puppet,

  FriendshipPayloadReceive,
  LocationPayload,
  MiniProgramPayload,
  UrlLinkPayload,
  RoomInvitationPayload,
  ImageType,
  FriendshipAddOptions,
  FriendshipSceneType,
  EventScanPayload,
  EventReadyPayload,
  PayloadType,
}                                   from 'wechaty-puppet'

import {
  packFileBoxToPb,
  unpackConversationIdFileBoxArgsFromPb,
}                                         from '../file-box-stream/mod.js'
import {
  timestampFromMilliseconds,
}                                         from '../pure-functions/timestamp.js'

import { grpcError }          from './grpc-error.js'
import { EventStreamManager } from './event-stream-manager.js'
import { serializeFileBox }   from './serialize-file-box.js'

const { StringValue } = google

function puppetImplementation (
  puppet: Puppet,
): pbPuppet.IPuppetServer {

  /**
   * Save scan payload to send it to the puppet-service right after connected (if needed)
   *
   * TODO: clean the listeners if necessary
   */
  let scanPayload: undefined | EventScanPayload
  let readyPayload: undefined | EventReadyPayload
  let readyTimeout: undefined | ReturnType<typeof setTimeout>

  puppet
    .on('scan', payload  => { scanPayload = payload    })
    .on('ready', payload => { readyPayload = payload   })
    .on('logout', _      => {
      readyPayload = undefined
      if (readyTimeout) {
        clearTimeout(readyTimeout)
      }
    })
    .on('login', _       => {
      scanPayload = undefined
      readyTimeout = setTimeout(() => {
        readyPayload && eventStreamManager.grpcEmit(pbPuppet.EventType.EVENT_TYPE_READY, readyPayload)
      }, 5 * 1000)
    })

  const eventStreamManager = new EventStreamManager(puppet)

  const puppetServerImpl: pbPuppet.IPuppetServer = {

    contactAlias: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'contactAlias()')

      const id = call.request.getId()

      /**
       * Set
       */
      if (call.request.hasAlias()) {
        try {
          await puppet.contactAlias(id, call.request.getAlias())
          return callback(null, new  pbPuppet.ContactAliasResponse())
        } catch (e) {
          return grpcError('contactAlias', (e as Error), callback)
        }
      }

      /**
       * Get
       */
      try {
        const alias = await puppet.contactAlias(id)

        const response = new pbPuppet.ContactAliasResponse()
        response.setAlias(alias)

        return callback(null, response)
      } catch (e) {
        return grpcError('contactAlias', (e as Error), callback)
      }

    },

    contactAvatar: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'contactAvatar()')

      const id = call.request.getId()

      /**
       * Set
       */
      try {
        if (call.request.hasFilebox()) {
          const fileBox = FileBox.fromJSON(
            call.request.getFilebox(),
          )
          await puppet.contactAvatar(id, fileBox)

          return callback(null, new pbPuppet.ContactAvatarResponse())
        }
      } catch (e) {
        return grpcError('contactAvatar', (e as Error), callback)
      }

      /**
       * Get
       */
      try {
        const fileBox = await puppet.contactAvatar(id)
        const response = new pbPuppet.ContactAvatarResponse()
        response.setFilebox(JSON.stringify(fileBox))

        return callback(null, response)
      } catch (e) {
        return grpcError('contactAvatar', (e as Error), callback)
      }
    },

    contactCorporationRemark: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'contactCorporationRemark()')

      const contactId = call.request.getContactId()
      try {
        await puppet.contactCorporationRemark(
          contactId,
          call.request.getCorporationRemark() || null,
        )
        return callback(null, new pbPuppet.ContactCorporationRemarkResponse())
      } catch (e) {
        return grpcError('contactCorporationRemark', (e as Error), callback)
      }
    },

    contactDescription: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'contactDescription()')

      const contactId = call.request.getContactId()

      try {
        const description = call.request.getDescription()
        await puppet.contactDescription(contactId, description || null)
        return callback(null, new pbPuppet.ContactDescriptionResponse())
      } catch (e) {
        return grpcError('contactDescription', (e as Error), callback)
      }
    },

    contactList: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'contactList()')

      void call // empty request

      try {
        const idList = await puppet.contactList()
        const response = new pbPuppet.ContactListResponse()
        response.setIdsList(idList)

        return callback(null, response)
      } catch (e) {
        return grpcError('contactList', (e as Error), callback)
      }
    },

    contactPayload: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'contactPayload()')

      const id = call.request.getId()

      try {
        const payload = await puppet.contactPayload(id)

        const response = new pbPuppet.ContactPayloadResponse()
        response.setAddress(payload.address || '')
        response.setAlias(payload.alias || '')
        response.setAvatar(payload.avatar)
        response.setCity(payload.city || '')
        response.setFriend(payload.friend || false)
        response.setGender(payload.gender)
        response.setId(payload.id)
        response.setName(payload.name)
        response.setProvince(payload.province || '')
        response.setSignature(payload.signature || '')
        response.setStar(payload.star || false)
        response.setType(payload.type)
        response.setWeixin(payload.weixin || '')
        response.setPhonesList(payload.phone)
        response.setCoworker(payload.coworker || false)
        response.setCorporation(payload.corporation || '')
        response.setTitle(payload.title || '')
        response.setDescription(payload.description || '')

        return callback(null, response)
      } catch (e) {
        return grpcError('contactPayload', (e as Error), callback)
      }
    },

    contactPhone: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'contactPhone()')

      try {
        const contactId = call.request.getContactId()
        const phoneList = call.request.getPhonesList()

        await puppet.contactPhone(contactId, phoneList)
        return callback(null, new pbPuppet.ContactPhoneResponse())
      } catch (e) {
        return grpcError('contactPhone', (e as Error), callback)
      }
    },

    contactSelfName: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'contactSelfName()')

      try {
        const name = call.request.getName()
        await puppet.contactSelfName(name)

        return callback(null, new pbPuppet.ContactSelfNameResponse())

      } catch (e) {
        return grpcError('contactSelfName', (e as Error), callback)
      }
    },

    contactSelfQRCode: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'contactSelfName()')
      void call

      try {
        const qrcode = await puppet.contactSelfQRCode()

        const response = new pbPuppet.ContactSelfQRCodeResponse()
        response.setQrcode(qrcode)

        return callback(null, response)

      } catch (e) {
        return grpcError('contactSelfQRCode', (e as Error), callback)
      }

    },

    contactSelfSignature: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'contactSelfSignature()')

      try {
        const signature = call.request.getSignature()
        await puppet.contactSelfSignature(signature)

        return callback(null, new pbPuppet.ContactSelfSignatureResponse())

      } catch (e) {
        return grpcError('contactSelfSignature', (e as Error), callback)
      }

    },

    ding: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'ding()')

      try {
        const data = call.request.getData()
        await puppet.ding(data)
        return callback(null, new pbPuppet.DingResponse())

      } catch (e) {
        return grpcError('ding', (e as Error), callback)
      }
    },

    dirtyPayload: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'dirtyPayload()')

      try {
        const id = call.request.getId()
        const type: PayloadType = call.request.getType()

        await puppet.dirtyPayload(type, id)
        return callback(null, new pbPuppet.DirtyPayloadResponse())
      } catch (e) {
        return grpcError('dirtyPayload', (e as Error), callback)
      }
    },

    /**
     *
     * Bridge Event Emitter Events
     *
     */
    event: (streamingCall) => {
      log.verbose('PuppetServiceImpl', 'event()')

      if (eventStreamManager.busy()) {
        log.error('PuppetServiceImpl', 'event() there is another event() call not end when receiving a new one.')

        const error: grpc.ServiceError = {
          ...new Error('GrpcServerImpl.event() can not call twice.'),
          code: grpc.status.ALREADY_EXISTS,
          details: 'GrpcServerImpl.event() can not call twice.',
          metadata: streamingCall.metadata,
        }

        /**
          * Send error from gRPC server stream:
          *  https://github.com/grpc/grpc-node/issues/287#issuecomment-383218225
          *
          * Streaming RPCs
          *  - https://grpc.io/docs/tutorials/basic/node/
          *    Only one of 'error' or 'end' will be emitted. Finally, the 'status' event fires when the server sends the status.
          */
        streamingCall.emit('error', error)
        return
      }

      eventStreamManager.start(streamingCall)

      /**
       * If `scanPayload` is not undefined, then we emit it to downstream immediatelly
       */
      if (scanPayload) {
        eventStreamManager.grpcEmit(pbPuppet.EventType.EVENT_TYPE_SCAN, scanPayload)
      }
    },

    friendshipAccept: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'friendshipAccept()')

      try {
        const id = call.request.getId()
        await puppet.friendshipAccept(id)
        return callback(null, new pbPuppet.FriendshipAcceptResponse())

      } catch (e) {
        return grpcError('friendshipAccept', (e as Error), callback)
      }
    },

    friendshipAdd: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'friendshipAdd()')

      try {
        const contactId = call.request.getContactId()
        // FIXME: for backward compatibility, need to be removed after all puppet has updated.
        const hello = call.request.getHello()

        const referrer = call.request.getReferrer()
        const friendshipAddOptions: FriendshipAddOptions = {
          hello,
          ...referrer,
        }

        {
          // Deprecated: will be removed after Dec 31, 2022
          const sourceContactId = call.request.getSourceContactIdStringValueDeprecated()?.getValue()
          const sourceRoomId    = call.request.getSourceRoomIdStringValueDeprecated()?.getValue()
          if (sourceContactId)  { friendshipAddOptions['contactId'] = sourceContactId }
          if (sourceRoomId)     { friendshipAddOptions['roomId']    = sourceRoomId }
        }

        await puppet.friendshipAdd(contactId, friendshipAddOptions)
        return callback(null, new pbPuppet.FriendshipAddResponse())

      } catch (e) {
        return grpcError('friendshipAdd', (e as Error), callback)
      }
    },

    friendshipPayload: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'friendshipPayload()')

      try {
        const id = call.request.getId()
        const payload = await puppet.friendshipPayload(id)
        const payloadReceive = payload as FriendshipPayloadReceive

        const response = new pbPuppet.FriendshipPayloadResponse()

        response.setContactId(payload.contactId)
        response.setHello(payload.hello || '')
        response.setId(payload.id)
        response.setScene(payloadReceive.scene || FriendshipSceneType.Unknown)
        response.setStranger(payloadReceive.stranger || '')
        response.setTicket(payloadReceive.ticket)
        response.setType(payload.type)

        return callback(null, response)

      } catch (e) {
        return grpcError('friendshipPayload', (e as Error), callback)
      }
    },

    friendshipSearchPhone: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'friendshipSearchPhone()')

      try {
        const phone = call.request.getPhone()
        const contactId = await puppet.friendshipSearchPhone(phone)

        const response = new pbPuppet.FriendshipSearchPhoneResponse()

        if (contactId) {
          response.setContactId(contactId)
        }

        return callback(null, response)

      } catch (e) {
        return grpcError('friendshipSearchPhone', (e as Error), callback)
      }
    },

    friendshipSearchWeixin: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'friendshipSearchWeixin()')

      try {
        const weixin = call.request.getWeixin()
        const contactId = await puppet.friendshipSearchWeixin(weixin)

        const response = new pbPuppet.FriendshipSearchWeixinResponse()

        if (contactId) {
          response.setContactId(contactId)
        }

        return callback(null, response)

      } catch (e) {
        return grpcError('friendshipSearchWeixin', (e as Error), callback)
      }
    },

    logout: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'logout()')
      void call // empty arguments

      try {
        await puppet.logout()

        return callback(null, new pbPuppet.LogoutResponse())

      } catch (e) {
        return grpcError('logout', (e as Error), callback)
      }
    },

    messageContact: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'messageContact()')

      try {
        const id = call.request.getId()

        const contactId = await puppet.messageContact(id)

        const response = new pbPuppet.MessageContactResponse()
        response.setId(contactId)

        return callback(null, response)

      } catch (e) {
        return grpcError('messageContact', (e as Error), callback)
      }
    },

    /**
     * @deprecated: should not use this API because it will be changed to
     *  `messageFileStream` after Dec 31, 2021
     */
    messageFile: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'messageFile()')

      try {
        const id = call.request.getId()

        const fileBox = await puppet.messageFile(id)

        const response = new pbPuppet.MessageFileResponse()
        response.setFilebox(await serializeFileBox(fileBox))

        return callback(null, response)

      } catch (e) {
        return grpcError('messageFile', (e as Error), callback)
      }
    },

    messageFileStream: async (call) => {
      log.verbose('PuppetServiceImpl', 'messageFileStream()')

      try {
        const id = call.request.getId()

        const fileBox  = await puppet.messageFile(id)
        const response = await packFileBoxToPb(pbPuppet.MessageFileStreamResponse)(fileBox)

        response.on('error', e => call.destroy(e as Error))
        response.pipe(call)

      } catch (e) {
        log.error('PuppetServiceImpl', 'grpcError() messageFileStream() rejection: %s', e && (e as Error).message)
        call.destroy(e as Error)
      }
    },

    messageForward: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'messageForward()')

      try {
        const conversationId = call.request.getConversationId()
        const messageId = call.request.getMessageId()

        const id = await puppet.messageForward(conversationId, messageId)

        const response = new pbPuppet.MessageForwardResponse()
        if (id) {
          response.setId(id)
          {
            /**
              * Huan(202110): Deprecated: will be removed after Dec 31, 2022
              */
            const idWrapper = new StringValue()
            idWrapper.setValue(id)
            response.setIdStringValueDeprecated(idWrapper)
          }
        }

        return callback(null, response)

      } catch (e) {
        return grpcError('messageForward', (e as Error), callback)
      }
    },

    /**
     * @deprecated: should not use this API because it will be changed to
     *  `messageFileStream` after Dec 31, 2021
     */
    messageImage: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'messageImage()')

      try {
        const id = call.request.getId()
        const type = call.request.getType()

        const fileBox = await puppet.messageImage(id, type as number as ImageType)

        const response = new pbPuppet.MessageImageResponse()
        response.setFilebox(await serializeFileBox(fileBox))

        return callback(null, response)

      } catch (e) {
        return grpcError('messageImage', (e as Error), callback)
      }
    },

    messageImageStream: async (call) => {
      log.verbose('PuppetServiceImpl', 'messageImageStream()')

      try {
        const id = call.request.getId()
        const type = call.request.getType()

        const fileBox  = await puppet.messageImage(id, type as number as ImageType)
        const response = await packFileBoxToPb(pbPuppet.MessageImageStreamResponse)(fileBox)

        response.on('error', e => call.destroy(e as Error))
        response.pipe(call)

      } catch (e) {
        log.error('PuppetServiceImpl', 'grpcError() messageImageStream() rejection: %s', (e as Error) && (e as Error).message)
        call.destroy(e as Error)
      }
    },

    messageLocation: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'messageLocation()')

      try {
        const id = call.request.getId()

        const payload = await puppet.messageLocation(id)

        const response = new pbPuppet.MessageLocationResponse()

        const pbLocationPayload = new pbPuppet.LocationPayload()
        pbLocationPayload.setLatitude(payload.latitude)
        pbLocationPayload.setLongitude(payload.longitude)
        pbLocationPayload.setAccuracy(payload.accuracy)
        pbLocationPayload.setAddress(payload.address)
        pbLocationPayload.setName(payload.name)
        response.setLocation(pbLocationPayload)

        return callback(null, response)

      } catch (e) {
        return grpcError('messageLocation', (e as Error), callback)
      }
    },

    messageMiniProgram: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'messageMiniProgram()')

      try {
        const id = call.request.getId()

        const payload = await puppet.messageMiniProgram(id)

        const response = new pbPuppet.MessageMiniProgramResponse()

        const pbMiniProgramPayload = new pbPuppet.MiniProgramPayload()
        if (payload.appid)       { pbMiniProgramPayload.setAppid(payload.appid) }
        if (payload.description) { pbMiniProgramPayload.setDescription(payload.description) }
        if (payload.iconUrl)     { pbMiniProgramPayload.setIconUrl(payload.iconUrl) }
        if (payload.pagePath)    { pbMiniProgramPayload.setPagePath(payload.pagePath) }
        if (payload.shareId)     { pbMiniProgramPayload.setShareId(payload.shareId) }
        if (payload.thumbKey)    { pbMiniProgramPayload.setThumbKey(payload.thumbKey) }
        if (payload.thumbUrl)    { pbMiniProgramPayload.setThumbUrl(payload.thumbUrl) }
        if (payload.title)       { pbMiniProgramPayload.setTitle(payload.title) }
        if (payload.username)    { pbMiniProgramPayload.setUsername(payload.username) }
        response.setMiniProgram(pbMiniProgramPayload)

        // Deprecated after Dec 31, 2022
        response.setMiniProgramDeprecated(JSON.stringify(payload))

        return callback(null, response)

      } catch (e) {
        return grpcError('messageMiniProgram', (e as Error), callback)
      }
    },

    messagePayload: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'messagePayload()')

      try {
        const id = call.request.getId()

        const payload = await puppet.messagePayload(id)

        const mentionIdList = ('mentionIdList' in payload)
          ? payload.mentionIdList || []
          : []

        const response = new pbPuppet.MessagePayloadResponse()
        response.setFilename(payload.filename || '')
        response.setFromId(payload.fromId || '')
        response.setId(payload.id)
        response.setMentionIdsList(mentionIdList)
        response.setRoomId(payload.roomId || '')
        response.setText(payload.text || '')

        response.setReceiveTime(timestampFromMilliseconds(payload.timestamp))
        // Deprecated: will be removed after Dec 31, 2022
        response.setTimestampDeprecated(Math.floor(payload.timestamp))

        response.setToId(payload.toId || '')
        response.setType(payload.type as pbPuppet.MessageTypeMap[keyof pbPuppet.MessageTypeMap])

        return callback(null, response)

      } catch (e) {
        return grpcError('messagePayload', (e as Error), callback)
      }
    },

    messageRecall: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'messageRecall()')

      try {
        const id = call.request.getId()

        const success = await puppet.messageRecall(id)

        const response = new pbPuppet.MessageRecallResponse()
        response.setSuccess(success)

        return callback(null, response)

      } catch (e) {
        return grpcError('messageRecall', (e as Error), callback)
      }
    },

    messageSendContact: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'messageSendContact()')

      try {
        const conversationId = call.request.getConversationId()
        const contactId = call.request.getContactId()

        const messageId = await puppet.messageSendContact(conversationId, contactId)

        const response = new pbPuppet.MessageSendContactResponse()

        if (messageId) {
          response.setId(messageId)
          {
            /**
              * Huan(202110): Deprecated: will be removed after Dec 31, 2022
              */
            const idWrapper = new StringValue()
            idWrapper.setValue(messageId)
            response.setIdStringValueDeprecated(idWrapper)
          }
        }

        return callback(null, response)

      } catch (e) {
        return grpcError('messageSendContact', (e as Error), callback)
      }
    },

    messageSendFile: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'messageSendFile()')

      try {
        const conversationId = call.request.getConversationId()
        const jsonText = call.request.getFilebox()

        const fileBox = FileBox.fromJSON(jsonText)

        const messageId = await puppet.messageSendFile(conversationId, fileBox)

        const response = new pbPuppet.MessageSendFileResponse()

        if (messageId) {
          response.setId(messageId)
          {
            /**
              * Huan(202110): Deprecated: will be removed after Dec 31, 2022
              */
            const idWrapper = new StringValue()
            idWrapper.setValue(messageId)
            response.setIdStringValueDeprecated(idWrapper)
          }
        }

        return callback(null, response)

      } catch (e) {
        return grpcError('messageSendFile', (e as Error), callback)
      }
    },

    messageSendFileStream: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'messageSendFileStream()')

      try {
        const requestArgs = await unpackConversationIdFileBoxArgsFromPb(call)
        const conversationId = requestArgs.conversationId
        const fileBox = requestArgs.fileBox

        const messageId = await puppet.messageSendFile(conversationId, fileBox)

        const response = new pbPuppet.MessageSendFileStreamResponse()

        if (messageId) {
          response.setId(messageId)
          {
            /**
              * Huan(202110): Deprecated: will be removed after Dec 31, 2022
              */
            const idWrapper = new StringValue()
            idWrapper.setValue(messageId)
            response.setIdStringValueDeprecated(idWrapper)
          }
        }

        return callback(null, response)

      } catch (e) {
        return grpcError('messageSendFileStream', (e as Error), callback)
      }
    },

    messageSendLocation: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'messageSendLocation()')

      try {
        const conversationId    = call.request.getConversationId()
        const pbLocationPayload = call.request.getLocation()

        const payload: LocationPayload = {
          accuracy  : 0,
          address   : 'NOADDRESS',
          latitude  : 0,
          longitude : 0,
          name      : 'NONAME',
          ...pbLocationPayload,
        }

        const messageId = await puppet.messageSendLocation(conversationId, payload)

        const response = new pbPuppet.MessageSendLocationResponse()

        if (messageId) {
          response.setId(messageId)
        }

        return callback(null, response)

      } catch (e) {
        return grpcError('messageSendLocation', (e as Error), callback)
      }
    },

    messageSendMiniProgram: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'messageSendMiniProgram()')

      try {
        const conversationId      = call.request.getConversationId()
        let pbMiniProgramPayload  = call.request.getMiniProgram()
        if (!pbMiniProgramPayload) {
          // Deprecated: will be removed after Dec 31, 2022
          const jsonText = call.request.getMiniProgramDeprecated()
          pbMiniProgramPayload = JSON.parse(jsonText)
        }

        const payload: MiniProgramPayload = {
          ...pbMiniProgramPayload,
        }

        const messageId = await puppet.messageSendMiniProgram(conversationId, payload)

        const response = new pbPuppet.MessageSendMiniProgramResponse()

        if (messageId) {
          response.setId(messageId)
          {
            /**
              * Huan(202110): Deprecated: will be removed after Dec 31, 2022
              */
            const idWrapper = new StringValue()
            idWrapper.setValue(messageId)
            response.setIdStringValueDeprecated(idWrapper)
          }
        }

        return callback(null, response)

      } catch (e) {
        return grpcError('messageSendMiniProgram', (e as Error), callback)
      }
    },

    messageSendText: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'messageSendText()')

      try {
        const conversationId = call.request.getConversationId()
        const text = call.request.getText()
        const mentionIdList = call.request.getMentionalIdsList()

        const messageId = await puppet.messageSendText(conversationId, text, mentionIdList)

        const response = new pbPuppet.MessageSendTextResponse()

        if (messageId) {
          response.setId(messageId)
          {
            /**
              * Huan(202110): Deprecated: will be removed after Dec 31, 2022
              */
            const idWrapper = new StringValue()
            idWrapper.setValue(messageId)
            response.setIdStringValueDeprecated(idWrapper)
          }
        }

        return callback(null, response)

      } catch (e) {
        return grpcError('messageSendText', (e as Error), callback)
      }
    },

    messageSendUrl: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'messageSendUrl()')

      try {
        const conversationId = call.request.getConversationId()
        let pbUrlLinkPayload = call.request.getUrlLink()

        if (!pbUrlLinkPayload) {
          // Deprecated: will be removed after Dec 31, 2022
          const jsonText = call.request.getUrlLinkDeprecated()
          pbUrlLinkPayload = JSON.parse(jsonText)
        }

        const payload: UrlLinkPayload = {
          title : 'NOTITLE',
          url   : 'NOURL',
          ...pbUrlLinkPayload,
        }

        const messageId = await puppet.messageSendUrl(conversationId, payload)

        const response = new pbPuppet.MessageSendUrlResponse()

        if (messageId) {
          response.setId(messageId)
          {
            /**
              * Huan(202110): Deprecated: will be removed after Dec 31, 2022
              */
            const idWrapper = new StringValue()
            idWrapper.setValue(messageId)
            response.setIdStringValueDeprecated(idWrapper)
          }
        }

        return callback(null, response)

      } catch (e) {
        return grpcError('messageSendUrl', (e as Error), callback)
      }
    },

    messageUrl: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'messageUrl()')

      try {
        const id      = call.request.getId()
        const payload = await puppet.messageUrl(id)

        const response = new pbPuppet.MessageUrlResponse()

        const pbUrlLinkPayload = new pbPuppet.UrlLinkPayload()
        pbUrlLinkPayload.setTitle(payload.title)
        pbUrlLinkPayload.setUrl(payload.url)
        if (payload.thumbnailUrl) { pbUrlLinkPayload.setThumbnailUrl(payload.thumbnailUrl) }
        if (payload.description)  { pbUrlLinkPayload.setDescription(payload.description) }
        response.setUrlLink(pbUrlLinkPayload)

        // Deprecated: will be removed after Dec 31, 2022
        response.setUrlLinkDeprecated(JSON.stringify(payload))

        return callback(null, response)

      } catch (e) {
        return grpcError('messageUrl', (e as Error), callback)
      }
    },

    roomAdd: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'roomAdd()')

      try {
        const roomId = call.request.getId()
        const contactId = call.request.getContactId()
        const inviteOnly = call.request.getInviteOnly()

        await puppet.roomAdd(roomId, contactId, inviteOnly)

        return callback(null, new pbPuppet.RoomAddResponse())

      } catch (e) {
        return grpcError('roomAdd', (e as Error), callback)
      }
    },

    roomAnnounce: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'roomAnnounce()')

      try {
        const roomId = call.request.getId()

        /**
         * Set
         */
        if (call.request.hasText()) {
          await puppet.roomAnnounce(roomId, call.request.getText())
          return callback(null, new pbPuppet.RoomAnnounceResponse())
        }

        /**
         * Get
         */
        const text = await puppet.roomAnnounce(roomId)

        const response = new pbPuppet.RoomAnnounceResponse()
        response.setText(text)

        return callback(null, response)

      } catch (e) {
        return grpcError('roomAnnounce', (e as Error), callback)
      }
    },

    roomAvatar: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'roomAvatar()')

      try {
        const roomId = call.request.getId()

        const fileBox = await puppet.roomAvatar(roomId)

        const response = new pbPuppet.RoomAvatarResponse()
        response.setFilebox(await serializeFileBox(fileBox))

        return callback(null, response)

      } catch (e) {
        return grpcError('roomAvatar', (e as Error), callback)
      }
    },

    roomCreate: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'roomCreate()')

      try {
        const contactIdList = call.request.getContactIdsList()
        const topic = call.request.getTopic()

        const roomId = await puppet.roomCreate(contactIdList, topic)

        const response = new pbPuppet.RoomCreateResponse()
        response.setId(roomId)

        return callback(null, response)

      } catch (e) {
        return grpcError('roomCreate', (e as Error), callback)
      }
    },

    roomDel: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'roomDel()')

      try {
        const roomId = call.request.getId()
        const contactId = call.request.getContactId()

        await puppet.roomDel(roomId, contactId)

        return callback(null, new pbPuppet.RoomDelResponse())

      } catch (e) {
        return grpcError('roomDel', (e as Error), callback)
      }
    },

    roomInvitationAccept: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'roomInvitationAccept()')

      try {
        const id = call.request.getId()

        await puppet.roomInvitationAccept(id)

        return callback(null, new pbPuppet.RoomInvitationAcceptResponse())

      } catch (e) {
        return grpcError('roomInvitationAccept', (e as Error), callback)
      }
    },

    roomInvitationPayload: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'roomInvitationPayload()')

      try {
        const roomInvitationId = call.request.getId()
        /**
          * Set
          */
        {
          const jsonText = call.request.getPayload()

          if (jsonText) {
            const payload = JSON.parse(jsonText) as RoomInvitationPayload
            await puppet.roomInvitationPayload(roomInvitationId, payload)

            return callback(null, new pbPuppet.RoomInvitationPayloadResponse())
          }

          {
            /**
              * Huan(202110): Deprecated: will be removed after Dec 31, 2022
              */
            const payloadWrapper = call.request.getPayloadStringValueDeprecated()

            if (payloadWrapper) {
              const jsonText = payloadWrapper.getValue()
              const payload = JSON.parse(jsonText) as RoomInvitationPayload
              await puppet.roomInvitationPayload(roomInvitationId, payload)

              return callback(null, new pbPuppet.RoomInvitationPayloadResponse())
            }
          }
        }

        /**
         * Get
         */
        const payload = await puppet.roomInvitationPayload(roomInvitationId)

        const response = new pbPuppet.RoomInvitationPayloadResponse()
        response.setAvatar(payload.avatar)
        response.setId(payload.id)
        response.setInvitation(payload.invitation)
        response.setInviterId(payload.inviterId)
        response.setReceiverId(payload.receiverId)
        response.setMemberCount(payload.memberCount)
        response.setMemberIdsList(payload.memberIdList)

        response.setReceiveTime(timestampFromMilliseconds(payload.timestamp))

        {
          // Deprecated: will be removed after Dec 31, 2022
          const deprecated = true
          void deprecated
          response.setTimestampUint64Deprecated(Math.floor(payload.timestamp))
        }

        response.setTopic(payload.topic)

        return callback(null, response)

      } catch (e) {
        return grpcError('roomInvitationPayload', (e as Error), callback)
      }
    },

    roomList: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'roomList()')
      void call

      try {
        const roomIdList = await puppet.roomList()

        const response = new pbPuppet.RoomListResponse()
        response.setIdsList(roomIdList)

        return callback(null, response)

      } catch (e) {
        return grpcError('roomList', (e as Error), callback)
      }
    },

    roomMemberList: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'roomMemberList()')

      try {
        const roomId = call.request.getId()

        const roomMemberIdList = await puppet.roomMemberList(roomId)

        const response = new pbPuppet.RoomMemberListResponse()
        response.setMemberIdsList(roomMemberIdList)

        return callback(null, response)

      } catch (e) {
        return grpcError('roomMemberList', (e as Error), callback)
      }
    },

    roomMemberPayload: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'roomMemberPayload()')

      try {
        const roomId = call.request.getId()
        const memberId = call.request.getMemberId()

        const payload = await puppet.roomMemberPayload(roomId, memberId)

        const response = new pbPuppet.RoomMemberPayloadResponse()

        response.setAvatar(payload.avatar)
        response.setId(payload.id)
        response.setInviterId(payload.inviterId || '')
        response.setName(payload.name)
        response.setRoomAlias(payload.roomAlias || '')

        return callback(null, response)

      } catch (e) {
        return grpcError('roomMemberPayload', (e as Error), callback)
      }
    },

    roomPayload: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'roomPayload()')

      try {
        const roomId = call.request.getId()

        const payload = await puppet.roomPayload(roomId)

        const response = new pbPuppet.RoomPayloadResponse()
        response.setAdminIdsList(payload.adminIdList)
        response.setAvatar(payload.avatar || '')
        response.setId(payload.id)
        response.setMemberIdsList(payload.memberIdList)
        response.setOwnerId(payload.ownerId || '')
        response.setTopic(payload.topic)

        return callback(null, response)

      } catch (e) {
        return grpcError('roomPayload', (e as Error), callback)
      }
    },

    roomQRCode: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'roomQRCode()')

      try {
        const roomId = call.request.getId()

        const qrcode = await puppet.roomQRCode(roomId)

        const response = new pbPuppet.RoomQRCodeResponse()
        response.setQrcode(qrcode)

        return callback(null, response)

      } catch (e) {
        return grpcError('roomQRCode', (e as Error), callback)
      }
    },

    roomQuit: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'roomQuit()')

      try {
        const roomId = call.request.getId()

        await puppet.roomQuit(roomId)

        return callback(null, new pbPuppet.RoomQuitResponse())

      } catch (e) {
        return grpcError('roomQuit', (e as Error), callback)
      }
    },

    roomTopic: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'roomTopic()')

      try {
        const roomId = call.request.getId()

        /**
         * Set
         */
        if (call.request.hasTopic()) {
          await puppet.roomTopic(roomId, call.request.getTopic())

          return callback(null, new pbPuppet.RoomTopicResponse())
        }

        /**
         * Get
         */

        const topic = await puppet.roomTopic(roomId)

        const response = new pbPuppet.RoomTopicResponse()
        response.setTopic(topic)

        return callback(null, response)

      } catch (e) {
        return grpcError('roomTopic', (e as Error), callback)
      }
    },

    start: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'start()')
      void call

      try {
        await puppet.start()

        return callback(null, new pbPuppet.StartResponse())

      } catch (e) {
        return grpcError('start', (e as Error), callback)
      }
    },

    stop: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'stop()')
      void call

      try {

        if (eventStreamManager.busy()) {
          eventStreamManager.stop()
        } else {
          log.error('PuppetServiceImpl', 'stop() eventStreamManager is not busy?')
        }

        await puppet.stop()
        readyPayload = undefined

        return callback(null, new pbPuppet.StopResponse())

      } catch (e) {
        return grpcError('stop', (e as Error), callback)
      }
    },

    tagContactAdd: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'tagContactAdd()')

      try {
        const tagId = call.request.getId()
        const contactId = call.request.getContactId()

        await puppet.tagContactAdd(tagId, contactId)

        return callback(null, new pbPuppet.TagContactAddResponse())

      } catch (e) {
        return grpcError('tagContactAdd', (e as Error), callback)
      }
    },

    tagContactDelete: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'tagContactDelete()')

      try {
        const tagId = call.request.getId()

        await puppet.tagContactDelete(tagId)

        return callback(null, new pbPuppet.TagContactDeleteResponse())

      } catch (e) {
        return grpcError('tagContactDelete', (e as Error), callback)
      }
    },

    tagContactList: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'tagContactList()')

      try {
        const contactId = call.request.getContactId()

        /**
         * for a specific contact
         */
        if (contactId) {
          const tagIdList = await puppet.tagContactList(contactId)

          const response = new pbPuppet.TagContactListResponse()
          response.setIdsList(tagIdList)

          return callback(null, new pbPuppet.TagContactListResponse())
        }

        {
          /**
            * Huan(202110): Deprecated: will be removed after Dec 31, 2022
            */
          const contactIdWrapper = call.request.getContactIdStringValueDeprecated()

          if (contactIdWrapper) {
            const contactId = contactIdWrapper.getValue()

            const tagIdList = await puppet.tagContactList(contactId)

            const response = new pbPuppet.TagContactListResponse()
            response.setIdsList(tagIdList)

            return callback(null, new pbPuppet.TagContactListResponse())
          }
        }

        /**
         * get all tags for all contact
         */
        const tagIdList = await puppet.tagContactList()

        const response = new pbPuppet.TagContactListResponse()
        response.setIdsList(tagIdList)

        return callback(null, response)

      } catch (e) {
        return grpcError('tagContactList', (e as Error), callback)
      }
    },

    tagContactRemove: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'tagContactRemove()')

      try {
        const tagId = call.request.getId()
        const contactId = call.request.getContactId()

        await puppet.tagContactRemove(tagId, contactId)

        return callback(null, new pbPuppet.TagContactRemoveResponse())

      } catch (e) {
        return grpcError('tagContactRemove', (e as Error), callback)
      }
    },

    version: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'version() v%s', puppet.version())
      void call

      try {
        const version = puppet.version()

        const response = new pbPuppet.VersionResponse()
        response.setVersion(version)

        return callback(null, response)

      } catch (e) {
        return grpcError('version', (e as Error), callback)
      }
    },

  }

  return puppetServerImpl
}

export { puppetImplementation }
