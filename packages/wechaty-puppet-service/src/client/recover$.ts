import {
  Puppet,
}                   from 'wechaty-puppet'

import {
  fromEvent,
  interval,
  merge,
  // Subscription,
  pipe,
  // forkJoin,
}                 from 'rxjs'
import {
  filter,
  mergeMap,
  startWith,
  takeUntil,
  tap,
  debounce,
}             from 'rxjs/operators'

import {
  log,
}           from '../config'

/**
 * Observables
 */
export const heartbeat$ = (puppet: Puppet) => fromEvent<{}>(puppet, 'heartbeat')
export const switchOn$  = (puppet: Puppet) => fromEvent(puppet.state, 'on')
export const switchOff$ = (puppet: Puppet) => fromEvent(puppet.state, 'off')

/**
 * Filters
 */
export const switchSuccess = (status: true | 'pending') => status === true

/**
 * Actions
 */
export const resetPuppet   = (puppet: Puppet) => () => puppet.emit('reset', { data: 'RxJS recover$' })
export const dingHeartbeat = (puppet: Puppet) => () => puppet.ding(`recover$()`)  // AED: Automated External Defibrillator

/**
 * Pipes
 */
export const heartbeatDing = (puppet: Puppet) => () => pipe(
  tap(_ => log.verbose('Puppet', 'recover$() heartbeatDing()')),
  debounce(() => interval(15 * 1000)),
  tap(dingHeartbeat(puppet)),
)

export const heartbeatReset = (puppet: Puppet) => () => pipe(
  tap(_ => log.verbose('Puppet', 'recover$() heartbeatReset()')),
  debounce(_ => interval(60 * 1000)),
  mergeMap(_ => interval(60 * 1000).pipe(
    tap(resetPuppet(puppet)),
    takeUntil(heartbeat$(puppet)),
  )),
)

export const heartbeatPipe = (puppet: Puppet) => mergeMap(_ => merge(
  mergeMap(_ => heartbeatDing(puppet)),
  mergeMap(_ => heartbeatReset(puppet)),
))

/**
 * Main stream
 */
export function recover$ (puppet: Puppet) {
  return switchOn$(puppet).pipe(
    filter(switchSuccess),
    tap(_ => log.verbose('Puppet', 'recover$() switchOn$ fired')),
    mergeMap(_ => heartbeat$(puppet).pipe(
      startWith(undefined), // trigger the throttle stream at start
      tap(payload => log.verbose('Puppet', 'recover$() heartbeat: %s', JSON.stringify(payload))),
      heartbeatPipe(puppet),
      takeUntil(switchOff$(puppet)),
    )),
  )
}
