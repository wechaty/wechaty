import grpc, { ServiceError, status } from 'grpc'

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
}                                   from '@chatie/grpc'

import { Puppet, PuppetEventName, PUPPET_EVENT_DICT, FriendshipPayloadReceive } from 'wechaty-puppet'

import { log } from '../config'
import { StringValue } from 'google-protobuf/google/protobuf/wrappers_pb'
import FileBox from 'file-box'

const error = (method: string, e: Error, callback: Function) => {
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
            return error('contactAlias', e, callback)
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
        return error('contactAlias', e, callback)
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
        return error('contactAvatar', e, callback)
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
        return error('contactAvatar', e, callback)
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
        return error('contactList', e, callback)
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
        return error('contactPayload', e, callback)
      }
    },

    contactSelfName: async (call, callback) => {
      log.verbose('GrpcServerImpl', 'contactSelfName()')

      try {
        const name = call.request.getName()
        await puppet.contactSelfName(name)

        callback(null, new ContactSelfNameResponse())

      } catch (e) {
        return error('contactSelfName', e, callback)
      }
    },

    contactSelfQRCode: async (call, callback) => {
      log.verbose('GrpcServerImpl', 'contactSelfName()')
      void call

      try {
        const qrcode = await puppet.contactSelfQRCode()

        const response = new ContactSelfQRCodeResponse()
        response.setQrcode(qrcode)

        callback(null, response)

      } catch (e) {
        return error('contactSelfQRCode', e, callback)
      }

    },

    contactSelfSignature: async (call, callback) => {
      log.verbose('GrpcServerImpl', 'contactSelfSignature()')

      try {
        const signature = call.request.getSignature()
        await puppet.contactSelfSignature(signature)

        callback(null, new ContactSelfSignatureResponse())

      } catch (e) {
        return error('contactSelfSignature', e, callback)
      }

    },

    ding: async (call, callback) => {
      log.verbose('GrpcServerImpl', 'ding()')

      try {
        const data = call.request.getData()
        await puppet.ding(data)
        callback(null, new DingResponse())

      } catch (e) {
        return error('ding', e, callback)
      }
    },

    /**
     *
     * Bridge Event Emitter Events
     *
     */
    event: (call) => {
      log.verbose('GrpcServerImpl', 'event()')

      if (eventStream) {
        log.error('GrpcServerImpl', 'event() called twice, which should not: return with error')

        const error: ServiceError = {
          ...new Error('GrpcServerImpl.event() can not call twice.'),
          code: status.ALREADY_EXISTS,
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
        call.emit('error', error)
        return
      }

      eventStream = call

      const emit = (type: EventType, obj: Object) => {
        const response = new EventResponse()

        response.setType(type)
        response.setPayload(
          JSON.stringify(
            obj
          )
        )

        call.write(response)
      }

      const eventNameList: PuppetEventName[] = Object.keys(PUPPET_EVENT_DICT) as PuppetEventName[]
      for (const eventName of eventNameList) {
        log.verbose('GrpcServerImpl', 'event() puppet.on(%s) registering...', eventName)

        switch (eventName) {
          case 'dong':
            puppet.on('dong', data => emit(EventType.EVENT_TYPE_DONG, { data }))
            break

          case 'error':
            puppet.on('error', error => emit(EventType.EVENT_TYPE_ERROR, { error }))
            break

          case 'watchdog':
            puppet.on('watchdog', data => emit(EventType.EVENT_TYPE_WATCHDOG, { data }))
            break

          case 'friendship':
            puppet.on('friendship', async friendshipId => emit(EventType.EVENT_TYPE_FRIENDSHIP, { friendshipId }))
            break

          case 'login':
            puppet.on('login', async contactId => emit(EventType.EVENT_TYPE_LOGIN, { contactId }))
            break

          case 'logout':
            puppet.on('logout', async (contactId, reason) => emit(EventType.EVENT_TYPE_LOGOUT, { contactId, reason }))
            break

          case 'message':
            puppet.on('message', async messageId => emit(EventType.EVENT_TYPE_MESSAGE, { messageId }))
            break

          case 'ready':
            puppet.on('ready', () => emit(EventType.EVENT_TYPE_READY, {}))
            break

          case 'room-invite':
            puppet.on('room-invite', async roomInvitationId => emit(EventType.EVENT_TYPE_ROOM_INVITE, { roomInvitationId }))
            break

          case 'room-join':
            puppet.on('room-join', (roomId, inviteeIdList, inviterId, timestamp) => {
              emit(EventType.EVENT_TYPE_ROOM_JOIN, {
                inviteeIdList,
                inviterId,
                roomId,
                timestamp,
              })
            })
            break

          case 'room-leave':
            puppet.on('room-leave', (roomId, leaverIdList, removerId, timestamp) => {
              emit(EventType.EVENT_TYPE_ROOM_LEAVE, {
                leaverIdList,
                removerId,
                roomId,
                timestamp,
              })
            })
            break

          case 'room-topic':
            puppet.on('room-topic', (roomId, newTopic, oldTopic, changerId, timestamp) => {
              emit(EventType.EVENT_TYPE_ROOM_TOPIC, {
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
              emit(EventType.EVENT_TYPE_SCAN, {
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
        callback(null, new FriendshipAcceptResponse())

      } catch (e) {
        return error('friendshipAccept', e, callback)
      }
    },

    friendshipAdd: async (call, callback) => {
      log.verbose('GrpcServerImpl', 'friendshipAccept()')

      try {
        const contactId = call.request.getContactId()
        const hello = call.request.getHello()

        await puppet.friendshipAdd(contactId, hello)
        callback(null, new FriendshipAddResponse())

      } catch (e) {
        return error('friendshipAdd', e, callback)
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

        callback(null, response)

      } catch (e) {
        return error('friendshipPayload', e, callback)
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

        callback(null, response)

      } catch (e) {
        return error('friendshipSearchPhone', e, callback)
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

        callback(null, response)

      } catch (e) {
        return error('friendshipSearchWeixin', e, callback)
      }
    },

    logout: async (call, callback) => {
      log.verbose('GrpcServerImpl', 'logout()')
      void call // empty arguments

      try {
        await puppet.logout()
        callback(null, new LogoutResponse())

      } catch (e) {
        return error('logout', e, callback)
      }
    },

    messageContact: async (call, callback) => {
      log.verbose('GrpcServerImpl', 'messageContact()')

      try {
        const id = call.request.getId()

        const contactId = await puppet.messageContact(id)

        const response = new MessageContactResponse()
        response.setId(contactId)

        callback(null, response)

      } catch (e) {
        return error('messageContact', e, callback)
      }
    },

    messageFile: async (call, callback) => {
      log.verbose('GrpcServerImpl', 'messageFile()')

      try {
        const id = call.request.getId()

        const fileBox = await puppet.messageFile(id)

        const response = new MessageFileResponse()
        response.setFilebox(JSON.stringify(fileBox))

        callback(null, response)

      } catch (e) {
        return error('messageFile', e, callback)
      }
    },

    messageMiniProgram: async (call, callback) => {
      log.verbose('GrpcServerImpl', 'messageMiniProgram()')

      try {
        const id = call.request.getId()

        const payload = await puppet.messageMiniProgram(id)

        const response = new MessageMiniProgramResponse()
        response.setMiniProgram(JSON.stringify(payload))

        callback(null, response)

      } catch (e) {
        return error('messageMiniProgram', e, callback)
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

        callback(null, response)

      } catch (e) {
        return error('messagePayload', e, callback)
      }
    },

    messageRecall: async (call, callback) => {
      log.verbose('GrpcServerImpl', 'messageRecall()')

      try {
        const id = call.request.getId()

        const success = await puppet.messageRecall(id)

        const response = new MessageRecallResponse()
        response.setSuccess(success)

        callback(null, response)

      } catch (e) {
        error('messageRecall', e, callback)
      }
    },

    messageSendContact: async (call, callback) => {
      void call
      void callback
      throw new Error('not implmented.')
    },

    messageSendFile: async (call, callback) => {
      void call
      void callback
      throw new Error('not implmented.')
    },

    messageSendMiniProgram: async (call, callback) => {
      void call
      void callback
      throw new Error('not implmented.')
    },

    messageSendText: async (call, callback) => {
      void call
      void callback
      throw new Error('not implmented.')
    },

    messageSendUrl: async (call, callback) => {
      void call
      void callback
      throw new Error('not implmented.')
    },

    messageUrl: async (call, callback) => {
      void call
      void callback
      throw new Error('not implmented.')
    },

    roomAdd: async (call, callback) => {
      void call
      void callback
      throw new Error('not implmented.')
    },

    roomAnnounce: async (call, callback) => {
      void call
      void callback
      throw new Error('not implmented.')
    },

    roomAvatar: async (call, callback) => {
      void call
      void callback
      throw new Error('not implmented.')
    },

    roomCreate: async (call, callback) => {
      void call
      void callback
      throw new Error('not implmented.')
    },

    roomDel: async (call, callback) => {
      void call
      void callback
      throw new Error('not implmented.')
    },

    roomInvitationAccept: async (call, callback) => {
      void call
      void callback
      throw new Error('not implmented.')
    },

    roomInvitationPayload: async (call, callback) => {
      void call
      void callback
      throw new Error('not implmented.')
    },

    roomList: async (call, callback) => {
      void call
      void callback
      throw new Error('not implmented.')
    },

    roomMemberList: async (call, callback) => {
      void call
      void callback
      throw new Error('not implmented.')
    },

    roomMemberPayload: async (call, callback) => {
      void call
      void callback
      throw new Error('not implmented.')
    },

    roomPayload: async (call, callback) => {
      void call
      void callback
      throw new Error('not implmented.')
    },

    roomQRCode: async (call, callback) => {
      void call
      void callback
      throw new Error('not implmented.')
    },

    roomQuit: async (call, callback) => {
      void call
      void callback
      throw new Error('not implmented.')
    },

    roomTopic: async (call, callback) => {
      void call
      void callback
      throw new Error('not implmented.')
    },

    start: async (call, callback) => {
      void call
      void callback
      throw new Error('not implmented.')
    },

    stop: async (call, callback) => {
      log.verbose('GrpcServerImpl', 'stop()')

      if (eventStream) {
        eventStream.end()
        eventStream = undefined
      } else {
        log.error('GrpcServerImpl', 'stop() eventStream is undefined?')
      }


      void call
      void callback
      throw new Error('not implmented.')

    },

    tagContactAdd: async (call, callback) => {
      void call
      void callback
      throw new Error('not implmented.')
    },

    tagContactDelete: async (call, callback) => {
      void call
      void callback
      throw new Error('not implmented.')
    },

    tagContactList: async (call, callback) => {
      void call
      void callback
      throw new Error('not implmented.')
    },

    tagContactRemove: async (call, callback) => {
      void call
      void callback
      throw new Error('not implmented.')
    },

    version: async (call, callback) => {
      void call
      void callback
      throw new Error('not implmented.')
    },

  }

  return puppetServerImpl
}
