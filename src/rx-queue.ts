import { EventEmitter } from 'events'

import { Observable } from 'rxjs/Rx'

import { log }        from './config'

export type QueueType = 'debounce' | 'delay' | 'throttle'

/**
 * [What is a Scheduler?](https://github.com/ReactiveX/rxjs/blob/master/doc/scheduler.md)
 * [Writing Marble Tests](https://github.com/ReactiveX/rxjs/blob/master/doc/writing-marble-tests.md)
 * [Debounce](http://reactivex.io/documentation/operators/debounce.html)
 */
export class RxQueue extends EventEmitter {
  constructor(
    public type: QueueType,
    public time: number,
  ) {
    super()
    log.verbose('RxQueue', 'constructor(type=%s, time=%s)', type, time)
  }

  public init(): void {
    log.verbose('RxQueue', 'init()')
    switch (this.type) {
      case 'debounce':
        this.initDebounce()
        break
      case 'delay':
        this.initDelay()
        break
      case 'throttle':
        this.initThrottle()
        break
      default:
        throw new Error('not supported type: ' + this.type)
    }
  }

  public on(event: 'i', listener: ((...args: any[]) => void)) : this
  public on(event: 'o', listener: ((...args: any[]) => void)) : this
  public on(event: never, listener: never)                    : never

  public on(event: 'i' | 'o', listener: ((...args: any[]) => void)): this {
    super.on(event, listener)
    return this
  }

  public emit(event: 'i', ...args: any[])    : boolean
  public emit(event: 'o', ...args: any[])    : boolean
  public emit(event: never, listener: never) : never

  public emit(event: 'i' | 'o', ...args: any[]): boolean {
    return super.emit(event, ...args)
  }

  // https://stackoverflow.com/a/40088306/1123955
  // http://jsbin.com/mulocegalu/1/edit?html,js,output
  private initDelay() {
    log.verbose('RxQueue', 'initDelay()')
    Observable
      .fromEvent(this, 'i', (...args: any[]) => args)
      // .interval(5 /* ms */)
      // .take(30)
      .concatMap(args => {
        return Observable.of(args) // emit first item right away
                .concat(Observable.empty().delay(this.time)) // delay next item
      })
      .subscribe((args: any[]) => this.emit('o', ...args))

  }

  private initThrottle() {
    log.verbose('RxQueue', 'initThrottle()')
    Observable
      .fromEvent(this, 'i', (...args: any[]) => args)
      .throttle(val => Observable.interval(this.time))
      .subscribe((args: any[]) => this.emit('o', ...args))
  }

  private initDebounce() {
    log.verbose('RxQueue', 'initDebounce()')
    Observable
      .fromEvent(this, 'i', (...args: any[]) => args)
      .debounce(val => Observable.interval(this.time))
      .subscribe((args: any[]) => this.emit('o', ...args))
  }
}

export default RxQueue
