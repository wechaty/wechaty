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
  Observable,
  interval,
  timer,
}                       from 'rxjs'
import {
  debounce,
  filter,
  map,
  switchMap,
  takeUntil,
  tap,
}                       from 'rxjs/operators'
import {
  isActionOf,
}                       from 'typesafe-actions'
import type {
  // type Action,
  AnyAction,
}                       from 'redux'
import {
  Duck as PuppetDuck,
}                       from 'wechaty-redux'
import { log }          from 'wechaty-puppet'

const stateActive$ = (action$: Observable<AnyAction>) => action$.pipe(
  filter(isActionOf(PuppetDuck.actions.STATE_ACTIVATED_EVENT)),
  filter(action => action.payload.state === true),
)

const stateInactive$ = (action$: Observable<AnyAction>) => action$.pipe(
  filter(isActionOf(PuppetDuck.actions.STATE_INACTIVATED_EVENT)),
)

const heartbeat$ = (action$: Observable<AnyAction>) => action$.pipe(
  filter(isActionOf([
    PuppetDuck.actions.HEARTBEAT_RECEIVED_EVENT,
    PuppetDuck.actions.DONG_RECEIVED_EVENT,
  ])),
)

// Emit once when an active puppet lost heartbeat after a timeout period
const monitorHeartbeat$ = (timeoutMilliseconds: number) =>
  (action$: Observable<AnyAction>) =>
    stateActive$(action$).pipe(
      switchMap(action => heartbeat$(action$).pipe(
        debounce(() => interval(timeoutMilliseconds)),
        tap(() => log.verbose('PuppetService', 'monitorHeartbeat$() %d seconds TIMEOUT',
          Math.floor(timeoutMilliseconds / 1000),
        )),
        map(() => PuppetDuck.actions.ERROR_RECEIVED_EVENT(
          action.meta.puppetId,
          { gerror: `monitorHeartbeat$() TIMEOUT(${timeoutMilliseconds})` },
        )),
      )),
    )

const epicRecoverDing$ = (timeoutMilliseconds: number) =>
  (action$: Observable<AnyAction>) =>
    monitorHeartbeat$(timeoutMilliseconds)(action$).pipe(
      switchMap(action => timer(0, Math.floor(timeoutMilliseconds)).pipe(
        tap(n => log.verbose('PuppetService', 'epicRecoverDing$() actions.ding() emitted #%d', n)),
        map(() => PuppetDuck.actions.DING_COMMAND(
          action.meta.puppetId,
          'epicRecoverDing$',
        )),
        takeUntil(heartbeat$(action$)),
        takeUntil(stateInactive$(action$)),
      )),
    )

const epicRecoverReset$ = (timeoutMilliseconds: number) =>
  (action$: Observable<AnyAction>) =>
    monitorHeartbeat$(timeoutMilliseconds)(action$).pipe(
      switchMap(action => timer(0, timeoutMilliseconds * 2).pipe(
        tap(n => log.verbose('PuppetService', 'epicRecoverReset$() actions.reset() emitted #%d', n)),
        map(() => PuppetDuck.actions.RESET_COMMAND(
          action.meta.puppetId,
          'epicRecoverReset$',
        )),
        takeUntil(heartbeat$(action$)),
        takeUntil(stateInactive$(action$)),
      )),
    )

export {
  monitorHeartbeat$,
  epicRecoverReset$,
  epicRecoverDing$,
}
