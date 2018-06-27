import {
  ContactPayload,
  ContactType,
}                       from 'wechaty-puppet'

import {
  PadchatContactPayload,
}                             from '../padchat-schemas'

import {
  isRoomId,
  isContactOfficialId,
}                           from './is-type'

export function contactRawPayloadParser(
  rawPayload: PadchatContactPayload,
): ContactPayload {
  if (!rawPayload.user_name) {
    /**
     * { big_head: '',
     *  city: '',
     *  country: '',
     *  intro: '',
     *  label: '',
     *  message: '',
     *  nick_name: '',
     *  provincia: '',
     *  py_initial: '',
     *  quan_pin: '',
     *  remark: '',
     *  remark_py_initial: '',
     *  remark_quan_pin: '',
     *  sex: 0,
     *  signature: '',
     *  small_head: '',
     *  status: 0,
     *  stranger: '',
     *  ticket: '',
     *  user_name: '' }
     */
    // console.log(rawPayload)
    throw Error('cannot get user_name from raw payload: ' + JSON.stringify(rawPayload))
  }

  if (isRoomId(rawPayload.user_name)) {
    throw Error('Room Object instead of Contact!')
  }

  let contactType = ContactType.Unknown
  if (isContactOfficialId(rawPayload.user_name)) {
    contactType = ContactType.Official
  } else {
    contactType = ContactType.Personal
  }

  const payload: ContactPayload = {
    alias     : rawPayload.remark,
    avatar    : rawPayload.big_head,
    city      : rawPayload.city,
    gender    : rawPayload.sex,
    id        : rawPayload.user_name,
    name      : rawPayload.nick_name,
    province  : rawPayload.provincia,
    signature : (rawPayload.signature).replace('+', ' '),          // Stay+Foolish
    type      : contactType,
  }

  return payload
}
