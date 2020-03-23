import grpc             from 'grpc'

import {
  IPuppetServer,
  ContactAliasResponse,
  ContactAvatarResponse,
  ContactListResponse,
  ContactPayloadResponse,
  ContactSelfNameResponse,
  ContactSelfQRCodeResponse,
  ContactSelfSignatureResponse,
  DingResponse,
  FriendshipAcceptResponse,
  FriendshipAddResponse,
  FriendshipPayloadResponse,
  FriendshipSearchPhoneResponse,
  FriendshipSearchWeixinResponse,
  LogoutResponse,
  MessageContactResponse,
  MessageFileResponse,
  MessageMiniProgramResponse,
  MessagePayloadResponse,
  MessageRecallResponse,
  MessageSendContactResponse,
  MessageSendFileResponse,
  MessageSendTextResponse,
  MessageUrlResponse,
  RoomAddResponse,
  RoomAnnounceResponse,
  RoomAvatarResponse,
  RoomCreateResponse,
  RoomDelResponse,
  RoomInvitationAcceptResponse,
  RoomInvitationPayloadResponse,
  RoomListResponse,
  RoomMemberListResponse,
  RoomMemberPayloadResponse,
  RoomPayloadResponse,
  RoomQRCodeResponse,
  RoomQuitResponse,
  RoomTopicResponse,
  StartResponse,
  StopResponse,
  TagContactAddResponse,
  TagContactDeleteResponse,
  TagContactListResponse,
  TagContactRemoveResponse,
  VersionResponse,
  MessageSendMiniProgramResponse,
  MessageImageResponse,

  StringValue,
  EventType,
  MessageSendUrlResponse,
}                                   from '@chatie/grpc'

import {
  FileBox,
  Puppet,
  FriendshipPayloadReceive,
  MiniProgramPayload,
  UrlLinkPayload,
  RoomInvitationPayload,
  ImageType,
  FriendshipSceneType,
  EventScanPayload,
}                                   from 'wechaty-puppet'

import { log } from '../config'

import { grpcError }            from './grpc-error'
import { EventStreamManager }   from './event-stream-manager'

/**
 * Implements the SayHello RPC method.
 */
