import grpc             from 'grpc'

import {
  EventResponse,
  EventType,
  EventRequest,
  EventTypeMap,
}                                   from '@chatie/grpc'

import {
  PUPPET_EVENT_DICT,
  Puppet,
  PuppetEventName,
  EventLoginPayload,
  EventDongPayload,
  EventErrorPayload,
  EventHeartbeatPayload,
  EventFriendshipPayload,
  EventLogoutPayload,
  EventMessagePayload,
  EventReadyPayload,
  EventRoomInvitePayload,
  EventRoomJoinPayload,
  EventRoomLeavePayload,
  EventRoomTopicPayload,
  EventScanPayload,
}                                   from 'wechaty-puppet'

import {
  log,
}                 from '../config'

import {
  EventTypeRev,
}                 from '../event-type-rev'

export class EventStreamManager {

  protected eventStream: undefined | grpc.ServerWritableStream<EventRequest>

  constructor (
    public puppet: Puppet,
  ) {
    log.verbose('EventStreamManager', 'constructor(%s)', puppet)
  }

  public busy (): boolean {
    return !!this.eventStream
  }

  public start (
    stream: grpc.ServerWritableStream<EventRequest>,
  ): void {
    log.verbose('EventStreamManager', 'start(stream)')

    if (this.eventStream) {
      throw new Error('can not set twice')
    }
    this.eventStream = stream

    const unconnect = this.connectPuppetEventToStreamingCall()
    this.onStreamingCallEnd(unconnect)

    /**
      * We emit the login event if current the puppet is logged in.
      */
    if (this.puppet.logonoff()) {
      log.verbose('EventStreamManager', 'start() puppet is logged in, emit a login event for downstream')

      const payload = {
        contactId: this.puppet.selfId(),
      } as EventLoginPayload

      this.grpcEmit(EventType.EVENT_TYPE_LOGIN, payload)
    }
  }

  public stop (): void {
    log.verbose('EventStreamManager', 'stop()')

    if (!this.eventStream) {
      throw new Error('no this.eventStream')
    }

    this.eventStream.end()
    this.eventStream = undefined
  }

  public grpcEmit (
    type : EventTypeMap[keyof EventTypeMap],  // https://stackoverflow.com/a/49286056/1123955
    obj  : object,
  ): void {
    log.verbose('EventStreamManager', 'grpcEmit(%s[%s], %s)',
      EventTypeRev[type],
      type,
      JSON.stringify(obj),
    )

    const response = new EventResponse()

    response.setType(type)
    response.setPayload(
      JSON.stringify(obj)
    )

    if (this.eventStream) {
      this.eventStream.write(response)
    } else {
      log.warn('EventStreamManager', 'grpcEmit(%s, %s) this.eventStream is undefined.',
        type,
        JSON.stringify(obj),
      )
    }
  }

