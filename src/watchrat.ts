// https://github.com/andrew-filonenko/ya-watchdog
// https://en.wikipedia.org/wiki/Watchdog_timer

import { EventEmitter } from 'events'

import { log }  from './config'

export type WatchRatEvent = 'death' | 'timeout'

export type WatchRatListener = (timeout: number, lastFood: any) => void

export class WatchRat extends EventEmitter {
  private timer: NodeJS.Timer | undefined

  private lastFeed: number
  private lastFood: any

  private killed: boolean

  constructor(
    public timeout = 60 * 1000,
  ) {
    super()
    log.verbose('WatchRat', 'constructor(%d)', timeout)

    this.killed   = false
    this.lastFeed = Date.now()

    this.startTimer()
  }

  public on(event: 'death', listener: WatchRatListener):   this
  public on(event: 'timeout', listener: WatchRatListener): this
  public on(event: never, listener: any): any

  public on(event: WatchRatEvent, listener: WatchRatListener): this {
    log.verbose('WatchRat', 'on(%s)', event)
    super.on(event, listener)
    return this
  }

  private stopTimer() {
    log.verbose('WatchRat', 'stopTimer()')

    if (!this.timer) {
      throw new Error('timer not exist!')
    }
    clearTimeout(this.timer)
    this.timer = undefined

    return this.timeLeft()
  }

  private startTimer(): number {
    log.verbose('WatchRat', 'startTimer()')

    if (this.timer) {
      throw new Error('timer already exist!')
    }
    this.timer = setTimeout(() => {
      this.lastFeed = Date.now()
      this.emit('timeout', this.timeout, this.lastFood)
    }, this.timeout)

    return this.timeout
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

    if (this.killed) {
      throw new Error('watchrat had been killed!')
    }

    const now = Date.now()
    // console.log('feed now=', now)

    const timeLeft = this.stopTimer()
    this.startTimer()

    this.lastFeed = now
    this.lastFood = food

    return timeLeft
  }

  public kill(): number {
    log.verbose('WatchRat', 'kill()')

    this.killed = true

    const timeLeft = this.stopTimer()
    this.emit('death', this.timeout, this.lastFood)

    return timeLeft
  }

  public async death(): Promise<void> {
    log.verbose('WatchRat', 'death()')

    if (this.killed) {
      return Promise.resolve()
    }
    return new Promise<void>(resolve => {
      this.once('death', resolve)
    })
  }
}

export default WatchRat
