export function isRoomId(id?: string): boolean {
  if (!id) {
    // throw new Error('no id')
    return false
  }
  return /@chatroom$/.test(id)
}

export function isContactId(id?: string): boolean {
  if (!id) {
    return false
    // throw new Error('no id')
  }
  return !isRoomId(id)
}

export function isContactOfficialId(id?: string): boolean {
  if (!id) {
    return false
    // throw new Error('no id')
  }
  return /^gh_/i.test(id)
}

export function isStrangerV1(strangerId?: string): boolean {
  if (!strangerId) {
    return false
    // throw new Error('no id')
  }
  return /^v1_/i.test(strangerId)
}

export function isStrangerV2(strangerId?: string): boolean {
  if (!strangerId) {
    return false
    // throw new Error('no id')
  }
  return /^v2_/i.test(strangerId)
}

export function isPayload(payload: Object): boolean {
  if (   payload
      && typeof payload === 'object'
      && Object.keys(payload).length > 0
  ) {
    return true
  }
  return false
}
