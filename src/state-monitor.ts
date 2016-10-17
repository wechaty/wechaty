/**
 *
 * Wechaty: Wechat for Bot. and for human who talk to bot/robot
 *
 * Class StateMonitor
 * http://www.wechaty.io
 *
 * Licenst: ISC
 * https://github.com/zixia/wechaty
 *
 * Helper Class for Manage State Change
 */
import { log } from './config'

/**
 * A - State A
 * B - State B
 */

export class StateMonitor <A, B>{
  private _target:   A|B
  private _current:  A|B
  private _stable:  boolean

  constructor(private client: string, initState: A|B) {
    log.verbose('StateMonitor', 'constructor(%s, %s)', client, initState)

    this.target(initState)
    this.current(initState, true)
  }

  public target(newState?: A|B): A|B {
    if (newState) {
      log.verbose('StateMonitor', 'target(%s) %s state change from %s to %s'
                                , this.client, newState
                                , this._target, newState
                )
      this._target = newState
    } else {
      log.verbose('StateMonitor', 'target() %s state is %s', this.client, this._target)
    }
    return this._target
  }

  public current(newState?: A|B, stable = true): A|B {
    if (newState) {
      log.verbose('StateMonitor', 'current(%s, %s) %s state change from %s:%s to %s:%s'
                                , newState, stable
                                , this.client
                                , this._current, this._stable
                                , newState, stable
                )
      this._current = newState
      this._stable  = stable
    } else {
      log.verbose('StateMonitor', 'current() %s state is %s', this.client, this._current)
    }
    return this._current
  }

  public stable() {
    log.verbose('StateMonitor', 'stable() %s state is %s', this.client, this._stable)
    return this._stable
  }
}

export default StateMonitor
