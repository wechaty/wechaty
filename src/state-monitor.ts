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
      log.verbose('StateMonitor', '%s:target(%s) <- %s'
                                , this._client
                                , newState
                                , this._target
      )
      this._target = newState
    } else {
      log.silly('StateMonitor', '%s:target() %s', this._client, this._target)
    }
    return this._target
  }

  /**
   * set/get current state
   * @param stable boolean  true for stable, false for inprocess
   */
  public current(newState?: A|B, stable = true): A|B {
    if (newState) {
      log.verbose('StateMonitor', '%s:current(%s,%s) <- (%s,%s)'
                                , this._client
                                , newState, stable
                                , this._current, this._stable
                )

      /**
       * warn for inprocess current state change twice, mostly like a logic bug outside
       */
      if (this._current === newState && this._stable === stable
          && stable === false
      ) {
        log.warn('StateMonitor', '%s:current(%s,%s) called but there are already in the same state'
                                , this._client
                                , newState, stable
        )
        const e = new Error('current unchange')
        log.verbose('StateMonitor', e.stack)
      }

      this._current = newState
      this._stable  = stable
    } else {
      log.silly('StateMonitor', '%s:current() %s', this._client, this._current)
    }
    return this._current
  }

  /**
   * does the current state be stable(not inprocess)?
   */
  public stable() {
    log.silly('StateMonitor', '%s:stable() is %s', this._client, this._stable)
    return this._stable
  }

  /**
   * does the current state be inprocess(not stable)?
   */
  public inprocess() {
    log.silly('StateMonitor', '%s:inprocess() %s', this._client, !this._stable)
    return !this._stable
  }

  /**
   * get the client name
   */
  public client() {
    return this._client
  }
}