export function puppetImplementation (
  puppet: Puppet,
): IPuppetServer {

  /**
   * Save scan payload to send it to the puppet-hostie right after connected (if needed)
   *
   * TODO: clean the listeners if necessary
   */
  let scanPayload: undefined | EventScanPayload
  puppet.on('scan', payload => { scanPayload = payload   })
  puppet.on('login', _      => { scanPayload = undefined })

  const eventStreamManager = new EventStreamManager(puppet)

  const puppetServerImpl: IPuppetServer = {

    contactAlias: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'contactAlias()')

      const id = call.request.getId()

      /**
       * Set
       */
      {
        const aliasWrapper = call.request.getAlias()
        if (aliasWrapper) {
          try {
            await puppet.contactAlias(id, aliasWrapper.getValue())
            return callback(null, new ContactAliasResponse())
          } catch (e) {
            return grpcError('contactAlias', e, callback)
          }
        }
      }

      /**
       * Get
       */
      try {
        const alias = await puppet.contactAlias(id)

        const aliasWrapper = new StringValue()
        aliasWrapper.setValue(alias)

        const response = new ContactAliasResponse()
        response.setAlias(aliasWrapper)

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
        const fileBoxWrapper = call.request.getFilebox()

        if (fileBoxWrapper) {
          const fileBox = FileBox.fromJSON(
            fileBoxWrapper.getValue()
          )
          await puppet.contactAvatar(id, fileBox)

          return callback(null, new ContactAvatarResponse())
        }
      } catch (e) {
        return grpcError('contactAvatar', e, callback)
      }

      /**
       * Get
       */
      try {
        const fileBox = await puppet.contactAvatar(id)

        const fileBoxWrapper = new StringValue()
        fileBoxWrapper.setValue(
          JSON.stringify(fileBox)
        )

        const response = new ContactAvatarResponse()
        response.setFilebox(fileBoxWrapper)

        return callback(null, response)
      } catch (e) {
        return grpcError('contactAvatar', e, callback)
      }
    },

    contactList: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'contactList()')

      void call // empty request

      try {
        const idList = await puppet.contactList()
        const response = new ContactListResponse()
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

        const response = new ContactPayloadResponse()
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

        return callback(null, response)
      } catch (e) {
        return grpcError('contactPayload', e, callback)
      }
    },

    contactSelfName: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'contactSelfName()')

      try {
        const name = call.request.getName()
        await puppet.contactSelfName(name)

        return callback(null, new ContactSelfNameResponse())

      } catch (e) {
        return grpcError('contactSelfName', e, callback)
      }
    },

    contactSelfQRCode: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'contactSelfName()')
      void call

      try {
        const qrcode = await puppet.contactSelfQRCode()

        const response = new ContactSelfQRCodeResponse()
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

        return callback(null, new ContactSelfSignatureResponse())

      } catch (e) {
        return grpcError('contactSelfSignature', e, callback)
      }

    },

    ding: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'ding()')

      try {
        const data = call.request.getData()
        await puppet.ding(data)
        return callback(null, new DingResponse())

      } catch (e) {
        return grpcError('ding', e, callback)
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
        eventStreamManager.grpcEmit(EventType.EVENT_TYPE_SCAN, scanPayload)
      }
    },

    frendshipAccept: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'friendshipAccept()')

      try {
        const id = call.request.getId()
        await puppet.friendshipAccept(id)
        return callback(null, new FriendshipAcceptResponse())

      } catch (e) {
        return grpcError('friendshipAccept', e, callback)
      }
    },

    friendshipAdd: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'friendshipAccept()')

      try {
        const contactId = call.request.getContactId()
        const hello = call.request.getHello()

        await puppet.friendshipAdd(contactId, hello)
        return callback(null, new FriendshipAddResponse())

      } catch (e) {
        return grpcError('friendshipAdd', e, callback)
      }
    },

    friendshipPayload: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'friendshipAccept()')

      try {
        const id = call.request.getId()
        const payload = await puppet.friendshipPayload(id)
        const payloadReceive = payload as FriendshipPayloadReceive

        const response = new FriendshipPayloadResponse()

        response.setContactId(payload.id)
        response.setHello(payload.hello || '')
        response.setId(payload.id)
        response.setScene(payloadReceive.scene || FriendshipSceneType.Unknown)
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

        const response = new FriendshipSearchPhoneResponse()

        if (contactId) {
          const contactIdWrapper = new StringValue()
          contactIdWrapper.setValue(contactId)
          response.setContactId(contactIdWrapper)
        }

        return callback(null, response)

      } catch (e) {
        return grpcError('friendshipSearchPhone', e, callback)
      }
    },

    friendshipSearchWeixin: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'friendshipSearchWeixin()')

      try {
        const weixin = call.request.getWeixin()
        const contactId = await puppet.friendshipSearchWeixin(weixin)

        const response = new FriendshipSearchWeixinResponse()

        if (contactId) {
          const contactIdWrapper = new StringValue()
          contactIdWrapper.setValue(contactId)
          response.setContactId(contactIdWrapper)
        }

        return callback(null, response)

      } catch (e) {
        return grpcError('friendshipSearchWeixin', e, callback)
      }
    },

    logout: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'logout()')
      void call // empty arguments

      try {
        await puppet.logout()

        return callback(null, new LogoutResponse())

      } catch (e) {
        return grpcError('logout', e, callback)
      }
    },

    messageContact: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'messageContact()')

      try {
        const id = call.request.getId()

        const contactId = await puppet.messageContact(id)

        const response = new MessageContactResponse()
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

        const fileBox = await puppet.messageFile(id)

        const response = new MessageFileResponse()
        response.setFilebox(JSON.stringify(fileBox))

        return callback(null, response)

      } catch (e) {
        return grpcError('messageFile', e, callback)
      }
    },

    messageImage: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'messageImage()')

      try {
        const id = call.request.getId()
        const type = call.request.getType()

        const fileBox = await puppet.messageImage(id, type as number as ImageType)

        const response = new MessageImageResponse()
        response.setFilebox(JSON.stringify(fileBox))

        return callback(null, response)

      } catch (e) {
        return grpcError('messageImage', e, callback)
      }
    },

    messageMiniProgram: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'messageMiniProgram()')

      try {
        const id = call.request.getId()

        const payload = await puppet.messageMiniProgram(id)

        const response = new MessageMiniProgramResponse()
        response.setMiniProgram(JSON.stringify(payload))

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

        const response = new MessagePayloadResponse()
        response.setFilename(payload.filename || '')
        response.setFromId(payload.fromId || '')
        response.setId(payload.id)
        response.setMentionIdsList(payload.mentionIdList)
        response.setRoomId(payload.roomId || '')
        response.setText(payload.text || '')
        response.setTimestamp(payload.timestamp)
        response.setToId(payload.toId || '')
        response.setType(payload.type)

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

        const response = new MessageRecallResponse()
        response.setSuccess(success)

        return callback(null, response)

      } catch (e) {
        grpcError('messageRecall', e, callback)
      }
    },

    messageSendContact: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'messageSendContact()')

      try {
        const conversationId = call.request.getConversationId()
        const contactId = call.request.getContactId()

        const messageId = await puppet.messageSendContact(conversationId, contactId)

        const response = new MessageSendContactResponse()

        if (messageId) {
          const idWrapper = new StringValue()
          idWrapper.setValue(messageId)
          response.setId(idWrapper)
        }

        return callback(null, response)

      } catch (e) {
        return grpcError('messageSendContact', e, callback)
      }
    },

    messageSendFile: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'messageSendFile()')

      try {
        const conversationId = call.request.getConversationId()
        const jsonText = call.request.getFilebox()

        const fileBox = FileBox.fromJSON(jsonText)

        const messageId = await puppet.messageSendFile(conversationId, fileBox)

        const response = new MessageSendFileResponse()

        if (messageId) {
          const idWrapper = new StringValue()
          idWrapper.setValue(messageId)
          response.setId(idWrapper)
        }

        return callback(null, response)

      } catch (e) {
        return grpcError('messageSendFile', e, callback)
      }
    },

    messageSendMiniProgram: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'messageSendMiniProgram()')

      try {
        const conversationId = call.request.getConversationId()
        const jsonText = call.request.getMiniProgram()

        const payload = JSON.parse(jsonText) as MiniProgramPayload

        const messageId = await puppet.messageSendMiniProgram(conversationId, payload)

        const response = new MessageSendMiniProgramResponse()

        if (messageId) {
          const idWrapper = new StringValue()
          idWrapper.setValue(messageId)
          response.setId(idWrapper)
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
        const mentionIdList = call.request.getMentonalIdsList()

        const messageId = await puppet.messageSendText(conversationId, text, mentionIdList)

        const response = new MessageSendTextResponse()

        if (messageId) {
          const idWrapper = new StringValue()
          idWrapper.setValue(messageId)
          response.setId(idWrapper)
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
        const jsonText       = call.request.getUrlLink()

        const payload = JSON.parse(jsonText) as UrlLinkPayload

        const messageId = await puppet.messageSendUrl(conversationId, payload)

        const response = new MessageSendUrlResponse()

        if (messageId) {
          const idWrapper = new StringValue()
          idWrapper.setValue(messageId)
          response.setId(idWrapper)
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

        const response = new MessageUrlResponse()
        response.setUrlLink(JSON.stringify(payload))

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

        await puppet.roomAdd(roomId, contactId)

        return callback(null, new RoomAddResponse())

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
        {
          const textWrapper = call.request.getText()

          if (textWrapper) {
            const text = textWrapper.getValue()
            await puppet.roomAnnounce(roomId, text)

            return callback(null, new RoomAnnounceResponse())
          }
        }

        /**
         * Get
         */
        const text = await puppet.roomAnnounce(roomId)

        const textWrapper = new StringValue()
        textWrapper.setValue(text)

        const response = new RoomAnnounceResponse()
        response.setText(textWrapper)

        return callback(null, response)

      } catch (e) {
        return grpcError('roomAnnounce', e, callback)
      }
    },

    roomAvatar: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'roomAvatar()')

      try {
        const roomId = call.request.getId()

        const fileBox = await puppet.roomAvatar(roomId)

        const response = new RoomAvatarResponse()
        response.setFilebox(JSON.stringify(fileBox))

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

        const response = new RoomCreateResponse()
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

        return callback(null, new RoomDelResponse())

      } catch (e) {
        return grpcError('roomDel', e, callback)
      }
    },

    roomInvitationAccept: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'roomInvitationAccept()')

      try {
        const id = call.request.getId()

        await puppet.roomInvitationAccept(id)

        return callback(null, new RoomInvitationAcceptResponse())

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
          const payloadWrapper = call.request.getPayload()

          if (payloadWrapper) {
            const jsonText = payloadWrapper.getValue()
            const payload = JSON.parse(jsonText) as RoomInvitationPayload
            await puppet.roomInvitationPayload(roomInvitationId, payload)

            return callback(null, new RoomInvitationPayloadResponse())
          }
        }

        /**
         * Get
         */
        const payload = await puppet.roomInvitationPayload(roomInvitationId)

        const response = new RoomInvitationPayloadResponse()
        response.setAvatar(payload.avatar)
        response.setId(payload.id)
        response.setInvitation(payload.invitation)
        response.setInviterId(payload.inviterId)
        response.setMemberCount(payload.memberCount)
        response.setMemberIdsList(payload.memberIdList)
        response.setTimestamp(payload.timestamp)
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

        const response = new RoomListResponse()
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

        const response = new RoomMemberListResponse()
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

        const response = new RoomMemberPayloadResponse()

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

        const response = new RoomPayloadResponse()
        response.setAdminIdsList(payload.adminIdList)
        response.setAvatar(payload.avatar || '')
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

        const response = new RoomQRCodeResponse()
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

        return callback(null, new RoomQuitResponse())

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
        {
          const topicWrapper = call.request.getTopic()
          if (topicWrapper) {
            const topic = topicWrapper.getValue()

            await puppet.roomTopic(roomId, topic)

            return callback(null, new RoomTopicResponse())
          }
        }

        /**
         * Get
         */

        const topic = await puppet.roomTopic(roomId)

        const topicWrapper = new StringValue()
        topicWrapper.setValue(topic)

        const response = new RoomTopicResponse()
        response.setTopic(topicWrapper)

        return callback(null, response)

      } catch (e) {
        return grpcError('roomTopic', e, callback)
      }
    },

    start: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'start()')
      void call

      try {
        await puppet.start()

        return callback(null, new StartResponse())

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

        await puppet.stop()

        return callback(null, new StopResponse())

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

        return callback(null, new TagContactAddResponse())

      } catch (e) {
        return grpcError('tagContactAdd', e, callback)
      }
    },

    tagContactDelete: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'tagContactDelete()')

      try {
        const tagId = call.request.getId()

        await puppet.tagContactDelete(tagId)

        return callback(null, new TagContactDeleteResponse())

      } catch (e) {
        return grpcError('tagContactDelete', e, callback)
      }
    },

    tagContactList: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'tagContactList()')

      try {
        const contactIdWrapper = call.request.getContactId()

        /**
         * for a specific contact
         */
        if (contactIdWrapper) {
          const contactId = contactIdWrapper.getValue()

          const tagIdList = await puppet.tagContactList(contactId)

          const response = new TagContactListResponse()
          response.setIdsList(tagIdList)

          return callback(null, new TagContactListResponse())
        }

        /**
         * get all tags for all contact
         */
        const tagIdList = await puppet.tagContactList()

        const response = new TagContactListResponse()
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

        return callback(null, new TagContactRemoveResponse())

      } catch (e) {
        return grpcError('tagContactRemove', e, callback)
      }
    },

    version: async (call, callback) => {
      log.verbose('PuppetServiceImpl', 'version() v%s', puppet.version())
      void call

      try {
        const version = puppet.version()

        const response = new VersionResponse()
        response.setVersion(version)

        return callback(null, response)

      } catch (e) {
        return grpcError('version', e, callback)
      }
    },

  }

  return puppetServerImpl
}
