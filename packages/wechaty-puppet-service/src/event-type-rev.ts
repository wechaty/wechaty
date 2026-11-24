/**
 * `EventTypeRev`: event type number → name, for logging.
 */
import {
  EventType,
} from 'wechaty-grpc'

export const EventTypeRev: Record<number, string> = {}

for (const [key, val] of Object.entries(EventType)) {
  if (typeof val === 'number') {
    EventTypeRev[val] = key
  }
}
