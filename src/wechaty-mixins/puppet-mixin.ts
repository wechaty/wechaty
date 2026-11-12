/**
 * Puppet child resource and provider-event bridge adapter for `Wechaty`.
 *
 * Owns Puppet resolution, memory multiplexing, generation-scoped event
 * registration/teardown, bounded Puppet startup/shutdown, and readiness signal
 * forwarding without `state-switch`:
 *   - Enforces a hard startup deadline (`LifecycleTimeoutError`) instead of
 *     continuing after a hung `puppet.start()`
 *   - Propagates `puppet.stop()` errors/timeouts instead of swallowing them
 *   - Detaches all registered Puppet listeners when a generation retires so
 *     restarts never accumulate duplicate listeners
 *   - Reports unexpected child `'stop'` and `'reset'` events upward to the
 *     parent lifecycle controller
 */
import * as PUPPET      from 'wechaty-puppet'
import { log }          from 'wechaty-puppet'
import { GError }       from 'gerror'

import { config }               from '../config.ts'
import {
  type LifecycleCallOptions,
  LifecycleController,
  LifecycleTimeoutError,
  ReadinessGate,
  type ResourceScope,
}                               from '../lifecycle/mod.ts'
import { timestampToDate }      from '../pure-functions/timestamp-to-date.ts'
import type {
  ContactImpl,
  ContactInterface,
  RoomImpl,
}                               from '../user-modules/mod.ts'

import type {
  WechatifyUserModuleMixin,
}                               from './wechatify-user-module-mixin.ts'

import type { GErrorMixin } from './gerror-mixin.ts'
import type { IoMixin }     from './io-mixin.ts'

const PUPPET_MEMORY_NAME = 'puppet'
const DEFAULT_PUPPET_TIMEOUT_MS = 15 * 1000

/**
 * Asserts switch exhaustiveness for puppet events at compile time and keeps
 * startup resilient at runtime if a newer puppet introduces unknown events.
 */
const assertPuppetEventNameExhaustive = (eventName: never): void => {
  log.warn('WechatyPuppetMixin', '__setupPuppetEvents() unsupported puppet event: %s', eventName)
}

function runPuppetPhaseWithTimeout (
  operation: () => Promise<void>,
  phase: 'start' | 'stop',
  timeoutMs: number,
): { promise: Promise<void>; isSettled: () => boolean; rawPromise: Promise<void> } {
  let settled = false
  const rawPromise = Promise.resolve()
    .then(operation)
    .then(
      () => { settled = true },
      (err: unknown) => {
        settled = true
        throw err
      },
    )

  let timer: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new LifecycleTimeoutError(phase, timeoutMs))
    }, timeoutMs)
  })
  rawPromise.catch(() => {})

  const promise = Promise.race([ rawPromise, deadline ]).finally(() => {
    if (timer !== undefined) {
      clearTimeout(timer)
    }
  })

  return {
    isSettled: () => settled,
    promise,
    rawPromise,
  }
}

export interface PuppetLifecycleBridgeCallbacks {
  readonly readiness: ReadinessGate
  readonly getActiveGeneration: () => number
  readonly onPuppetReset: () => void
}

/**
 * Huan(202111): the `wechaty-redux` plugin need to be installed before
 *  the puppet started
 *
 * Plugins that subscribe to the `puppet` event must register their listeners
 *  before the first `init()` emits it. `pluginMixin` is composed outside
 *  `puppetMixin` and has no lifecycle hooks, so the mixin order does not
 *  affect this.
 */
