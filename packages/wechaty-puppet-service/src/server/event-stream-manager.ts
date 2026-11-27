/**
 * `EventStreamManager`: forwards the served puppet's events to the one
 * client event stream a server accepts at a time. On connect it sends a
 * heartbeat (clients wait for it) and, when the puppet is already logged in,
 * a `login` event; it removes its puppet listeners when the stream ends.
 */
import {
  EventType,
  type EventResponse,
} from 'wechaty-grpc'

import * as PUPPET from 'wechaty-puppet'

import { log } from '../config.ts'
import { EventTypeRev } from '../event-type-rev.ts'

export interface EventStreamSink {
  write (response: EventResponse): void
  end (): void
  onClose? (handler: () => void): void
}

class EventStreamManager {

  protected eventStream?: EventStreamSink
  private removeListeners?: () => void

  puppet: PUPPET.Puppet

  constructor (
    puppet: PUPPET.Puppet,
  ) {
    this.puppet = puppet
    log.verbose('EventStreamManager', 'constructor(%s)', puppet)
  }

  public busy (): boolean {
    return !!this.eventStream
  }

  public start (stream: EventStreamSink): void {
    log.verbose('EventStreamManager', 'start(stream)')

    if (this.eventStream) {
      throw new Error('can not set twice')
    }
    this.eventStream = stream

    this.removeListeners = this.connectPuppetEventToStreamingCall()
    if (stream.onClose) {
      stream.onClose(() => {
        this.stop()
      })
    }

    /**
     * Emit a heartbeat at the beginning of the connect to indicate that the connection succeeded.
     */
    const connectSuccessHeartbeatPayload = {
      data: 'Wechaty Puppet gRPC stream connect successfully',
    } as PUPPET.payloads.EventHeartbeat
    this.grpcEmit(
      EventType.HEARTBEAT,
      connectSuccessHeartbeatPayload,
    )

    /**
     * Emit login event if the puppet is currently logged in.
     */
    if (this.puppet.isLoggedIn) {
      log.verbose('EventStreamManager', 'start() puppet is logged in, emit a login event for downstream')
      const payload = {
        contactId: this.puppet.currentUserId,
      } as PUPPET.payloads.EventLogin
      this.grpcEmit(EventType.LOGIN, payload)
    } else {
      log.verbose('EventStreamManager', 'start() puppet is logged out, emit a logout event for downstream reconciliation')
      const payload = {
        contactId: '',
        data: 'reconcile',
      } as PUPPET.payloads.EventLogout
      this.grpcEmit(EventType.LOGOUT, payload)
    }

    if (this.puppet.readyIndicator.value()) {
      log.verbose('EventStreamManager', 'start() puppet is ready, emit a ready event for downstream after 100ms delay')
      const payload = {
        data: 'ready',
      } as PUPPET.payloads.EventReady
      setTimeout(() => {
        this.grpcEmit(EventType.READY, payload)
      }, 100)
    }
  }

  public stop (expectedStream?: EventStreamSink): void {
    log.verbose('EventStreamManager', 'stop()')

    if (expectedStream && this.eventStream && this.eventStream !== expectedStream) {
      log.verbose('EventStreamManager', 'stop() ignored because active stream is not the expected stream')
      return
    }

    if (this.removeListeners) {
      this.removeListeners()
      this.removeListeners = undefined
    }

    if (this.eventStream) {
      const stream = this.eventStream
      this.eventStream = undefined
      stream.end()
    }
  }

