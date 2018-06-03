export function isRoomId(id: string) {
  return /@chatroom$/.test(id)
}

export function isContactId(id: string) {
  return !isRoomId(id)
}

export function isContactOfficialId(id: string) {
  return /^gh_/i.test(id)
}