const puppetMixin = <MixinBase extends WechatifyUserModuleMixin & GErrorMixin & IoMixin> (mixinBase: MixinBase) => {
  log.verbose('WechatyPuppetMixin', 'puppetMixin(%s)', mixinBase.name)

  abstract class PuppetMixin extends mixinBase {

    __puppet?: PUPPET.impls.PuppetInterface

    get puppet (): PUPPET.impls.PuppetInterface {
      if (!this.__puppet) {
        throw new Error('NOPUPPET')
      }
      return this.__puppet
    }

    __readiness: ReadinessGate

    __puppetMixinInited = false
    __puppetInitPromise?: Promise<void>
    __detachPuppetEvents?: () => void
    __bridgeCallbacks?: PuppetLifecycleBridgeCallbacks

    constructor (...args: any[]) {
      log.verbose('WechatyPuppetMixin', 'construct()')
      super(...args)

      // Fallback readiness gate for standalone mixin tests that do not construct WechatyBase.
      const fallbackController = new LifecycleController({
        hooks: { start: () => {} },
        name: 'WechatyReadyFallback',
      })
      this.__readiness = new ReadinessGate(fallbackController)
    }

    __bindPuppetLifecycleBridge (callbacks: PuppetLifecycleBridgeCallbacks): void {
      this.__bridgeCallbacks = callbacks
      this.__readiness = callbacks.readiness
    }

    __notifyPuppetReady (): void {
      const generation = this.__bridgeCallbacks
        ? this.__bridgeCallbacks.getActiveGeneration()
        : 1
      this.__readiness.markReady(generation)
    }

    __notifyPuppetUnready (): void {
      const generation = this.__bridgeCallbacks?.getActiveGeneration()
      this.__readiness.markUnready(generation)
    }

    __notifyPuppetReset (): void {
      this.__notifyPuppetUnready()
      this.__bridgeCallbacks?.onPuppetReset()
    }

    __ensurePuppetEventsAttached (puppet: PUPPET.impls.PuppetInterface): void {
      if (this.__detachPuppetEvents) {
        return
      }
      this.__detachPuppetEvents = this.__setupPuppetEvents(puppet)
    }

    __releasePuppetEvents (): void {
      const detach = this.__detachPuppetEvents
      this.__detachPuppetEvents = undefined
      detach?.()
    }

    async __acquirePuppet (
      scope: ResourceScope,
      generation: number,
      failRun: (error: unknown) => void,
    ): Promise<void> {
      this.__readiness.markUnready(generation)
      const puppet = this.puppet
      this.__ensurePuppetEventsAttached(puppet)
      scope.onDispose(
        () => this.__releasePuppetEvents(),
        () => this.__releasePuppetEvents(),
      )

      let retiringByParent = false
      if (typeof (puppet as any).on === 'function' && typeof (puppet as any).off === 'function') {
        scope.listen(puppet as any, 'stop', () => {
          if (!retiringByParent && !scope.isClosed) {
            failRun(new Error('Puppet stopped unexpectedly'))
          }
        })
      }

      await scope.acquire({
        create: async () => {
          const timeoutMs = this.__options.puppetStartTimeoutMs ?? DEFAULT_PUPPET_TIMEOUT_MS
          log.verbose('WechatyPuppetMixin', '__acquirePuppet() starting puppet ...')
          const phaseRun = runPuppetPhaseWithTimeout(
            () => puppet.start(),
            'start',
            timeoutMs,
          )
          try {
            await phaseRun.promise
            log.verbose('WechatyPuppetMixin', '__acquirePuppet() starting puppet ... done')
          } catch (error) {
            retiringByParent = true
            try {
              await this.__stopPuppetRaw(puppet)
            } catch {
              // Preserve primary startup error; unsettled start debt is tracked below.
            }
            if (!phaseRun.isSettled()) {
              scope.trackUnsettled(phaseRun.rawPromise)
            }
            throw error
          }
        },
        dispose: async () => {
          retiringByParent = true
          await this.__stopPuppetRaw(puppet)
        },
        interrupt: () => {
          retiringByParent = true
        },
        name: 'puppet',
      })
    }

    async __stopPuppetRaw (puppet: PUPPET.impls.PuppetInterface): Promise<void> {
      const timeoutMs = this.__options.puppetStopTimeoutMs ?? DEFAULT_PUPPET_TIMEOUT_MS
      log.verbose('WechatyPuppetMixin', 'stop() stopping puppet ...')
      const phaseRun = runPuppetPhaseWithTimeout(
        () => puppet.stop(),
        'stop',
        timeoutMs,
      )
      await phaseRun.promise
      log.verbose('WechatyPuppetMixin', 'stop() stopping puppet ... done')
    }

    override async start (): Promise<void> {
      log.verbose('WechatyPuppetMixin', 'start()')
      await super.start()
      this.__ensurePuppetEventsAttached(this.puppet)
      const timeoutMs = this.__options.puppetStartTimeoutMs ?? DEFAULT_PUPPET_TIMEOUT_MS
      const phaseRun = runPuppetPhaseWithTimeout(
        () => this.puppet.start(),
        'start',
        timeoutMs,
      )
      await phaseRun.promise
    }

    override async stop (): Promise<void> {
      log.verbose('WechatyPuppetMixin', 'stop()')
      try {
        if (this.__puppet) {
          this.__releasePuppetEvents()
          await this.__stopPuppetRaw(this.__puppet)
        }
      } finally {
        await super.stop()
      }
    }

    async ready (options?: LifecycleCallOptions): Promise<void> {
      log.verbose('WechatyPuppetMixin', 'ready()')
      await this.__readiness.whenReady(options)
      log.silly('WechatyPuppetMixin', 'ready() resolved')
    }

    override async init (): Promise<void> {
      log.verbose('WechatyPuppetMixin', 'init()')
      if (this.__puppetMixinInited) {
        await super.init()
        log.verbose('WechatyPuppetMixin', 'init() skipped because this puppet has already been inited before.')
        return
      }
      if (this.__puppetInitPromise) {
        return this.__puppetInitPromise
      }

      this.__puppetInitPromise = (async () => {
        await super.init()
        if (this.__puppetMixinInited) {
          return
        }
        this.__puppetMixinInited = true

        log.verbose('WechatyPuppetMixin', 'init() instanciating puppet instance ...')
        const puppetInstance = await PUPPET.helpers.resolvePuppet({
          puppet: this.__options.puppet || config.systemPuppetName(),
          puppetOptions: 'puppetOptions' in this.__options
            ? this.__options.puppetOptions
            : undefined,
        })
        log.verbose('WechatyPuppetMixin', 'init() instanciating puppet instance ... done')

        log.verbose('WechatyPuppetMixin', 'init() setting memory ...')
        const puppetMemory = this.memory.multiplex(PUPPET_MEMORY_NAME)
        puppetInstance.setMemory(puppetMemory)
        log.verbose('WechatyPuppetMixin', 'init() setting memory ... done')

        log.verbose('WechatyPuppetMixin', 'init() setting up events ...')
        this.__ensurePuppetEventsAttached(puppetInstance)
        log.verbose('WechatyPuppetMixin', 'init() setting up events ... done')

        /**
         * Private Event
         *   - Huan(202005): emit puppet when set
         *   - Huan(202110): @see https://github.com/wechaty/redux/blob/16af0ae01f72e37f0ee286b49fa5ccf69850323d/src/wechaty-redux.ts#L82-L98
         */
        log.verbose('WechatyPuppetMixin', 'init() emitting "puppet" event ...')
        ;(this.emit as any)('puppet', puppetInstance)
        log.verbose('WechatyPuppetMixin', 'init() emitting "puppet" event ... done')

        this.__puppet = puppetInstance
      })().finally(() => {
        this.__puppetInitPromise = undefined
      })

      return this.__puppetInitPromise
    }

    __setupPuppetEvents (puppet: PUPPET.impls.PuppetInterface): () => void {
      log.verbose('WechatyPuppetMixin', '__setupPuppetEvents(%s)', puppet)

      const registrations: Array<{
        eventName: PUPPET.types.PuppetEventName
        listener: (...args: any[]) => any
      }> = []

      const register = <E extends PUPPET.types.PuppetEventName> (
        eventName: E,
        listener: (...args: any[]) => any,
      ) => {
        puppet.on(eventName, listener as any)
        registrations.push({ eventName, listener })
      }

      const eventNameList: PUPPET.types.PuppetEventName[] = Object.keys(PUPPET.types.PUPPET_EVENT_DICT) as PUPPET.types.PuppetEventName[]
      for (const eventName of eventNameList) {
        log.verbose('PuppetMixin',
          '__setupPuppetEvents() puppet.on(%s) (listenerCount:%s) registering...',
          eventName,
          puppet.listenerCount(eventName),
        )

        switch (eventName) {
          case 'dong':
            register('dong', payload => {
              this.emit('dong', payload.data)
            })
            break

          case 'error':
            register('error', payload => {
              this.emit('error', GError.from(payload.gerror || payload.data || payload))
            })
            break

          case 'heartbeat':
            register('heartbeat', payload => {
              this.emit('heartbeat', payload.data)
            })
            break

          case 'friendship':
            register('friendship', async payload => {
              const friendship = this.Friendship.load(payload.friendshipId)
              try {
                await friendship.ready()
                this.emit('friendship', friendship)
                friendship.contact().emit('friendship', friendship)
              } catch (e) {
                this.emit('error', GError.from(e))
              }
            })
            break

          case 'login':
            register('login', async payload => {
              try {
                const contact = await this.ContactSelf.find({ id: payload.contactId })
                if (!contact) {
                  throw new Error('no contact found for id: ' + payload.contactId)
                }
                this.emit('login', contact)
              } catch (e) {
                this.emit('error', GError.from(e))
              }
            })
            break

          case 'logout':
            register('logout', async payload => {
              try {
                this.__notifyPuppetUnready()
                const contact = await this.ContactSelf.find({ id: payload.contactId })
                if (contact) {
                  this.emit('logout', contact, payload.data)
                } else {
                  log.verbose('PuppetMixin',
                    '__setupPuppetEvents() logout event contact self not found for id: %s',
                    payload.contactId,
                  )
                }
              } catch (e) {
                this.emit('error', GError.from(e))
              }
            })
            break

          case 'message':
            register('message', async payload => {
              try {
                const msg = await this.Message.find({ id: payload.messageId })
                if (!msg) {
                  this.emit('error', GError.from('message not found for id: ' + payload.messageId))
                  return
                }

                this.emit('message', msg)

                const room     = msg.room()
                const listener = msg.listener()

                if (room) {
                  room.emit('message', msg)
                } else if (listener) {
                  listener.emit('message', msg)
                } else {
                  this.emit('error', GError.from('message without room and listener'))
                }
              } catch (e) {
                this.emit('error', GError.from(e))
              }
            })
            break

          case 'post':
            register('post', async payload => {
              try {
                const post = await this.Post.find({ id: payload.postId })
                if (!post) {
                  this.emit('error', GError.from('post not found for id: ' + payload.postId))
                  return
                }

                this.emit('post', post)
              } catch (e) {
                this.emit('error', GError.from(e))
              }
            })
            break

          case 'ready':
            register('ready', () => {
              log.silly('WechatyPuppetMixin', '__setupPuppetEvents() puppet.on(ready)')

              this.__notifyPuppetReady()
              this.emit('ready')
            })
            break

          case 'room-invite':
            register('room-invite', async payload => {
              const roomInvitation = this.RoomInvitation.load(payload.roomInvitationId)
              this.emit('room-invite', roomInvitation)
            })
            break

          case 'room-join':
            register('room-join', async payload => {
              try {
                const room = await this.Room.find({ id: payload.roomId })
                if (!room) {
                  throw new Error('no room found for id: ' + payload.roomId)
                }
                await room.sync()

                const validInviteeIdList = payload.inviteeIdList.filter((m: string) => m)
                const inviteeListAll = await Promise.all(
                  validInviteeIdList.map((id: string) => this.Contact.find({ id })),
                )
                const inviteeList = inviteeListAll.filter(c => !!c) as ContactInterface[]

                const inviter = await this.Contact.find({ id: payload.inviterId })
                if (!inviter) {
                  throw new Error('no inviter found for id: ' + payload.inviterId)
                }

                const date = timestampToDate(payload.timestamp)

                this.emit('room-join', room, inviteeList, inviter, date)
                room.emit('join', inviteeList, inviter, date)
              } catch (e) {
                this.emit('error', GError.from(e))
              }
            })
            break

          case 'room-leave':
            register('room-leave', async payload => {
              try {
                const room = await this.Room.find({ id: payload.roomId })
                if (!room) {
                  throw new Error('no room found for id: ' + payload.roomId)
                }

                await room.sync()

                const leaverListAll = await Promise.all(
                  payload.removeeIdList.map((id: string) => this.Contact.find({ id })),
                )
                const leaverList = leaverListAll.filter(c => !!c) as ContactInterface[]

                const remover = await this.Contact.find({ id: payload.removerId })
                if (!remover) {
                  throw new Error('no remover found for id: ' + payload.removerId)
                }
                const date = timestampToDate(payload.timestamp)

                this.emit('room-leave', room, leaverList, remover, date)
                room.emit('leave', leaverList, remover, date)

                // issue #254
                if (payload.removeeIdList.includes(puppet.currentUserId)) {
                  await puppet.roomPayloadDirty(payload.roomId)
                  await puppet.roomMemberPayloadDirty(payload.roomId)
                }
              } catch (e) {
                this.emit('error', GError.from(e))
              }
            })
            break

          case 'room-topic':
            register('room-topic', async payload => {
              try {
                const room = await this.Room.find({ id: payload.roomId })
                if (!room) {
                  throw new Error('no room found for id: ' + payload.roomId)
                }
                await room.sync()

                const changer = await this.Contact.find({ id: payload.changerId })
                if (!changer) {
                  throw new Error('no changer found for id: ' + payload.changerId)
                }
                const date = timestampToDate(payload.timestamp)

                this.emit('room-topic', room, payload.newTopic, payload.oldTopic, changer, date)
                room.emit('topic', payload.newTopic, payload.oldTopic, changer, date)
              } catch (e) {
                this.emit('error', GError.from(e))
              }
            })
            break

          case 'scan':
            register('scan', async payload => {
              this.__notifyPuppetUnready()
              this.emit('scan', payload.qrcode || '', payload.status, payload.data)
            })
            break

          case 'reset':
            register('reset', () => {
              this.__notifyPuppetReset()
            })
            break

          case 'dirty':
            register('dirty', async ({ payloadType, payloadId }) => {
              try {
                switch (payloadType) {
                  case PUPPET.types.Payload.RoomMember:
                  case PUPPET.types.Payload.Contact: {
                    const contact = await this.Contact.find({ id: payloadId }) as unknown as undefined | ContactImpl
                    await contact?.ready(true)
                    break
                  }
                  case PUPPET.types.Payload.Room: {
                    const room = await this.Room.find({ id: payloadId })  as unknown as undefined | RoomImpl
                    await room?.ready(true)
                    break
                  }

                  case PUPPET.types.Payload.Friendship:
                    break
                  case PUPPET.types.Payload.Message:
                    break

                  case PUPPET.types.Payload.Unspecified:
                  default:
                    throw new Error('unknown payload type: ' + payloadType)
                }
              } catch (e) {
                this.emit('error', GError.from(e))
              }
            })
            break

          default:
            assertPuppetEventNameExhaustive(eventName)
            break

        }
      }

      log.verbose('WechatyPuppetMixin', '__setupPuppetEvents() ... done')

      let detached = false
      return () => {
        if (detached) {
          return
        }
        detached = true
        if (typeof (puppet as any).off !== 'function') {
          return
        }
        for (const { eventName, listener } of registrations) {
          puppet.off(eventName, listener as any)
        }
      }
    }

  }

  return PuppetMixin
}

type PuppetMixin = ReturnType<typeof puppetMixin>

type ProtectedPropertyPuppetMixin =
  | '__acquirePuppet'
  | '__bindPuppetLifecycleBridge'
  | '__puppet'
  | '__puppetMixinInited'
  | '__readiness'
  | '__setupPuppetEvents'

export type {
  PuppetMixin,
  ProtectedPropertyPuppetMixin,
}
export {
  puppetMixin,
}