  public connectPuppetEventToStreamingCall (): () => void {
    log.verbose('EventStreamManager', 'connectPuppetEventToStreamingCall() for %s', this.puppet)

    const offCallbackList = [] as (() => void)[]
    const unconnect = () => {
      log.verbose('EventStreamManager',
        'connectPuppetEventToStreamingCall() unconnect() %s callbacks',
        offCallbackList.length,
      )
      offCallbackList.forEach(cb => cb())
    }

    const eventNameList: PuppetEventName[] = Object.keys(PUPPET_EVENT_DICT) as PuppetEventName[]
    for (const eventName of eventNameList) {
      log.verbose('EventStreamManager',
        'connectPuppetEventToStreamingCall() this.puppet.on(%s) (listenerCount:%s) registering...',
        eventName,
        this.puppet.listenerCount(eventName)
      )

      switch (eventName) {
        case 'dong': {
          const listener = (payload: EventDongPayload) => this.grpcEmit(EventType.EVENT_TYPE_DONG, payload)
          this.puppet.on('dong', listener)
          const off = () => this.puppet.off('dong', listener)
          offCallbackList.push(off)
          break
        }
        case 'error': {
          const listener = (payload: EventErrorPayload) => this.grpcEmit(EventType.EVENT_TYPE_ERROR, payload)
          this.puppet.on('error', listener)
          const off = () => this.puppet.off('error', listener)
          offCallbackList.push(off)
          break
        }
        case 'heartbeat': {
          const listener = (payload: EventHeartbeatPayload) => this.grpcEmit(EventType.EVENT_TYPE_HEARTBEAT, payload)
          this.puppet.on('heartbeat', listener)
          const off = () => this.puppet.off('heartbeat', listener)
          offCallbackList.push(off)
          break
        }
        case 'friendship': {
          const listener = (payload: EventFriendshipPayload) => this.grpcEmit(EventType.EVENT_TYPE_FRIENDSHIP, payload)
          this.puppet.on('friendship', listener)
          const off = () => this.puppet.off('friendship', listener)
          offCallbackList.push(off)
          break
        }
        case 'login': {
          const listener = (payload: EventLoginPayload) => this.grpcEmit(EventType.EVENT_TYPE_LOGIN, payload)
          this.puppet.on('login', listener)
          const off = () => this.puppet.off('login', listener)
          offCallbackList.push(off)
          break
        }
        case 'logout': {
          const listener = (payload: EventLogoutPayload) => this.grpcEmit(EventType.EVENT_TYPE_LOGOUT, payload)
          this.puppet.on('logout', listener)
          const off = () => this.puppet.off('logout', listener)
          offCallbackList.push(off)
          break
        }
        case 'message': {
          const listener = (payload: EventMessagePayload) => this.grpcEmit(EventType.EVENT_TYPE_MESSAGE, payload)
          this.puppet.on('message', listener)
          const off = () => this.puppet.off('message', listener)
          offCallbackList.push(off)
          break
        }
        case 'ready': {
          const listener = (payload: EventReadyPayload) => this.grpcEmit(EventType.EVENT_TYPE_READY, payload)
          this.puppet.on('ready', listener)
          const off = () => this.puppet.off('ready', listener)
          offCallbackList.push(off)
          break
        }
        case 'room-invite': {
          const listener = (payload: EventRoomInvitePayload) => this.grpcEmit(EventType.EVENT_TYPE_ROOM_INVITE, payload)
          this.puppet.on('room-invite', listener)
          const off = () => this.puppet.off('room-invite', listener)
          offCallbackList.push(off)
          break
        }
        case 'room-join': {
          const listener = (payload: EventRoomJoinPayload) => this.grpcEmit(EventType.EVENT_TYPE_ROOM_JOIN, payload)
          this.puppet.on('room-join', listener)
          const off = () => this.puppet.off('room-join', listener)
          offCallbackList.push(off)
          break
        }
        case 'room-leave': {
          const listener = (payload: EventRoomLeavePayload) => this.grpcEmit(EventType.EVENT_TYPE_ROOM_LEAVE, payload)
          this.puppet.on('room-leave', listener)
          const off = () => this.puppet.off('room-leave', listener)
          offCallbackList.push(off)
          break
        }
        case 'room-topic': {
          const listener = (payload: EventRoomTopicPayload) => this.grpcEmit(EventType.EVENT_TYPE_ROOM_TOPIC, payload)
          this.puppet.on('room-topic', listener)
          const off = () => this.puppet.off('room-topic', listener)
          offCallbackList.push(off)
          break
        }
        case 'scan': {
          const listener = (payload: EventScanPayload) => this.grpcEmit(EventType.EVENT_TYPE_SCAN, payload)
          this.puppet.on('scan', listener)
          const off = () => this.puppet.off('scan', listener)
          offCallbackList.push(off)
          break
        }
        case 'reset':
          // the `reset` event should be dealed internally, should not send out
          break

        default:
          // Huan(202003): in default, the `eventName` type should be `never`, please check.
          throw new Error('eventName ' + eventName + ' unsupported!')
      }
    }

    return unconnect
  }

  /**
   * Detect if the streaming call was gone (GRPC disconnects)
   *  https://github.com/grpc/grpc/issues/8117#issuecomment-362198092
   */
  private onStreamingCallEnd (
    callback: () => void,
  ): void {
    log.verbose('EventStreamManager', 'onStreamingCallEnd(callback)')

    if (!this.eventStream) {
      throw new Error('no this.eventStream found')
    }

    this.eventStream.on('cancelled', () => {
      log.verbose('EventStreamManager', 'this.onStreamingCallEnd() this.eventStream.on(cancelled) fired with arguments: %s',
        JSON.stringify(arguments)
      )

      if (this.eventStream) {
        callback()
        this.eventStream = undefined
      } else {
        log.warn('EventStreamManager', 'this.onStreamingCallEnd() this.eventStream.on(cancelled) eventStream is undefined')
      }
    })

    this.eventStream.on('error', err => {
      log.verbose('EventStreamManager', 'this.onStreamingCallEnd() this.eventStream.on(error) fired: %s', err)
      if (this.eventStream) {
        callback()
        this.eventStream = undefined
      } else {
        log.warn('EventStreamManager', 'this.onStreamingCallEnd() this.eventStream.on(error) eventStream is undefined')
      }
    })

    this.eventStream.on('finish', () => {
      log.verbose('EventStreamManager', 'this.onStreamingCallEnd() this.eventStream.on(finish) fired')
      if (this.eventStream) {
        callback()
        this.eventStream = undefined
      } else {
        log.warn('EventStreamManager', 'this.onStreamingCallEnd() this.eventStream.on(finish) eventStream is undefined')
      }
    })

    this.eventStream.on('end', () => {
      log.verbose('EventStreamManager', 'this.onStreamingCallEnd() this.eventStream.on(end) fired')
      if (this.eventStream) {
        callback()
        this.eventStream = undefined
      } else {
        log.warn('EventStreamManager', 'this.onStreamingCallEnd() this.eventStream.on(end) eventStream is undefined')
      }
    })

    this.eventStream.on('close', () => {
      log.verbose('EventStreamManager', 'this.onStreamingCallEnd() this.eventStream.on(close) fired')
      if (this.eventStream) {
        callback()
        this.eventStream = undefined
      } else {
        log.warn('EventStreamManager', 'this.onStreamingCallEnd() this.eventStream.on(close) eventStream is undefined')
      }
    })
  }

}
