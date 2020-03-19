import {
  EventType,
  EventTypeMap,
}               from '@chatie/grpc'

/**
 * Huan(202003):
 *  @chatie/GRPC proto gen TS does not generate the ENUM type with reverse mapping.
 *  So we need to do it by ourselves:
 *    1. define the EventTypeRev, and
 *    2. loop EventType to fill it.
 */
export const EventTypeRev = {} as {
  [key: number]: string,
}

for (const key in EventType) {
  const val = EventType[key as keyof EventTypeMap]
  EventTypeRev[val] = key
}