  public grpcEmit (
    type : EventType,
    obj  : object,
  ): void {
    log.verbose('EventStreamManager', 'grpcEmit(%s[%s], %s)',
      EventTypeRev[type],
      type,
      JSON.stringify(obj),
    )

    const response = {
      type,
      payload: JSON.stringify(obj),
    } as EventResponse

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
    const offAll = () => {
      log.verbose('EventStreamManager',
        'connectPuppetEventToStreamingCall() offAll() %s callbacks',
        offCallbackList.length,
      )
      offCallbackList.forEach(off => off())
    }

    const eventNameList: PUPPET.types.PuppetEventName[] = Object.keys(PUPPET.types.PUPPET_EVENT_DICT) as PUPPET.types.PuppetEventName[]
    for (const eventName of eventNameList) {
      log.verbose('EventStreamManager',
        'connectPuppetEventToStreamingCall() this.puppet.on(%s) registering...',
        eventName,
      )

      switch (eventName) {
        case 'dong': {
          const listener = (payload: PUPPET.payloads.EventDong) => this.grpcEmit(EventType.DONG, payload)
          this.puppet.on('dong', listener)
          offCallbackList.push(() => this.puppet.off('dong', listener))
          break
        }
        case 'dirty': {
          const listener = (payload: PUPPET.payloads.EventDirty) => this.grpcEmit(EventType.DIRTY, payload)
          this.puppet.on('dirty', listener)
          offCallbackList.push(() => this.puppet.off('dirty', listener))
          break
        }
        case 'error': {
          const listener = (payload: PUPPET.payloads.EventError) => this.grpcEmit(EventType.ERROR, payload)
          this.puppet.on('error', listener)
          offCallbackList.push(() => this.puppet.off('error', listener))
          break
        }
        case 'heartbeat': {
          const listener = (payload: PUPPET.payloads.EventHeartbeat) => this.grpcEmit(EventType.HEARTBEAT, payload)
          this.puppet.on('heartbeat', listener)
          offCallbackList.push(() => this.puppet.off('heartbeat', listener))
          break
        }
        case 'friendship': {
          const listener = (payload: PUPPET.payloads.EventFriendship) => this.grpcEmit(EventType.FRIENDSHIP, payload)
          this.puppet.on('friendship', listener)
          offCallbackList.push(() => this.puppet.off('friendship', listener))
          break
        }
        case 'login': {
          const listener = (payload: PUPPET.payloads.EventLogin) => this.grpcEmit(EventType.LOGIN, payload)
          this.puppet.on('login', listener)
          offCallbackList.push(() => this.puppet.off('login', listener))
          break
        }
        case 'logout': {
          const listener = (payload: PUPPET.payloads.EventLogout) => this.grpcEmit(EventType.LOGOUT, payload)
          this.puppet.on('logout', listener)
          offCallbackList.push(() => this.puppet.off('logout', listener))
          break
        }
        case 'message': {
          const listener = (payload: PUPPET.payloads.EventMessage) => this.grpcEmit(EventType.MESSAGE, payload)
          this.puppet.on('message', listener)
          offCallbackList.push(() => this.puppet.off('message', listener))
          break
        }
        case 'post': {
          const listener = (payload: PUPPET.payloads.EventPost) => this.grpcEmit(EventType.POST, payload)
          this.puppet.on('post', listener)
          offCallbackList.push(() => this.puppet.off('post', listener))
          break
        }
        case 'ready': {
          const listener = (payload: PUPPET.payloads.EventReady) => this.grpcEmit(EventType.READY, payload)
          this.puppet.on('ready', listener)
          offCallbackList.push(() => this.puppet.off('ready', listener))
          break
        }
        case 'room-invite': {
          const listener = (payload: PUPPET.payloads.EventRoomInvite) => this.grpcEmit(EventType.ROOM_INVITE, payload)
          this.puppet.on('room-invite', listener)
          offCallbackList.push(() => this.puppet.off('room-invite', listener))
          break
        }
        case 'room-join': {
          const listener = (payload: PUPPET.payloads.EventRoomJoin) => this.grpcEmit(EventType.ROOM_JOIN, payload)
          this.puppet.on('room-join', listener)
          offCallbackList.push(() => this.puppet.off('room-join', listener))
          break
        }
        case 'room-leave': {
          const listener = (payload: PUPPET.payloads.EventRoomLeave) => this.grpcEmit(EventType.ROOM_LEAVE, payload)
          this.puppet.on('room-leave', listener)
          offCallbackList.push(() => this.puppet.off('room-leave', listener))
          break
        }
        case 'room-topic': {
          const listener = (payload: PUPPET.payloads.EventRoomTopic) => this.grpcEmit(EventType.ROOM_TOPIC, payload)
          this.puppet.on('room-topic', listener)
          offCallbackList.push(() => this.puppet.off('room-topic', listener))
          break
        }
        case 'scan': {
          const listener = (payload: PUPPET.payloads.EventScan) => this.grpcEmit(EventType.SCAN, payload)
          this.puppet.on('scan', listener)
          offCallbackList.push(() => this.puppet.off('scan', listener))
          break
        }
        case 'reset':
          break
        default:
          break
      }
    }

    return offAll
  }

}

export { EventStreamManager }
