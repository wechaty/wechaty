import { StateSwitch }        from 'state-switch'

class BusyIndicator {

  private state: StateSwitch

  constructor (...args: ConstructorParameters<typeof StateSwitch>) {
    this.state = new StateSwitch(...args)
  }

  /**
   * Set busy state
   * @param b busy or not
   */
  busy (b: boolean): void
  /**
   * Get busy state
   */
  busy (): boolean

  busy (b?: boolean): void | boolean {
    if (typeof b === 'undefined') {
      return !!(this.state.on())
    }

    if (b) {
      this.state.on(true)
    } else {
      this.state.off(true)
    }
  }

  /**
   * Return a Promise that resolves when the busy state is off
   */
  async available (): Promise<void> {
    await this.state.ready('off')
  }

}

export { BusyIndicator }
