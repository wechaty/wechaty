import { EventEmitter } from 'events'

import { log }  from './config'

export type WatchratEvent    = 'feed' | 'reset' | 'sleep'
export type WatchratListener = (food: WatchratFood, left: number) => void

export interface WatchratFood<T = any> {
  data     : any,
  timeout? : number,   // millisecond
  type?    : T
}

export class Watchrat<T = any> extends EventEmitter {
  private timer : NodeJS.Timer | undefined | null  // `undefined` stands for the first time init. `null` will be set by `stopTimer`

  private lastFeed : number
  private lastFood : WatchratFood<T>

  constructor(
    public name = 'Meow',
    public defaultTimeout = 60 * 1000,
  ) {
    super()
    log.verbose('Watchrat', '%s: constructor(name=%s, defaultTimeout=%d)', name, name, defaultTimeout)
  }

  public on(event: 'feed',  listener: WatchratListener) : this
  public on(event: 'reset', listener: WatchratListener) : this
  public on(event: 'sleep', listener: WatchratListener) : this
  public on(event: never,   listener: never)            : never

  public on(event: WatchratEvent, listener: WatchratListener): this {
    log.verbose('Watchrat', '%s: on(%s)', this.name, event)
    super.on(event, listener)
    return this
  }

  private startTimer(timeout: number): void {
    log.verbose('Watchrat', '%s: startTimer()', this.name)

    if (this.timer) {
      throw new Error('timer already exist!')
    }

    this.timer = setTimeout(() => {
      log.verbose('Watchrat', '%s: startTimer() setTimeout() after %d', this.name, this.defaultTimeout)
      this.emit('reset',  this.lastFood, 0)
    }, timeout)

    this.timer.unref()  // should not block node quit

    return
  }

  private stopTimer(sleep = false): void {
    log.verbose('Watchrat', '%s: stopTimer()', this.name)

    if (typeof this.timer === 'undefined') {  // first time
      log.verbose('Watchrat', '%s: stopTimer() first run(or after sleep)', this.name)
      return
    }

    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    } else if (!sleep) {
      throw new Error('timer is already stoped!')
    }
  }

  public left(): number {
    let left
    if (Number.isInteger(this.lastFeed)) {
      // console.log('lastFeed=', this.lastFeed)
      // console.log('timeout=', this.lastFood.timeout)
      // console.log('Date.now()=', Date.now())
      left = this.lastFeed + this.defaultTimeout - Date.now()
      log.verbose('Watchrat', '%s: timerLeft() = %d', this.name, left)
    } else {
      left = 0
      log.verbose('Watchrat', '%s: timerLeft() first feed, left=%s', this.name, left)
    }
    return left
  }

  public feed(food: WatchratFood<T>): number {
    log.verbose('Watchrat', '%s: feed(%s)', this.name, food)

    if (!food.timeout) {
      food.timeout = this.defaultTimeout
    }

    const left = this.left()

    this.stopTimer()
    this.startTimer(food.timeout)

    this.lastFeed = Date.now()
    this.lastFood = food

    this.emit('feed', food, left)

    return left
  }

  public sleep(): void {
    log.verbose('Watchrat', '%s: sleep()', this.name)
    this.stopTimer(true)
    this.timer = undefined
  }

}

export default Watchrat
