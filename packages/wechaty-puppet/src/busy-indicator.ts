import { StateSwitch }        from 'state-switch'

class BusyIndicator {

  private state: StateSwitch

  constructor (...args: ConstructorParameters<typeof StateSwitch>) {
    this.state = new StateSwitch(...args)
  }

  busy (b: boolean): void
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

  async available (): Promise<void> {
    await this.state.ready('off')
  }

}

export { BusyIndicator }
