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
import {
  puppet as grpcPuppet,
  grpc,
}                                   from 'wechaty-grpc'

import * as PUPPET from 'wechaty-puppet'

import { log } from '../config.js'
import {
  EventTypeRev,
}                     from '../event-type-rev.js'

class EventStreamManager {

  protected eventStream: undefined | grpc.ServerWritableStream<grpcPuppet.EventRequest, grpcPuppet.EventResponse>

  private puppetListening = false

  constructor (
    public puppet: PUPPET.impls.PuppetInterface,
  ) {
    log.verbose('EventStreamManager', 'constructor(%s)', puppet)
  }

  public busy (): boolean {
    return !!this.eventStream
  }

  public start (
    stream: grpc.ServerWritableStream<grpcPuppet.EventRequest, grpcPuppet.EventResponse>,
  ): void {
    log.verbose('EventStreamManager', 'start(stream)')

    if (this.eventStream) {
      throw new Error('can not set twice')
    }
    this.eventStream = stream

    const removeAllListeners = this.connectPuppetEventToStreamingCall()
    this.onStreamingCallEnd(removeAllListeners)

    /**
     * Huan(202108):
     *  We emit a hearbeat at the beginning of the connect
     *    to identicate that the connection is successeed.
     *
     *  Our client (wechaty-puppet-service client) will wait for the heartbeat
     *    when it connect to the server.
     *
     *  If the server does not send the heartbeat,
     *    then the client will wait for a 5 seconds timeout
     *    for compatible the community gRPC puppet service providers like paimon.
     */
    const connectSuccessHeartbeatPayload = {
      data: 'Wechaty Puppet gRPC stream connect successfully',
    } as PUPPET.payloads.EventHeartbeat
    this.grpcEmit(
      grpcPuppet.EventType.EVENT_TYPE_HEARTBEAT,
      connectSuccessHeartbeatPayload,
    )

    /**
      * We emit the login event if current the puppet is logged in.
      */
    if (this.puppet.isLoggedIn) {
      log.verbose('EventStreamManager', 'start() puppet is logged in, emit a login event for downstream')

      const payload = {
        contactId: this.puppet.currentUserId,
      } as PUPPET.payloads.EventLogin

      this.grpcEmit(grpcPuppet.EventType.EVENT_TYPE_LOGIN, payload)
    }

    if (this.puppet.readyIndicator.value()) {
      log.verbose('EventStreamManager', 'start() puppet is ready, emit a ready event for downstream after 100ms delay')

      const payload = {
        data: 'ready',
      } as PUPPET.payloads.EventReady

      // no need to make this function async since it won't effect the start process of eventStreamManager
      setTimeout(() => {
        this.grpcEmit(grpcPuppet.EventType.EVENT_TYPE_READY, payload)
      }, 100)
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
    type : grpcPuppet.EventTypeMap[keyof grpcPuppet.EventTypeMap],  // https://stackoverflow.com/a/49286056/1123955
    obj  : object,
  ): void {
    log.verbose('EventStreamManager', 'grpcEmit(%s[%s], %s)',
      EventTypeRev[type],
      type,
      JSON.stringify(obj),
    )

    const response = new grpcPuppet.EventResponse()

    response.setType(type)
    response.setPayload(
      JSON.stringify(obj),
    )

    if (this.eventStream) {
      this.eventStream.write(response)
    } else {
      /**
        * Huan(202108): TODO: add a queue for store a maximum number of responses before the stream get connected
        */
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
      this.puppetListening = false
    }

    const eventNameList: PUPPET.types.PuppetEventName[] = Object.keys(PUPPET.types.PUPPET_EVENT_DICT) as PUPPET.types.PuppetEventName[]
    for (const eventName of eventNameList) {
      log.verbose('EventStreamManager',
        'connectPuppetEventToStreamingCall() this.puppet.on(%s) (listenerCount:%s) registering...',
        eventName,
        this.puppet.listenerCount(eventName),
      )

      switch (eventName) {
        case 'dong': {
          const listener = (payload: PUPPET.payloads.EventDong) => this.grpcEmit(grpcPuppet.EventType.EVENT_TYPE_DONG, payload)
          this.puppet.on('dong', listener)
          const off = () => this.puppet.off('dong', listener)
          offCallbackList.push(off)
          break
        }
        case 'dirty': {
          const listener = (payload: PUPPET.payloads.EventDirty) => this.grpcEmit(grpcPuppet.EventType.EVENT_TYPE_DIRTY, payload)
          this.puppet.on('dirty', listener)
          const off = () => this.puppet.off('dirty', listener)
          offCallbackList.push(off)
          break
        }
        case 'error': {
          const listener = (payload: PUPPET.payloads.EventError) => this.grpcEmit(grpcPuppet.EventType.EVENT_TYPE_ERROR, payload)
          this.puppet.on('error', listener)
          const off = () => this.puppet.off('error', listener)
          offCallbackList.push(off)
          break
        }
        case 'heartbeat': {
          const listener = (payload: PUPPET.payloads.EventHeartbeat) => this.grpcEmit(grpcPuppet.EventType.EVENT_TYPE_HEARTBEAT, payload)
          this.puppet.on('heartbeat', listener)
          const off = () => this.puppet.off('heartbeat', listener)
          offCallbackList.push(off)
          break
        }
        case 'friendship': {
          const listener = (payload: PUPPET.payloads.EventFriendship) => this.grpcEmit(grpcPuppet.EventType.EVENT_TYPE_FRIENDSHIP, payload)
          this.puppet.on('friendship', listener)
          const off = () => this.puppet.off('friendship', listener)
          offCallbackList.push(off)
          break
        }
        case 'login': {
          const listener = (payload: PUPPET.payloads.EventLogin) => this.grpcEmit(grpcPuppet.EventType.EVENT_TYPE_LOGIN, payload)
          this.puppet.on('login', listener)
          const off = () => this.puppet.off('login', listener)
          offCallbackList.push(off)
          break
        }
        case 'logout': {
          const listener = (payload: PUPPET.payloads.EventLogout) => this.grpcEmit(grpcPuppet.EventType.EVENT_TYPE_LOGOUT, payload)
          this.puppet.on('logout', listener)
          const off = () => this.puppet.off('logout', listener)
          offCallbackList.push(off)
          break
        }
        case 'message': {
          const listener = (payload: PUPPET.payloads.EventMessage) => this.grpcEmit(grpcPuppet.EventType.EVENT_TYPE_MESSAGE, payload)
          this.puppet.on('message', listener)
          const off = () => this.puppet.off('message', listener)
          offCallbackList.push(off)
          break
        }
        case 'post': {
          const listener = (payload: PUPPET.payloads.EventPost) => this.grpcEmit(grpcPuppet.EventType.EVENT_TYPE_POST, payload)
          this.puppet.on('post', listener)
          const off = () => this.puppet.off('post', listener)
          offCallbackList.push(off)
          break
        }
        case 'ready': {
          const listener = (payload: PUPPET.payloads.EventReady) => this.grpcEmit(grpcPuppet.EventType.EVENT_TYPE_READY, payload)
          this.puppet.on('ready', listener)
          const off = () => this.puppet.off('ready', listener)
          offCallbackList.push(off)
          break
        }
        case 'room-invite': {
          const listener = (payload: PUPPET.payloads.EventRoomInvite) => this.grpcEmit(grpcPuppet.EventType.EVENT_TYPE_ROOM_INVITE, payload)
          this.puppet.on('room-invite', listener)
          const off = () => this.puppet.off('room-invite', listener)
          offCallbackList.push(off)
          break
        }
        case 'room-join': {
          const listener = (payload: PUPPET.payloads.EventRoomJoin) => this.grpcEmit(grpcPuppet.EventType.EVENT_TYPE_ROOM_JOIN, payload)
          this.puppet.on('room-join', listener)
          const off = () => this.puppet.off('room-join', listener)
          offCallbackList.push(off)
          break
        }
        case 'room-leave': {
          const listener = (payload: PUPPET.payloads.EventRoomLeave) => this.grpcEmit(grpcPuppet.EventType.EVENT_TYPE_ROOM_LEAVE, payload)
          this.puppet.on('room-leave', listener)
          const off = () => this.puppet.off('room-leave', listener)
          offCallbackList.push(off)
          break
        }
        case 'room-topic': {
          const listener = (payload: PUPPET.payloads.EventRoomTopic) => this.grpcEmit(grpcPuppet.EventType.EVENT_TYPE_ROOM_TOPIC, payload)
          this.puppet.on('room-topic', listener)
          const off = () => this.puppet.off('room-topic', listener)
          offCallbackList.push(off)
          break
        }
        case 'scan': {
          const listener = (payload: PUPPET.payloads.EventScan) => this.grpcEmit(grpcPuppet.EventType.EVENT_TYPE_SCAN, payload)
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

    this.puppetListening = true
    return offAll
  }

  /**
   * Detect if the streaming call was gone (GRPC disconnects)
   *  https://github.com/grpc/grpc/issues/8117#issuecomment-362198092
   */
  private onStreamingCallEnd (
    removePuppetListeners: () => void,
  ): void {
    log.verbose('EventStreamManager', 'onStreamingCallEnd(callback)')

    if (!this.eventStream) {
      throw new Error('no this.eventStream found')
    }

    /**
     * Huan(202110): useful log messages
     *
     * ServiceCtl<PuppetServiceMixin> stop() super.stop() ... done
     * StateSwitch <PuppetServiceMixin> inactive(true) <- (pending)
     * EventStreamManager this.onStreamingCallEnd() this.eventStream.on(finish) fired
     * EventStreamManager connectPuppetEventToStreamingCall() offAll() 14 callbacks
     * EventStreamManager this.onStreamingCallEnd() this.eventStream.on(finish) eventStream is undefined
     * EventStreamManager this.onStreamingCallEnd() this.eventStream.on(close) fired
     * EventStreamManager this.onStreamingCallEnd() this.eventStream.on(close) eventStream is undefined
     * EventStreamManager this.onStreamingCallEnd() this.eventStream.on(cancelled) fired with arguments: {}
     * EventStreamManager this.onStreamingCallEnd() this.eventStream.on(cancelled) eventStream is undefined
     * GrpcClient stop() stop client ... done
     */
    this.eventStream.on('cancelled', () => {
      log.verbose('EventStreamManager', 'this.onStreamingCallEnd() this.eventStream.on(cancelled) fired with arguments: %s',
        JSON.stringify(arguments),
      )

      if (this.puppetListening) {
        removePuppetListeners()
      }
      if (this.eventStream) {
        this.eventStream = undefined
      } else {
        log.warn('EventStreamManager', 'this.onStreamingCallEnd() this.eventStream.on(cancelled) eventStream is undefined')
      }
    })

    this.eventStream.on('error', err => {
      log.verbose('EventStreamManager', 'this.onStreamingCallEnd() this.eventStream.on(error) fired: %s', err)
      if (this.puppetListening) {
        removePuppetListeners()
      }
      if (this.eventStream) {
        this.eventStream = undefined
      } else {
        log.warn('EventStreamManager', 'this.onStreamingCallEnd() this.eventStream.on(error) eventStream is undefined')
      }
    })

    this.eventStream.on('finish', () => {
      log.verbose('EventStreamManager', 'this.onStreamingCallEnd() this.eventStream.on(finish) fired')
      if (this.puppetListening) {
        removePuppetListeners()
      }
      if (this.eventStream) {
        this.eventStream = undefined
      } else {
        log.warn('EventStreamManager', 'this.onStreamingCallEnd() this.eventStream.on(finish) eventStream is undefined')
      }
    })

    this.eventStream.on('end', () => {
      log.verbose('EventStreamManager', 'this.onStreamingCallEnd() this.eventStream.on(end) fired')
      if (this.puppetListening) {
        removePuppetListeners()
      }
      if (this.eventStream) {
        this.eventStream = undefined
      } else {
        log.warn('EventStreamManager', 'this.onStreamingCallEnd() this.eventStream.on(end) eventStream is undefined')
      }
    })

    this.eventStream.on('close', () => {
      log.verbose('EventStreamManager', 'this.onStreamingCallEnd() this.eventStream.on(close) fired')
      if (this.puppetListening) {
        removePuppetListeners()
      }
      if (this.eventStream) {
        this.eventStream = undefined
      } else {
        log.warn('EventStreamManager', 'this.onStreamingCallEnd() this.eventStream.on(close) eventStream is undefined')
      }
    })
  }

}

export { EventStreamManager }
