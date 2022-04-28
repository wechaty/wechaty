/**
 *   Wechaty Open Source Software - https://github.com/wechaty
 *
 *   @copyright 2016 Huan LI (李卓桓) <https://github.com/huan>, and
 *                   Wechaty Contributors <https://github.com/wechaty>.
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
/* eslint-disable sort-keys */
import type { Writable }    from 'stream'
import {
  chunkDecoder,
  chunkEncoder,
  StringValue,
  grpc,
  puppet as grpcPuppet,
}                           from 'wechaty-grpc'
import type {
  FileBoxInterface,
  FileBox,
}                           from 'file-box'
import * as PUPPET          from 'wechaty-puppet'
import { timeoutPromise }   from 'gerror'

import {
  packFileBoxToPb,
  unpackConversationIdFileBoxArgsFromPb,
}                                         from '../deprecated/mod.js'

import {
  timestampFromMilliseconds,
}                             from '../pure-functions/timestamp.js'
import {
  normalizeFileBoxUuid,
}                             from '../file-box-helper/mod.js'
import { log } from '../config.js'
import { grpcError }          from './grpc-error.js'
import { EventStreamManager } from './event-stream-manager.js'

function puppetImplementation (
  puppet      : PUPPET.impls.PuppetInterface,
  FileBoxUuid : typeof FileBox,
): grpcPuppet.IPuppetServer {

  /**
   * Save scan payload to send it to the puppet-service right after connected (if needed)
   *
   * TODO: clean the listeners if necessary
   */
  let scanPayload: undefined  | PUPPET.payloads.EventScan
  let readyPayload: undefined | PUPPET.payloads.EventReady
  let readyTimeout: undefined | ReturnType<typeof setTimeout>

  puppet.on('scan', payload  => { scanPayload = payload    })
  puppet.on('ready', payload => { readyPayload = payload   })
  puppet.on('logout', _      => {
    readyPayload = undefined
    if (readyTimeout) {
      clearTimeout(readyTimeout)
    }
  })
  puppet.on('login', _       => {
    scanPayload = undefined
    readyTimeout = setTimeout(() => {
      // Huan(202110): should we emit ready event here?
      readyPayload && eventStreamManager.grpcEmit(grpcPuppet.EventType.EVENT_TYPE_READY, readyPayload)
    }, 5 * 1000)
  })

  const eventStreamManager = new EventStreamManager(puppet)

  const serializeFileBox = async (fileBox: FileBoxInterface) => {
    /**
     * 1. if the fileBox is one of type `Url`, `QRCode`, `Uuid`, etc,
     *  then it can be serialized by `fileBox.toString()`
     * 2. if the fileBox is one of type `Stream`, `Buffer`, `File`, etc,
     *  then it need to be convert to type `Uuid`
     *  before serialized by `fileBox.toString()`
     */
    const normalizedFileBox = await normalizeFileBoxUuid(FileBoxUuid)(fileBox)
    return JSON.stringify(normalizedFileBox)
  }

  const puppetServerImpl: grpcPuppet.IPuppetServer = {

    contactAlias: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'contactAlias()')

      const id = call.request.getId()

      /**
       * Set
       */
      if (call.request.hasAlias()) {
        try {
          await puppet.contactAlias(id, call.request.getAlias())
          return callback(null, new  grpcPuppet.ContactAliasResponse())
        } catch (e) {
          return grpcError('contactAlias', e, callback)
        }
      }

      /**
       * Get
       */
      try {
        const alias = await puppet.contactAlias(id)

        const response = new grpcPuppet.ContactAliasResponse()
        response.setAlias(alias)

        return callback(null, response)
      } catch (e) {
        return grpcError('contactAlias', e, callback)
      }

    },

    contactAvatar: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'contactAvatar()')

      const id = call.request.getId()

      /**
       * Set
       */
      try {
        if (call.request.hasFileBox()) {

          const fileBox = FileBoxUuid.fromJSON(
            call.request.getFileBox(),
          )
          await puppet.contactAvatar(id, fileBox)

          return callback(null, new grpcPuppet.ContactAvatarResponse())
        }
      } catch (e) {
        return grpcError('contactAvatar', e, callback)
      }

      /**
       * Get
       */
      try {
        const fileBox           = await puppet.contactAvatar(id)
        const serializedFileBox = await serializeFileBox(fileBox)

        const response  = new grpcPuppet.ContactAvatarResponse()
        response.setFileBox(serializedFileBox)

        return callback(null, response)
      } catch (e) {
        return grpcError('contactAvatar', e, callback)
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
        return callback(null, new grpcPuppet.ContactCorporationRemarkResponse())
      } catch (e) {
        return grpcError('contactCorporationRemark', e, callback)
      }
    },

    contactDescription: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'contactDescription()')

      const contactId = call.request.getContactId()

      try {
        const description = call.request.getDescription()
        await puppet.contactDescription(contactId, description || null)
        return callback(null, new grpcPuppet.ContactDescriptionResponse())
      } catch (e) {
        return grpcError('contactDescription', e, callback)
      }
    },

    contactList: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'contactList()')

      void call // empty request

      try {
        const idList = await puppet.contactList()
        const response = new grpcPuppet.ContactListResponse()
        response.setIdsList(idList)

        return callback(null, response)
      } catch (e) {
        return grpcError('contactList', e, callback)
      }
    },

    contactPayload: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'contactPayload()')

      const id = call.request.getId()

      try {
        const payload = await puppet.contactPayload(id)

        const response = new grpcPuppet.ContactPayloadResponse()
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
        /**
         * @deprecated `payload.weixin` will be removed in v2.0
         *  @link https://github.com/wechaty/grpc/issues/174
         */
        response.setWeixin(payload.handle || payload.weixin || '')
        response.setPhonesList(payload.phone)
        response.setCoworker(payload.coworker || false)
        response.setCorporation(payload.corporation || '')
        response.setTitle(payload.title || '')
        response.setDescription(payload.description || '')

        return callback(null, response)
      } catch (e) {
        return grpcError('contactPayload', e, callback)
      }
    },

    contactPhone: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'contactPhone()')

      try {
        const contactId = call.request.getContactId()
        const phoneList = call.request.getPhonesList()

        await puppet.contactPhone(contactId, phoneList)
        return callback(null, new grpcPuppet.ContactPhoneResponse())
      } catch (e) {
        return grpcError('contactPhone', e, callback)
      }
    },

    contactSelfName: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'contactSelfName()')

      try {
        const name = call.request.getName()
        await puppet.contactSelfName(name)

        return callback(null, new grpcPuppet.ContactSelfNameResponse())

      } catch (e) {
        return grpcError('contactSelfName', e, callback)
      }
    },

    contactSelfQRCode: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'contactSelfName()')
      void call

      try {
        const qrcode = await puppet.contactSelfQRCode()

        const response = new grpcPuppet.ContactSelfQRCodeResponse()
        response.setQrcode(qrcode)

        return callback(null, response)

      } catch (e) {
        return grpcError('contactSelfQRCode', e, callback)
      }

    },

    contactSelfSignature: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'contactSelfSignature()')

      try {
        const signature = call.request.getSignature()
        await puppet.contactSelfSignature(signature)

        return callback(null, new grpcPuppet.ContactSelfSignatureResponse())

      } catch (e) {
        return grpcError('contactSelfSignature', e, callback)
      }

    },

    ding: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'ding()')

      try {
        const data = call.request.getData()
        await puppet.ding(data)
        return callback(null, new grpcPuppet.DingResponse())

      } catch (e) {
        return grpcError('ding', e, callback)
      }
    },

    dirtyPayload: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'dirtyPayload()')

      try {
        const id = call.request.getId()
        const type: PUPPET.types.Dirty = call.request.getType()

        await puppet.dirtyPayload(type, id)
        return callback(null, new grpcPuppet.DirtyPayloadResponse())
      } catch (e) {
        return grpcError('puppet.dirtyPayload() rejection: ', e, callback)
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
        eventStreamManager.grpcEmit(grpcPuppet.EventType.EVENT_TYPE_SCAN, scanPayload)
      }
    },

    friendshipAccept: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'friendshipAccept()')

      try {
        const id = call.request.getId()
        await puppet.friendshipAccept(id)
        return callback(null, new grpcPuppet.FriendshipAcceptResponse())

      } catch (e) {
        return grpcError('friendshipAccept', e, callback)
      }
    },

    friendshipAdd: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'friendshipAdd()')

      try {
        const contactId = call.request.getContactId()
        // FIXME: for backward compatibility, need to be removed after all puppet has updated.
        const hello = call.request.getHello()

        const referrer = call.request.getReferrer()
        const friendshipAddOptions: PUPPET.types.FriendshipAddOptions = {
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
        return callback(null, new grpcPuppet.FriendshipAddResponse())

      } catch (e) {
        return grpcError('friendshipAdd', e, callback)
      }
    },

    friendshipPayload: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'friendshipPayload()')

      try {
        const id = call.request.getId()
        const payload = await puppet.friendshipPayload(id)
        const payloadReceive = payload as PUPPET.payloads.FriendshipReceive

        const response = new grpcPuppet.FriendshipPayloadResponse()

        response.setContactId(payload.contactId)
        response.setHello(payload.hello || '')
        response.setId(payload.id)
        response.setScene(payloadReceive.scene || PUPPET.types.FriendshipScene.Unknown)
        response.setStranger(payloadReceive.stranger || '')
        response.setTicket(payloadReceive.ticket)
        response.setType(payload.type)

        return callback(null, response)

      } catch (e) {
        return grpcError('friendshipPayload', e, callback)
      }
    },

    friendshipSearchPhone: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'friendshipSearchPhone()')

      try {
        const phone = call.request.getPhone()
        const contactId = await puppet.friendshipSearchPhone(phone)

        const response = new grpcPuppet.FriendshipSearchPhoneResponse()

        if (contactId) {
          response.setContactId(contactId)
        }

        return callback(null, response)

      } catch (e) {
        return grpcError('friendshipSearchPhone', e, callback)
      }
    },
    /**
     * @deprecated use `friendshipSearchHandle()` instead, will be removed in v3.0
     */
    friendshipSearchWeixin: async (call, callback) => {
      log.warn('PuppetServiceImpl', 'friendshipSearchWeixin() is deprecated, use friendshipSearchHandle() instead. %s', new Error().stack)
      return puppetServerImpl.friendshipSearchHandle(call, callback)
    },

    friendshipSearchHandle: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'friendshipSearchHandle()')

      try {
        /**
         * Huan(202203): rename `getWeixin()` to `getHandle()` in v2.0.0
         *  @link https://github.com/wechaty/grpc/issues/174
         */
        const handle = call.request.getWeixin()
        const contactId = await puppet.friendshipSearchHandle(handle)

        const response = new grpcPuppet.FriendshipSearchHandleResponse()

        if (contactId) {
          response.setContactId(contactId)
        }

        return callback(null, response)

      } catch (e) {
        return grpcError('friendshipSearchHandle', e, callback)
      }
    },

    logout: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'logout()')
      void call // empty arguments

      try {
        await puppet.logout()

        return callback(null, new grpcPuppet.LogoutResponse())

      } catch (e) {
        return grpcError('logout', e, callback)
      }
    },

    messageContact: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'messageContact()')

      try {
        const id = call.request.getId()

        const contactId = await puppet.messageContact(id)

        const response = new grpcPuppet.MessageContactResponse()
        response.setId(contactId)

        return callback(null, response)

      } catch (e) {
        return grpcError('messageContact', e, callback)
      }
    },

    messageFile: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'messageFile()')

      try {
        const id = call.request.getId()

        const fileBox           = await puppet.messageFile(id)
        const serializedFileBox = await serializeFileBox(fileBox)

        const response = new grpcPuppet.MessageFileResponse()
        response.setFileBox(serializedFileBox)

        return callback(null, response)

      } catch (e) {
        return grpcError('messageFile', e, callback)
      }
    },

    /**
     * @deprecated will be removed after Dec 31, 2022
     */
    messageFileStream: async (call) => {
      log.verbose('PuppetServiceImpl', 'messageFileStream()')

      try {
        const id = call.request.getId()

        const fileBox  = await puppet.messageFile(id)
        const response = await packFileBoxToPb(grpcPuppet.MessageFileStreamResponse)(fileBox)

        response.on('error', e => call.destroy(e as Error))
        response.pipe(call as unknown as Writable) // Huan(202203): FIXME: as unknown as

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

        const response = new grpcPuppet.MessageForwardResponse()
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
        return grpcError('messageForward', e, callback)
      }
    },

    messageImage: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'messageImage()')

      try {
        const id    = call.request.getId()
        const type  = call.request.getType()

        const fileBox           = await puppet.messageImage(id, type)
        const serializedFileBox = await serializeFileBox(fileBox)

        const response = new grpcPuppet.MessageImageResponse()
        response.setFileBox(serializedFileBox)

        return callback(null, response)

      } catch (e) {
        return grpcError('messageImage', e, callback)
      }
    },

    /**
     * @deprecated will be removed after Dec 31, 2022
     */
    messageImageStream: async (call) => {
      log.verbose('PuppetServiceImpl', 'messageImageStream()')

      try {
        const id    = call.request.getId()
        const type  = call.request.getType()

        const fileBox  = await puppet.messageImage(id, type) //  as number as PUPPET.types.Image
        const response = await packFileBoxToPb(grpcPuppet.MessageImageStreamResponse)(fileBox)

        response.on('error', e => call.destroy(e as Error))
        response.pipe(call as unknown as Writable)  // Huan(202203) FIXME: as unknown as

      } catch (e) {
        log.error('PuppetServiceImpl', 'grpcError() messageImageStream() rejection: %s', (e as Error).message)
        call.destroy(e as Error)
      }
    },

    messageLocation: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'messageLocation()')

      try {
        const id = call.request.getId()

        const payload = await puppet.messageLocation(id)

        const response = new grpcPuppet.MessageLocationResponse()

        const pbLocationPayload = new grpcPuppet.LocationPayload()
        pbLocationPayload.setLatitude(payload.latitude)
        pbLocationPayload.setLongitude(payload.longitude)
        pbLocationPayload.setAccuracy(payload.accuracy)
        pbLocationPayload.setAddress(payload.address)
        pbLocationPayload.setName(payload.name)
        response.setLocation(pbLocationPayload)

        return callback(null, response)

      } catch (e) {
        return grpcError('messageLocation', e, callback)
      }
    },

    messageMiniProgram: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'messageMiniProgram()')

      try {
        const id = call.request.getId()

        const payload = await puppet.messageMiniProgram(id)

        const response = new grpcPuppet.MessageMiniProgramResponse()

        const pbMiniProgramPayload = new grpcPuppet.MiniProgramPayload()
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
        return grpcError('messageMiniProgram', e, callback)
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

        const response = new grpcPuppet.MessagePayloadResponse()
        response.setFilename(payload.filename || '')
        /**
         * Huan(202203):`payload.fromId` is deprecated, will be removed in v2.0
         */
        response.setTalkerId(payload.talkerId || payload.fromId || '')
        response.setId(payload.id)
        response.setMentionIdsList(mentionIdList)
        response.setRoomId(payload.roomId || '')
        response.setText(payload.text || '')

        response.setReceiveTime(timestampFromMilliseconds(payload.timestamp))
        // Deprecated: will be removed after Dec 31, 2022
        response.setTimestampDeprecated(Math.floor(payload.timestamp))

        /**
         * Huan(202203):`payload.toId` is deprecated, will be removed in v2.0
         */
        response.setListenerId(payload.listenerId || payload.toId || '')
        response.setType(payload.type as grpcPuppet.MessageTypeMap[keyof grpcPuppet.MessageTypeMap])

        return callback(null, response)

      } catch (e) {
        return grpcError('messagePayload', e, callback)
      }
    },

    messageRecall: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'messageRecall()')

      try {
        const id = call.request.getId()

        const success = await puppet.messageRecall(id)

        const response = new grpcPuppet.MessageRecallResponse()
        response.setSuccess(success)

        return callback(null, response)

      } catch (e) {
        return grpcError('messageRecall', e, callback)
      }
    },

    messageSendContact: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'messageSendContact()')

      try {
        const conversationId = call.request.getConversationId()
        const contactId = call.request.getContactId()

        const messageId = await puppet.messageSendContact(conversationId, contactId)

        const response = new grpcPuppet.MessageSendContactResponse()

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
        return grpcError('messageSendContact', e, callback)
      }
    },

    messageSendFile: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'messageSendFile()')

      try {
        const conversationId  = call.request.getConversationId()
        const jsonText        = call.request.getFileBox()

        const fileBox = FileBoxUuid.fromJSON(jsonText)

        const messageId = await puppet.messageSendFile(conversationId, fileBox)

        const response = new grpcPuppet.MessageSendFileResponse()

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
        return grpcError('messageSendFile', e, callback)
      }
    },

    /**
     * @deprecated will be removed after Dec 31, 2022
     */
    messageSendFileStream: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'messageSendFileStream()')

      try {
        const requestArgs = await unpackConversationIdFileBoxArgsFromPb(call)
        const conversationId = requestArgs.conversationId
        const fileBox = requestArgs.fileBox

        const messageId = await puppet.messageSendFile(conversationId, fileBox)

        const response = new grpcPuppet.MessageSendFileStreamResponse()

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
        return grpcError('messageSendFileStream', e, callback)
      }
    },

    messageSendLocation: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'messageSendLocation()')

      try {
        const conversationId    = call.request.getConversationId()
        const pbLocationPayload = call.request.getLocation()

        const payload: PUPPET.payloads.Location = {
          accuracy  : 0,
          address   : 'NOADDRESS',
          latitude  : 0,
          longitude : 0,
          name      : 'NONAME',
          ...pbLocationPayload,
        }

        const messageId = await puppet.messageSendLocation(conversationId, payload)

        const response = new grpcPuppet.MessageSendLocationResponse()

        if (messageId) {
          response.setId(messageId)
        }

        return callback(null, response)

      } catch (e) {
        return grpcError('messageSendLocation', e, callback)
      }
    },

    messageSendMiniProgram: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'messageSendMiniProgram()')

      try {
        const conversationId      = call.request.getConversationId()
        let pbMiniProgramPayload  = call.request.getMiniProgram()?.toObject()
        if (!pbMiniProgramPayload) {
          // Deprecated: will be removed after Dec 31, 2022
          const jsonText = call.request.getMiniProgramDeprecated()
          pbMiniProgramPayload = JSON.parse(jsonText)
        }

        const payload: PUPPET.payloads.MiniProgram = {
          ...pbMiniProgramPayload,
        }

        const messageId = await puppet.messageSendMiniProgram(conversationId, payload)

        const response = new grpcPuppet.MessageSendMiniProgramResponse()

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
        return grpcError('messageSendMiniProgram', e, callback)
      }
    },

    messageSendText: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'messageSendText()')

      try {
        const conversationId = call.request.getConversationId()
        const text = call.request.getText()
        const mentionIdList = call.request.getMentionalIdsList()

        const messageId = await puppet.messageSendText(conversationId, text, mentionIdList)

        const response = new grpcPuppet.MessageSendTextResponse()

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
        return grpcError('messageSendText', e, callback)
      }
    },

    messageSendUrl: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'messageSendUrl()')

      try {
        const conversationId = call.request.getConversationId()
        let pbUrlLinkPayload = call.request.getUrlLink()?.toObject()

        if (!pbUrlLinkPayload) {
          // Deprecated: will be removed after Dec 31, 2022
          const jsonText = call.request.getUrlLinkDeprecated()
          pbUrlLinkPayload = JSON.parse(jsonText)
        }

        const payload: PUPPET.payloads.UrlLink = {
          title : 'NOTITLE',
          url   : 'NOURL',
          ...pbUrlLinkPayload,
        }

        const messageId = await puppet.messageSendUrl(conversationId, payload)

        const response = new grpcPuppet.MessageSendUrlResponse()

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
        return grpcError('messageSendUrl', e, callback)
      }
    },

    messageUrl: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'messageUrl()')

      try {
        const id      = call.request.getId()
        const payload = await puppet.messageUrl(id)

        const response = new grpcPuppet.MessageUrlResponse()

        const pbUrlLinkPayload = new grpcPuppet.UrlLinkPayload()
        pbUrlLinkPayload.setTitle(payload.title)
        pbUrlLinkPayload.setUrl(payload.url)
        if (payload.thumbnailUrl) { pbUrlLinkPayload.setThumbnailUrl(payload.thumbnailUrl) }
        if (payload.description)  { pbUrlLinkPayload.setDescription(payload.description) }
        response.setUrlLink(pbUrlLinkPayload)

        // Deprecated: will be removed after Dec 31, 2022
        response.setUrlLinkDeprecated(JSON.stringify(payload))

        return callback(null, response)

      } catch (e) {
        return grpcError('messageUrl', e, callback)
      }
    },

    roomAdd: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'roomAdd()')

      try {
        const roomId = call.request.getId()
        const contactId = call.request.getContactId()
        const inviteOnly = call.request.getInviteOnly()

        await puppet.roomAdd(roomId, contactId, inviteOnly)

        return callback(null, new grpcPuppet.RoomAddResponse())

      } catch (e) {
        return grpcError('roomAdd', e, callback)
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
          return callback(null, new grpcPuppet.RoomAnnounceResponse())
        }

        /**
         * Get
         */
        const text = await puppet.roomAnnounce(roomId)

        const response = new grpcPuppet.RoomAnnounceResponse()
        response.setText(text)

        return callback(null, response)

      } catch (e) {
        return grpcError('roomAnnounce', e, callback)
      }
    },

    roomAvatar: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'roomAvatar()')

      try {
        const roomId = call.request.getId()

        const fileBox           = await puppet.roomAvatar(roomId)
        const serializedFileBox = await serializeFileBox(fileBox)

        const response = new grpcPuppet.RoomAvatarResponse()
        response.setFileBox(serializedFileBox)

        return callback(null, response)

      } catch (e) {
        return grpcError('roomAvatar', e, callback)
      }
    },

    roomCreate: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'roomCreate()')

      try {
        const contactIdList = call.request.getContactIdsList()
        const topic = call.request.getTopic()

        const roomId = await puppet.roomCreate(contactIdList, topic)

        const response = new grpcPuppet.RoomCreateResponse()
        response.setId(roomId)

        return callback(null, response)

      } catch (e) {
        return grpcError('roomCreate', e, callback)
      }
    },

    roomDel: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'roomDel()')

      try {
        const roomId = call.request.getId()
        const contactId = call.request.getContactId()

        await puppet.roomDel(roomId, contactId)

        return callback(null, new grpcPuppet.RoomDelResponse())

      } catch (e) {
        return grpcError('roomDel', e, callback)
      }
    },

    roomInvitationAccept: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'roomInvitationAccept()')

      try {
        const id = call.request.getId()

        await puppet.roomInvitationAccept(id)

        return callback(null, new grpcPuppet.RoomInvitationAcceptResponse())

      } catch (e) {
        return grpcError('roomInvitationAccept', e, callback)
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
            const payload = JSON.parse(jsonText) as PUPPET.payloads.RoomInvitation
            await puppet.roomInvitationPayload(roomInvitationId, payload)

            return callback(null, new grpcPuppet.RoomInvitationPayloadResponse())
          }

          {
            /**
              * Huan(202110): Deprecated: will be removed after Dec 31, 2022
              */
            const payloadWrapper = call.request.getPayloadStringValueDeprecated()

            if (payloadWrapper) {
              const jsonText = payloadWrapper.getValue()
              const payload = JSON.parse(jsonText) as PUPPET.payloads.RoomInvitation
              await puppet.roomInvitationPayload(roomInvitationId, payload)

              return callback(null, new grpcPuppet.RoomInvitationPayloadResponse())
            }
          }
        }

        /**
         * Get
         */
        const payload = await puppet.roomInvitationPayload(roomInvitationId)

        const response = new grpcPuppet.RoomInvitationPayloadResponse()
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
        return grpcError('roomInvitationPayload', e, callback)
      }
    },

    roomList: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'roomList()')
      void call

      try {
        const roomIdList = await puppet.roomList()

        const response = new grpcPuppet.RoomListResponse()
        response.setIdsList(roomIdList)

        return callback(null, response)

      } catch (e) {
        return grpcError('roomList', e, callback)
      }
    },

    roomMemberList: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'roomMemberList()')

      try {
        const roomId = call.request.getId()

        const roomMemberIdList = await puppet.roomMemberList(roomId)

        const response = new grpcPuppet.RoomMemberListResponse()
        response.setMemberIdsList(roomMemberIdList)

        return callback(null, response)

      } catch (e) {
        return grpcError('roomMemberList', e, callback)
      }
    },

    roomMemberPayload: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'roomMemberPayload()')

      try {
        const roomId = call.request.getId()
        const memberId = call.request.getMemberId()

        const payload = await puppet.roomMemberPayload(roomId, memberId)

        const response = new grpcPuppet.RoomMemberPayloadResponse()

        response.setAvatar(payload.avatar)
        response.setId(payload.id)
        response.setInviterId(payload.inviterId || '')
        response.setName(payload.name)
        response.setRoomAlias(payload.roomAlias || '')

        return callback(null, response)

      } catch (e) {
        return grpcError('roomMemberPayload', e, callback)
      }
    },

    roomPayload: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'roomPayload()')

      try {
        const roomId = call.request.getId()

        const payload = await puppet.roomPayload(roomId)

        const response = new grpcPuppet.RoomPayloadResponse()
        response.setAdminIdsList(payload.adminIdList)
        response.setAvatar(payload.avatar || '')
        response.setHandle(payload.handle || '')
        response.setId(payload.id)
        response.setMemberIdsList(payload.memberIdList)
        response.setOwnerId(payload.ownerId || '')
        response.setTopic(payload.topic)

        return callback(null, response)

      } catch (e) {
        return grpcError('roomPayload', e, callback)
      }
    },

    roomQRCode: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'roomQRCode()')

      try {
        const roomId = call.request.getId()

        const qrcode = await puppet.roomQRCode(roomId)

        const response = new grpcPuppet.RoomQRCodeResponse()
        response.setQrcode(qrcode)

        return callback(null, response)

      } catch (e) {
        return grpcError('roomQRCode', e, callback)
      }
    },

    roomQuit: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'roomQuit()')

      try {
        const roomId = call.request.getId()

        await puppet.roomQuit(roomId)

        return callback(null, new grpcPuppet.RoomQuitResponse())

      } catch (e) {
        return grpcError('roomQuit', e, callback)
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

          return callback(null, new grpcPuppet.RoomTopicResponse())
        }

        /**
         * Get
         */

        const topic = await puppet.roomTopic(roomId)

        const response = new grpcPuppet.RoomTopicResponse()
        response.setTopic(topic)

        return callback(null, response)

      } catch (e) {
        return grpcError('roomTopic', e, callback)
      }
    },

    start: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'start()')
      void call

      try {
        await timeoutPromise(
          puppet.start(),
          15 * 1000,  // 15 seconds timeout
        )

        return callback(null, new grpcPuppet.StartResponse())

      } catch (e) {
        return grpcError('start', e, callback)
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

        readyPayload = undefined

        await timeoutPromise(
          puppet.stop(),
          15 * 1000, // 15 seconds timeout
        )

        return callback(null, new grpcPuppet.StopResponse())

      } catch (e) {
        return grpcError('stop', e, callback)
      }
    },

    tagContactAdd: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'tagContactAdd()')

      try {
        const tagId = call.request.getId()
        const contactId = call.request.getContactId()

        await puppet.tagContactAdd(tagId, contactId)

        return callback(null, new grpcPuppet.TagContactAddResponse())

      } catch (e) {
        return grpcError('tagContactAdd', e, callback)
      }
    },

    tagContactDelete: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'tagContactDelete()')

      try {
        const tagId = call.request.getId()

        await puppet.tagContactDelete(tagId)

        return callback(null, new grpcPuppet.TagContactDeleteResponse())

      } catch (e) {
        return grpcError('tagContactDelete', e, callback)
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

          const response = new grpcPuppet.TagContactListResponse()
          response.setIdsList(tagIdList)

          return callback(null, new grpcPuppet.TagContactListResponse())
        }

        {
          /**
            * Huan(202110): Deprecated: will be removed after Dec 31, 2022
            */
          const contactIdWrapper = call.request.getContactIdStringValueDeprecated()

          if (contactIdWrapper) {
            const contactId = contactIdWrapper.getValue()

            const tagIdList = await puppet.tagContactList(contactId)

            const response = new grpcPuppet.TagContactListResponse()
            response.setIdsList(tagIdList)

            return callback(null, new grpcPuppet.TagContactListResponse())
          }
        }

        /**
         * get all tags for all contact
         */
        const tagIdList = await puppet.tagContactList()

        const response = new grpcPuppet.TagContactListResponse()
        response.setIdsList(tagIdList)

        return callback(null, response)

      } catch (e) {
        return grpcError('tagContactList', e, callback)
      }
    },

    tagContactRemove: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'tagContactRemove()')

      try {
        const tagId = call.request.getId()
        const contactId = call.request.getContactId()

        await puppet.tagContactRemove(tagId, contactId)

        return callback(null, new grpcPuppet.TagContactRemoveResponse())

      } catch (e) {
        return grpcError('tagContactRemove', e, callback)
      }
    },

    version: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'version() v%s', puppet.version())
      void call

      try {
        const version = puppet.version()

        const response = new grpcPuppet.VersionResponse()
        response.setVersion(version)

        return callback(null, response)

      } catch (e) {
        return grpcError('version', e, callback)
      }
    },

    download: async (call) => {
      log.verbose('PuppetServiceImpl', 'download()')

      const uuid    = call.request.getId()
      const fileBox = FileBoxUuid.fromUuid(uuid, { name: 'uuid.dat' })

      fileBox
        .pipe(chunkEncoder(grpcPuppet.DownloadResponse))
        .pipe(call as unknown as Writable)  // Huan(202203) FIXME: as unknown as
    },

    upload: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'upload()')

      const fileBox = FileBoxUuid.fromStream(
        call.pipe(chunkDecoder()),
        'uuid.dat',
      )

      const uuid = await fileBox.toUuid()

      const response = new grpcPuppet.UploadResponse()
      response.setId(uuid)

      return callback(null, response)
    },

  }

  return puppetServerImpl
}

export { puppetImplementation }
