export function isRoomId(id?: string): boolean {
  if (!id) {
    throw new Error('no id')
  }
  return /@chatroom$/.test(id)
}

export function isContactId(id?: string): boolean {
  if (!id) {
    throw new Error('no id')
  }
  return !isRoomId(id)
}

export function isContactOfficialId(id?: string): boolean {
  if (!id) {
    throw new Error('no id')
  }
  return /^gh_/i.test(id)
}

export function isStrangerV1(strangerId?: string): boolean {
  if (!strangerId) {
    throw new Error('no id')
  }
  return /^v1_/i.test(strangerId)
}

export function isStrangerV2(strangerId?: string): boolean {
  if (!strangerId) {
    throw new Error('no id')
  }
  return /^v2_/i.test(strangerId)
}
