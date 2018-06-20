export function isRoomId(id: string): boolean {
  return /^@@/.test(id)
}

export function isContactId(id: string): boolean {
  return !isRoomId(id)
}
