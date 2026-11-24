/**
 * Browser adapter for `node:events` and `events`.
 *
 * Provides the EventEmitter class with modern Node.js methods such as `.off()`
 * for in-browser execution.
 */
import EventEmitter from 'events/base'

if (!(EventEmitter.prototype as any).off) {
  ;(EventEmitter.prototype as any).off = EventEmitter.prototype.removeListener
}

export default EventEmitter
export { EventEmitter }
