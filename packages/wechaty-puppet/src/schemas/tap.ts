/**
 * Tap schema: the `TapType` map, the tap payload and its query filter.
 */
/**
 * Huan(202201): This enum type value MUST be keep unchanged across versions
 *  because the puppet service client/server might has different versions of the puppet
 */
const TapType = {
  Unspecified : 0,  // If the tap type is not specified, it means the tap type is `Any`, which means any tap type should be considered
  Like        : 1,
} as const
type TapType = typeof TapType[keyof typeof TapType]

type TapPayload = {
  [key in TapType]?: {
    contactId: string[]
    timestamp: number[]
  }
}

interface TapQueryFilter {
  contactId? : string,
  type?      : TapType,
}

export {
  TapType,
  type TapPayload,
  type TapQueryFilter,
}
