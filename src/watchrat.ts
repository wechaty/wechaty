// https://github.com/andrew-filonenko/ya-watchdog
// https://en.wikipedia.org/wiki/Watchdog_timer

import { EventEmitter } from 'events'

import { log }  from './config'

export type WatchRatEvent    = 'death' | 'feed' | 'timeout'
export type WatchRatListener = (time: number, food: any) => void

export class WatchRat extends EventEmitter {
  private timer : NodeJS.Timer | undefined | null
  private died  : boolean

  private lastFeed : number
  private lastFood : any

  constructor(
    public timeout = 60 * 1000,
  ) {
    super()
    log.verbose('WatchRat', 'constructor(%d)', timeout)
    this.died = false
  }

  public on(event: 'death',   listener: WatchRatListener) : this
  public on(event: 'feed',    listener: WatchRatListener) : this
  public on(event: 'timeout', listener: WatchRatListener) : this
  public on(event: never,     listener: never)            : never

  public on(event: WatchRatEvent, listener: WatchRatListener): this {
    log.verbose('WatchRat', 'on(%s)', event)
    super.on(event, listener)
    return this
  }

  private startTimer(): number {
    log.verbose('WatchRat', 'startTimer()')

    if (this.timer) {
      throw new Error('timer already exist!')
    }
    if (this.died) {
      throw new Error('can not start timer on a dead rat!')
    }

    this.timer = setTimeout(() => {
      log.verbose('WatchRat', 'startTimer() setTimeout() after %d', this.timeout)
      this.died = true
      this.emit('timeout', this.timeout, this.lastFood)
      this.emit('death', this.timeout, this.lastFood)
    }, this.timeout)

    this.timer.unref()  // should not block node quit

    this.lastFeed = Date.now()
    return this.timeout
  }

  private stopTimer(): number {
    log.verbose('WatchRat', 'stopTimer()')

    if (this.timer === undefined) {
      // first time to init watchrat
      return 0
    }

    if (this.timer === null) {
      throw new Error('time is already stoped!')
    }
    clearTimeout(this.timer)
    this.timer = null

    return this.timeLeft()
  }

  private timeLeft(): number {
    // console.log('lastFeed=', this.lastFeed)
    // console.log('timeout=', this.timeout)
    // console.log('Date.now()=', Date.now())
    const timeLeft = this.lastFeed + this.timeout - Date.now()
    log.verbose('WatchRat', 'timerLeft() = %d', timeLeft)
    return timeLeft
  }

  public feed(food?: any): number {
    log.verbose('WatchRat', 'feed(%s)', food)

    if (this.died) {
      throw new Error('cannot feed a dead rat!')
    }

    const now = Date.now()
    // console.log('feed now=', now)

    const timeLeft = this.stopTimer()
    this.startTimer()

    this.lastFeed = now
    this.lastFood = food

    this.emit('feed', timeLeft, food)

    return timeLeft
  }

  public kill(): number {
    log.verbose('WatchRat', 'kill()')

    this.died = true

    const timeLeft = this.stopTimer()
    this.emit('death', this.timeout, this.lastFood)

    return timeLeft
  }

  public async death(): Promise<void> {
    log.verbose('WatchRat', 'death()')

    if (this.died) {
      return Promise.resolve()
    }
    return new Promise<void>(resolve => this.once('death', resolve))
  }
}

export default WatchRat
