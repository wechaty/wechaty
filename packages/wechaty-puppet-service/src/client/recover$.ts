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
  map,
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
export const resetPuppet   = (puppet: Puppet) => () => puppet.emit('reset', { data: 'recover$() AED' })
export const dingHeartbeat = (puppet: Puppet) => () => puppet.ding(`recover$() CPR`)

/**
 * Observables
 */
export const switchOn$  = (puppet: Puppet) => fromEvent(puppet.state, 'on')
export const switchOff$ = (puppet: Puppet) => fromEvent(puppet.state, 'off')
export const heartbeat$ = (puppet: Puppet) => fromEvent<{}>(puppet, 'heartbeat')

/**
 * Streams
 */

// Heartbeat stream is like ECG (ElectroCardioGraphy)
export const switchOnHeartbeat$ = (puppet: Puppet) => switchOn$(puppet).pipe(
  filter(switchSuccess),
  tap(_ => log.verbose('Puppet', 'recover$() switchOn$ fired')),
  switchMap(_ => heartbeat$(puppet).pipe(
    startWith(undefined), // initial beat
    tap(payload => log.verbose('Puppet', 'recover$() heartbeat: %s', JSON.stringify(payload))),
  ))
)

// Ding is like CPR (Cardio Pulmonary Resuscitation)
export const heartbeatDing$ = (puppet: Puppet) => switchOnHeartbeat$(puppet).pipe(
  debounce(() => interval(15 * 1000)),
  tap(_ => log.verbose('Puppet', 'recover$() heartbeatDing()')),
  tap(dingHeartbeat(puppet)),
)

// Reset is like AED (Automated External Defibrillator)
export const heartbeatReset$ = (puppet: Puppet) => switchOnHeartbeat$(puppet).pipe(
  debounce(_ => interval(60 * 1000)),
  tap(_ => log.verbose('Puppet', 'recover$() heartbeatReset()')),
  switchMap(_ => interval(60 * 1000).pipe(
    map(n => `AED#${n}`),
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
