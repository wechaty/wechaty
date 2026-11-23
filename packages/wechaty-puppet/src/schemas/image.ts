/**
 * Image schema: the `ImageType` map (thumbnail, HD, artwork).
 */
export const ImageType = {
  Unknown : 0,
  Thumbnail : 1,
  HD : 2,
  Artwork : 3,
} as const
export type ImageType = typeof ImageType[keyof typeof ImageType]
