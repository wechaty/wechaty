/**
 *
 * Wechaty: Wechat for Bot. and for human who talk to bot/robot
 *
 * Class Io
 * http://www.wechaty.io
 *
 * Licenst: ISC
 * https://github.com/zixia/wechaty
 *
 * Helper Class for Manage State Change
 */

/**
 * A - State A
 * B - State B
 */

class StateMonitor <A, B>{
  private _target:   A|B
  private _current:  A|B
  private _stable:  boolean

  constructor(initState: A|B) {
    this.target(initState)
    this.current(initState)
    this.stable(true)
  }

  public target(newState?: A|B): A|B {
    if (newState) {
      this._target = newState
    }
    return this._target
  }

  public current(newState?: A|B, stable = true): A|B {
    if (newState) {
      this._current = newState
      this.stable(stable)
    }
    return this._current
  }

  public stable(isStable?: boolean) {
    if (typeof isStable !== 'undefined') {
      this._stable = isStable
    }
    return this._stable
  }
}

export default StateMonitor
export { StateMonitor }
