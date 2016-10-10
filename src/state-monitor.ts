/**
 * Wechaty
 *
 * Helper Class for Manage State Change
 */

/**
 * A - State A
 * B - State B
 */
class StateMonitor <A, B>{
  private _targetState:   A|B
  private _currentState:  [A|B, boolean]

  constructor(initState: A|B) {
    this.targetState(initState)
    this.currentState(initState)
  }

  public targetState(newState: A|B): A|B {
    if (newState) {
      this._targetState = newState
    }
    return this._targetState
  }

  public currentState(newState: A|B, pending = false): [A|B, boolean] {
    if (newState) {
      this._currentState = [newState, pending]
    }
    return this._currentState
  }
}

export default StateMonitor
