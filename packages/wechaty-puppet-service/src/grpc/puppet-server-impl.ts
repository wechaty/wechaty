import grpc             from 'grpc'
import { FileBox }      from 'file-box'
import { StringValue }  from 'google-protobuf/google/protobuf/wrappers_pb'

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
  EventResponse,
  EventType,
  EventRequest,
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
}                                   from '@chatie/grpc'

import {
  Puppet,
  PuppetEventName,
  PUPPET_EVENT_DICT,
  FriendshipPayloadReceive,
  MiniProgramPayload,
  UrlLinkPayload,
  RoomInvitationPayload,
}                                   from 'wechaty-puppet'

import { log } from '../config'

const grpcError = (method: string, e: Error, callback: Function) => {
  log.error('GrpcServerImpl', `${method}() rejection: %s`, e && e.message)

  const error: grpc.ServiceError = {
    ...e,
    code: grpc.status.INTERNAL,
    details: e.message,
  }
  return callback(error, null)
}

/**
 * Implements the SayHello RPC method.
 */
export function getServerImpl (
  puppet: Puppet,
): IPuppetServer {

  let eventStream: undefined | grpc.ServerWritableStream<EventRequest>

  const puppetServerImpl: IPuppetServer = {

    contactAlias: async (call, callback) => {
      log.verbose('GrpcServerImpl', 'contactAlias()')

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
      log.verbose('GrpcServerImpl', 'contactAvatar()')

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
      log.verbose('GrpcServerImpl', 'contactList()')

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
      log.verbose('GrpcServerImpl', 'contactPayload()')

      const id = call.request.getId()

      try {
        const payload = await puppet.contactPayload(id)

        const response = new ContactPayloadResponse()
        response.setAddress(payload.address || '')
        response.setAlias(payload.alias || '')
        response.setAvatar(payload.avatar)
        response.setCity(payload.city || '')
        response.setFriend(payload.friend || false)
        response.setGender(payload.gender as number)
        response.setId(payload.id)
        response.setName(payload.name)
        response.setProvince(payload.province || '')
        response.setSignature(payload.signature || '')
        response.setStar(payload.star || false)
        response.setType(payload.type as number)
        response.setWeixin(payload.weixin || '')

        return callback(null, response)
      } catch (e) {
        return grpcError('contactPayload', e, callback)
      }
    },

    contactSelfName: async (call, callback) => {
      log.verbose('GrpcServerImpl', 'contactSelfName()')

      try {
        const name = call.request.getName()
        await puppet.contactSelfName(name)

        return callback(null, new ContactSelfNameResponse())

      } catch (e) {
        return grpcError('contactSelfName', e, callback)
      }
    },

    contactSelfQRCode: async (call, callback) => {
      log.verbose('GrpcServerImpl', 'contactSelfName()')
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
      log.verbose('GrpcServerImpl', 'contactSelfSignature()')

      try {
        const signature = call.request.getSignature()
        await puppet.contactSelfSignature(signature)

        return callback(null, new ContactSelfSignatureResponse())

      } catch (e) {
        return grpcError('contactSelfSignature', e, callback)
      }

    },

    ding: async (call, callback) => {
      log.verbose('GrpcServerImpl', 'ding()')

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
    event: (streamCall) => {
      log.verbose('GrpcServerImpl', 'event()')

      if (eventStream) {
        log.error('GrpcServerImpl', 'event() called twice, which should not: return with error')

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
        streamCall.emit('error', error)
        return
      }

      eventStream = streamCall

      /**
       * Detect if Inexor Core is gone (GRPC disconnects)
       *  https://github.com/grpc/grpc/issues/8117#issuecomment-362198092
       */
      eventStream.on('cancelled', function () {
        log.verbose('GrpcServerImpl', 'event() eventStream.on(cancelled) fired with arguments: %s', JSON.stringify(arguments))
        eventStream = undefined
      })

      eventStream.on('error', err => {
        log.verbose('GrpcServerImpl', 'event() eventStream.on(error) fired: %s', err)
        eventStream = undefined
      })

      eventStream.on('finish', () => {
        log.verbose('GrpcServerImpl', 'event() eventStream.on(finish) fired')
        eventStream = undefined
      })

      eventStream.on('end', () => {
        log.verbose('GrpcServerImpl', 'event() eventStream.on(end) fired')
        eventStream = undefined
      })

      eventStream.on('close', () => {
        log.verbose('GrpcServerImpl', 'event() eventStream.on(close) fired')
        eventStream = undefined
      })

      const grpcEmit = (type: EventType, obj: Object) => {
        const response = new EventResponse()

        response.setType(type)
        response.setPayload(
          JSON.stringify(
            obj
          )
        )

        if (eventStream) {
          eventStream.write(response)
        } else {
          log.warn('GrpcServerImpl', 'event() grpcEmit() eventStream undefined')
        }
      }

      const eventNameList: PuppetEventName[] = Object.keys(PUPPET_EVENT_DICT) as PuppetEventName[]
      for (const eventName of eventNameList) {
        log.verbose('GrpcServerImpl', 'event() puppet.on(%s) registering...', eventName)

        switch (eventName) {
          case 'dong':
            puppet.on('dong', data => grpcEmit(EventType.EVENT_TYPE_DONG, { data }))
            break

          case 'error':
            puppet.on('error', error => grpcEmit(EventType.EVENT_TYPE_ERROR, { error }))
            break

          case 'watchdog':
            puppet.on('watchdog', data => grpcEmit(EventType.EVENT_TYPE_WATCHDOG, { data }))
            break

          case 'friendship':
            puppet.on('friendship', async friendshipId => grpcEmit(EventType.EVENT_TYPE_FRIENDSHIP, { friendshipId }))
            break

          case 'login':
            puppet.on('login', async contactId => grpcEmit(EventType.EVENT_TYPE_LOGIN, { contactId }))
            break

          case 'logout':
            puppet.on('logout', async (contactId, reason) => grpcEmit(EventType.EVENT_TYPE_LOGOUT, { contactId, reason }))
            break

          case 'message':
            puppet.on('message', async messageId => grpcEmit(EventType.EVENT_TYPE_MESSAGE, { messageId }))
            break

          case 'ready':
            puppet.on('ready', () => grpcEmit(EventType.EVENT_TYPE_READY, {}))
            break

          case 'room-invite':
            puppet.on('room-invite', async roomInvitationId => grpcEmit(EventType.EVENT_TYPE_ROOM_INVITE, { roomInvitationId }))
            break

          case 'room-join':
            puppet.on('room-join', (roomId, inviteeIdList, inviterId, timestamp) => {
              grpcEmit(EventType.EVENT_TYPE_ROOM_JOIN, {
                inviteeIdList,
                inviterId,
                roomId,
                timestamp,
              })
            })
            break

          case 'room-leave':
            puppet.on('room-leave', (roomId, leaverIdList, removerId, timestamp) => {
              grpcEmit(EventType.EVENT_TYPE_ROOM_LEAVE, {
                leaverIdList,
                removerId,
                roomId,
                timestamp,
              })
            })
            break

          case 'room-topic':
            puppet.on('room-topic', (roomId, newTopic, oldTopic, changerId, timestamp) => {
              grpcEmit(EventType.EVENT_TYPE_ROOM_TOPIC, {
                changerId,
                newTopic,
                oldTopic,
                roomId,
                timestamp,
              })
            })
            break

          case 'scan':
            puppet.on('scan', (qrcode, status, data) => {
              grpcEmit(EventType.EVENT_TYPE_SCAN, {
                data,
                qrcode,
                status,
              })
            })
            break

          case 'reset':
            // the `reset` event should be dealed internally, should not send out
            break

          default:
            throw new Error('eventName ' + eventName + ' unsupported!')
        }
      }
    },

    frendshipAccept: async (call, callback) => {
      log.verbose('GrpcServerImpl', 'friendshipAccept()')

      try {
        const id = call.request.getId()
        await puppet.friendshipAccept(id)
        return callback(null, new FriendshipAcceptResponse())

      } catch (e) {
        return grpcError('friendshipAccept', e, callback)
      }
    },

    friendshipAdd: async (call, callback) => {
      log.verbose('GrpcServerImpl', 'friendshipAccept()')

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
      log.verbose('GrpcServerImpl', 'friendshipAccept()')

      try {
        const id = call.request.getId()
        const payload = await puppet.friendshipPayload(id)
        const payloadReceive = payload as FriendshipPayloadReceive

        const response = new FriendshipPayloadResponse()

        response.setContactId(payload.id)
        response.setHello(payload.hello || '')
        response.setId(payload.id)
        response.setScene(payloadReceive.scene as number)
        response.setStranger(payloadReceive.stranger || '')
        response.setTicket(payloadReceive.ticket)
        response.setType(payload.type as number)

        return callback(null, response)

      } catch (e) {
        return grpcError('friendshipPayload', e, callback)
      }
    },

    friendshipSearchPhone: async (call, callback) => {
      log.verbose('GrpcServerImpl', 'friendshipSearchPhone()')

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
      log.verbose('GrpcServerImpl', 'friendshipSearchWeixin()')

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
      log.verbose('GrpcServerImpl', 'logout()')
      void call // empty arguments

      try {
        await puppet.logout()

        return callback(null, new LogoutResponse())

      } catch (e) {
        return grpcError('logout', e, callback)
      }
    },

    messageContact: async (call, callback) => {
      log.verbose('GrpcServerImpl', 'messageContact()')

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
      log.verbose('GrpcServerImpl', 'messageFile()')

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

    messageMiniProgram: async (call, callback) => {
      log.verbose('GrpcServerImpl', 'messageMiniProgram()')

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
      log.verbose('GrpcServerImpl', 'messagePayload()')

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
        response.setType(payload.type as number)

        return callback(null, response)

      } catch (e) {
        return grpcError('messagePayload', e, callback)
      }
    },

    messageRecall: async (call, callback) => {
      log.verbose('GrpcServerImpl', 'messageRecall()')

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
      log.verbose('GrpcServerImpl', 'messageSendContact()')

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
      log.verbose('GrpcServerImpl', 'messageSendFile()')

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
      log.verbose('GrpcServerImpl', 'messageSendMiniProgram()')

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
      log.verbose('GrpcServerImpl', 'messageSendText()')

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
      log.verbose('GrpcServerImpl', 'messageSendUrl()')

      try {
        const conversationId = call.request.getConversationId()
        const jsonText = call.request.getUrlLink()

        const payload = JSON.parse(jsonText) as UrlLinkPayload

        const messageId = await puppet.messageSendUrl(conversationId, payload)

        const response = new MessageSendTextResponse()

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
      log.verbose('GrpcServerImpl', 'messageUrl()')

      try {
        const id = call.request.getId()
        const payload = await puppet.messageUrl(id)

        const response = new MessageUrlResponse()
        response.setUrlLink(JSON.stringify(payload))

        return callback(null, response)

      } catch (e) {
        return grpcError('messageUrl', e, callback)
      }
    },

    roomAdd: async (call, callback) => {
      log.verbose('GrpcServerImpl', 'roomAdd()')

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
      log.verbose('GrpcServerImpl', 'roomAnnounce()')

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
      log.verbose('GrpcServerImpl', 'roomAvatar()')

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
      log.verbose('GrpcServerImpl', 'roomCreate()')

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
      log.verbose('GrpcServerImpl', 'roomDel()')

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
      log.verbose('GrpcServerImpl', 'roomInvitationAccept()')

      try {
        const id = call.request.getId()

        await puppet.roomInvitationAccept(id)

        return callback(null, new RoomInvitationAcceptResponse())

      } catch (e) {
        return grpcError('roomInvitationAccept', e, callback)
      }
    },

    roomInvitationPayload: async (call, callback) => {
      log.verbose('GrpcServerImpl', 'roomInvitationPayload()')

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
      log.verbose('GrpcServerImpl', 'roomList()')
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
      log.verbose('GrpcServerImpl', 'roomMemberList()')

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
      log.verbose('GrpcServerImpl', 'roomMemberPayload()')

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
      log.verbose('GrpcServerImpl', 'roomPayload()')

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
      log.verbose('GrpcServerImpl', 'roomQRCode()')

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
      log.verbose('GrpcServerImpl', 'roomQuit()')

      try {
        const roomId = call.request.getId()

        await puppet.roomQuit(roomId)

        return callback(null, new RoomQuitResponse())

      } catch (e) {
        return grpcError('roomQuit', e, callback)
      }
    },

    roomTopic: async (call, callback) => {
      log.verbose('GrpcServerImpl', 'roomTopic()')

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
      log.verbose('GrpcServerImpl', 'start()')
      void call

      try {
        await puppet.start()

        return callback(null, new StartResponse())

      } catch (e) {
        return grpcError('start', e, callback)
      }
    },

    stop: async (call, callback) => {
      log.verbose('GrpcServerImpl', 'stop()')
      void call

      try {

        if (eventStream) {
          eventStream.end()
          eventStream = undefined
        } else {
          log.error('GrpcServerImpl', 'stop() eventStream is undefined?')
        }

        await puppet.stop()

        return callback(null, new StopResponse())

      } catch (e) {
        return grpcError('stop', e, callback)
      }
    },

    tagContactAdd: async (call, callback) => {
      log.verbose('GrpcServerImpl', 'tagContactAdd()')

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
      log.verbose('GrpcServerImpl', 'tagContactDelete()')

      try {
        const tagId = call.request.getId()

        await puppet.tagContactDelete(tagId)

        return callback(null, new TagContactDeleteResponse())

      } catch (e) {
        return grpcError('tagContactDelete', e, callback)
      }
    },

    tagContactList: async (call, callback) => {
      log.verbose('GrpcServerImpl', 'tagContactList()')

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
      log.verbose('GrpcServerImpl', 'tagContactRemove()')

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
      log.verbose('GrpcServerImpl', 'version() v%s', puppet.version())
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
