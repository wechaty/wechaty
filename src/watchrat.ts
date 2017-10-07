// https://github.com/andrew-filonenko/ya-watchdog
// https://en.wikipedia.org/wiki/Watchdog_timer

import { EventEmitter } from 'events'

import { log }  from './config'

export type WatchratEvent    = 'death' | 'feed' | 'reset'
export type WatchratListener = (food: WatchratFood, timeLeft: number) => void

export interface WatchratFood<T = any> {
  data     : any,
  timeout? : number,   // millisecond
  type?    : T
}

export class Watchrat<T = any> extends EventEmitter {
  private timer : NodeJS.Timer | undefined | null // `undefined` stands for the first time init. `null` will be set by `stopTimer`
  private died  : boolean

  private lastFeed : number
  private lastFood : WatchratFood<T>

  constructor(
    public name = 'Watchrat',
    public defaultTimeout = 60 * 1000,
  ) {
    super()
    log.verbose('Watchrat', 'constructor(name=%s, defaultTimeout=%d)', name, defaultTimeout)
    this.died = false
  }

  public on(event: 'death', listener: WatchratListener) : this
  public on(event: 'feed',  listener: WatchratListener) : this
  public on(event: 'reset', listener: WatchratListener) : this
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
    if (this.died) {
      throw new Error('can not start timer on a dead rat!')
    }

    this.timer = setTimeout(() => {
      log.verbose('Watchrat', '%s: startTimer() setTimeout() after %d', this.name, this.defaultTimeout)
      this.died = true
      this.emit('reset',  this.lastFood, 0)
      this.emit('death',  this.lastFood, 0)
    }, timeout)

    this.timer.unref()  // should not block node quit

    return
  }

  private stopTimer(sleep = false): number {
    log.verbose('Watchrat', '%s: stopTimer()', this.name)

    if (this.timer === undefined) {
      // first time to init watchrat
      return 0
    }

    if (this.timer !== null) {
      clearTimeout(this.timer)
      this.timer = null
    } else if (!sleep) {
      throw new Error('time is already stoped!')
    }

    return this.timeLeft()
  }

  private timeLeft(): number {
    // console.log('lastFeed=', this.lastFeed)
    // console.log('timeout=', this.timeout)
    // console.log('Date.now()=', Date.now())
    const timeLeft = this.lastFeed + this.defaultTimeout - Date.now()
    log.verbose('Watchrat', '%s: timerLeft() = %d', this.name, timeLeft)
    return timeLeft
  }

  public feed(food: WatchratFood<T>): number {
    log.verbose('Watchrat', '%s: feed(%s)', this.name, food)

    if (this.died) {
      throw new Error('cannot feed a dead rat!')
    }

    if (!food.timeout) {
      food.timeout = this.defaultTimeout
    }

    const timeLeft = this.stopTimer()
    this.startTimer(food.timeout)

    this.lastFeed = Date.now()
    this.lastFood = food

    this.emit('feed', food, timeLeft)

    return timeLeft
  }

  public kill(): number {
    log.verbose('Watchrat', '%s: kill()', this.name)

    this.died = true

    const timeLeft = this.stopTimer(true)
    this.emit('death', this.lastFood, timeLeft)

    this.removeAllListeners()

    return timeLeft
  }

  public sleep(): void {
    log.verbose('Watchrat', '%s: sleep()', this.name)
    this.stopTimer(true)
  }

  public async death(): Promise<void> {
    log.verbose('Watchrat', '%s: death()', this.name)

    if (this.died) {
      return Promise.resolve()
    }
    return new Promise<void>(resolve => this.once('death', resolve))
  }
}

export default Watchrat
