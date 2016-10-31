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

  constructor(private _client: string, initState: A|B) {
    log.silly('StateMonitor', 'constructor(%s, %s)', _client, initState)

    this._target  = initState
    this._current = initState
    this._stable  = true
  }

  /**
   * set/get target state
   */
  public target(newState?: A|B): A|B {
    if (newState) {
      log.verbose('StateMonitor', 'state.target(%s) <- %s for %s'
                                , newState
                                , this._target
                                , this._client
      )
      this._target = newState
    } else {
      log.silly('StateMonitor', 'state.target() is %s of %s', this._target, this._client)
    }
    return this._target
  }

  /**
   * set/get current state
   * @param stable boolean  true for stable, false for inprocess
   */
  public current(newState?: A|B, stable = true): A|B {
    if (newState) {
      log.verbose('StateMonitor', 'state.current(%s,%s) <- (%s,%s) for %s'
                                , newState, stable
                                , this._current, this._stable
                                , this._client
                )

      /**
       * warn for inprocess current state change twice, mostly like a logic bug outside
       */
      if (this._current === newState && this._stable === stable
          && stable === false
      ) {
        log.warn('StateMonitor', 'state.current(%s,%s) called but there are already in the same state for %s'
                                , newState, stable
                                , this._client
        )
        const e = new Error('current unchange')
        log.verbose('StateMonitor', e.stack)
      }

      this._current = newState
      this._stable  = stable
    } else {
      log.silly('StateMonitor', 'state.current() is %s of %s', this._current, this._client)
    }
    return this._current
  }

  /**
   * does the current state be stable(not inprocess)?
   */
  public stable() {
    log.silly('StateMonitor', 'state.stable() is %s of %s', this._stable, this._client)
    return this._stable
  }

  /**
   * does the current state be inprocess(not stable)?
   */
  public inprocess() {
    log.silly('StateMonitor', 'state.inprocess() is %s of %s', !this._stable, this._client)
    return !this._stable
  }

  /**
   * get the client name
   */
  public client() {
    return this._client
  }
}

export default StateMonitor
