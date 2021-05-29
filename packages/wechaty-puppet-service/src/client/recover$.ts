import {
  Puppet,
}                   from 'wechaty-puppet'

import {
  fromEvent,
  interval,
  merge,
  // Subscription,
  // pipe,
  // of,
  // forkJoin,
}                 from 'rxjs'
import {
  debounce,
  filter,
  mapTo,
  startWith,
  switchMap,
  takeUntil,
  tap,
}             from 'rxjs/operators'

import {
  log,
}           from '../config'

/**
 * Filters
 */
export const switchSuccess = (status: true | 'pending') => status === true

/**
 * Actions
 */
export const resetPuppet   = (puppet: Puppet) => (n: number) => puppet.emit('reset', { data: `recover$() AED #${n}` })
export const dingHeartbeat = (puppet: Puppet) => (n: number) => puppet.ding(`recover$() CPR #${n}`)

/**
 * Observables
 */

// Huan(202105) FIXME: use automatically inference instead of hard coding typing here
export const switchOn$  = (puppet: Puppet) => fromEvent<true | 'pending'>(puppet.state, 'on')
export const switchOff$ = (puppet: Puppet) => fromEvent<true | 'pending'>(puppet.state, 'off')

export const heartbeat$ = (puppet: Puppet) => fromEvent<{}>(puppet as any, 'heartbeat')

/**
 * Streams
 */

// Heartbeat stream is like ECG (ElectroCardioGraphy)
export const switchOnHeartbeat$ = (puppet: Puppet) => switchOn$(puppet).pipe(
  filter(switchSuccess),
  tap(_ => log.verbose('PuppetService', 'recover$() switchOn$ fired')),
  switchMap(_ => heartbeat$(puppet).pipe(
    startWith(undefined), // initial beat
    tap(payload => log.verbose('PuppetService', 'recover$() heartbeat: %s', JSON.stringify(payload))),
  ))
)

/**
 * The GRPC keepalive timeout is 20 seconds
 * So we use 15 seconds to save the GRPC keepalive cost
 *
 *  https://github.com/grpc/grpc/blob/master/doc/keepalive.md
 *    GRPC_ARG_KEEPALIVE_TIMEOUT_MS 20000 (20 seconds)  20000 (20 seconds)
 */
const PUPPET_SERVICE_KEEPALIVE_TIMEOUT = 15 * 1000

let HEARTBEAT_COUNTER = 0

// Ding is like CPR (Cardio Pulmonary Resuscitation)
export const heartbeatDing$ = (puppet: Puppet) => switchOnHeartbeat$(puppet).pipe(
  debounce(() => interval(PUPPET_SERVICE_KEEPALIVE_TIMEOUT)),
  tap(_ => log.verbose('PuppetService', 'recover$() heartbeatDing()')),
  mapTo(HEARTBEAT_COUNTER++),
  tap(dingHeartbeat(puppet)),
)

const PUPPET_SERVICE_RESET_TIMEOUT = 60 * 1000

// Reset is like AED (Automated External Defibrillator)
export const heartbeatReset$ = (puppet: Puppet) => switchOnHeartbeat$(puppet).pipe(
  debounce(_ => interval(PUPPET_SERVICE_RESET_TIMEOUT)),
  tap(_ => log.verbose('PuppetService', 'recover$() heartbeatReset()')),
  switchMap(_ => interval(PUPPET_SERVICE_RESET_TIMEOUT).pipe(
    // map(n => `AED#${n}`),
    tap(resetPuppet(puppet)),
    takeUntil(heartbeat$(puppet)),
  )),
)

/**
 * Main stream
 */
export const recover$ = (puppet: Puppet) => merge(
  heartbeatDing$(puppet),
  heartbeatReset$(puppet),
)
