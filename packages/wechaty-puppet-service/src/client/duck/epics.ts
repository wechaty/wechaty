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
  merge,
}               from 'rxjs'
import type {
  AnyAction,
}               from 'redux'
import type {
  Epic,
}               from 'redux-observable'

import {
  epicRecoverDing$,
  epicRecoverReset$,
}                             from './epic-recover.js'

/**
 * The GRPC keepalive timeout is 20 seconds
 * So we use 15 seconds to save the GRPC keepalive cost
 *
 *  https://github.com/grpc/grpc/blob/master/doc/keepalive.md
 *    GRPC_ARG_KEEPALIVE_TIMEOUT_MS 20000 (20 seconds)  20000 (20 seconds)
 */
const TIMEOUT_SOFT = 15 * 1000
const TIMEOUT_HARD = Math.floor(4.5 * TIMEOUT_SOFT)

const recoverEpic: Epic = (action$: Observable<AnyAction>) => merge(
  epicRecoverDing$(TIMEOUT_SOFT)(action$),
  epicRecoverReset$(TIMEOUT_HARD)(action$),
)

export {
  recoverEpic,
}
