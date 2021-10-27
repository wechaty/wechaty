import type { EventErrorPayload } from '../schemas/event.js'

const isEventErrorPayload = (target: any): target is EventErrorPayload =>
  target instanceof Object
    && 'data' in target
    && typeof target['data'] === 'string'

export {
  isEventErrorPayload,
}
