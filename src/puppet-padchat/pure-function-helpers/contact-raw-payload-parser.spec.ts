#!/usr/bin/env ts-node

// tslint:disable:max-line-length
// tslint:disable:no-shadowed-variable

import test  from 'blue-tape'

import {
  ContactGender,
  ContactPayload,
  ContactType,
}                       from 'wechaty-puppet'

import {
  PadchatContactMsgType,
  PadchatContactPayload,
  PadchatContactRoomStatus,

  PadchatContinue,
}                             from '../padchat-schemas'

import { contactRawPayloadParser } from './contact-raw-payload-parser'

test('contactRawPayloadParser', async t => {
  const PADCHAT_CONTACT_PAYLOAD_PERSONAL: PadchatContactPayload = {
    msg_type          : PadchatContactMsgType.Contact,
    continue          : PadchatContinue.Done,
    ticket            : '',
    big_head          : 'http://wx.qlogo.cn/mmhead/ver_1/xfCMmibHH74xGLoyeDFJadrZXX3eOEznPefiaCa3iczxZGMwPtDuSbRQKx3Xdm18un303mf0NFia3USY2nO2VEYILw/0',
    city              : 'Haidian',
    country           : 'CN',
    intro             : '',
    label             : '1',
    nick_name         : '梦君君',
    provincia         : 'Beijing',
    py_initial        : 'LJR',
    remark            : '女儿',
    remark_py_initial : 'lijiaruibeizhu',
    remark_quan_pin   : 'LJRBZ',
    sex               : ContactGender.Female,
    signature         : 'Stay+Foolish',
    small_head        : 'http://wx.qlogo.cn/mmhead/ver_1/xfCMmibHH74xGLoyeDFJadrZXX3eOEznPefiaCa3iczxZGMwPtDuSbRQKx3Xdm18un303mf0NFia3USY2nO2VEYILw/132',
    status            : PadchatContactRoomStatus.Get,
    stranger          : 'v1_0468f2cd3f0efe7ca2589d57c3f9ba952a3789e41b6e78ee00ed53d1e6096b88@stranger',
    user_name         : 'mengjunjun001',
  }

  const PADCHAT_CONTACT_PAYLOAD_OFFICIAL: PadchatContactPayload = {
    big_head          : 'http://wx.qlogo.cn/mmhead/ver_1/TR8EDh3MgMsu20pxjrDPBpaGySuEAGf3MUuoeUOV2LiaqvZxeMqb1U7hgiciaQZBC8LYN0boVLCKOIYg71pxdl1fQabiaxsn7CnNeGWVrK3jSIY/0',
    city              : 'Haidian',
    country           : 'CN',
    intro             : 'CARPE+DIEM+-+if+not+us,+who?+if+not+now,+when?',
    label             : '',
    message           : '',
    nick_name         : '李卓桓',
    provincia         : 'Beijing',
    py_initial        : 'LZH',
    quan_pin          : 'lizhuohuan',
    remark            : '',
    remark_py_initial : '',
    remark_quan_pin   : '',
    sex               : 0,
    signature         : 'CARPE+DIEM+-+if+not+us,+who?+if+not+now,+when?',
    small_head        : 'http://wx.qlogo.cn/mmhead/ver_1/TR8EDh3MgMsu20pxjrDPBpaGySuEAGf3MUuoeUOV2LiaqvZxeMqb1U7hgiciaQZBC8LYN0boVLCKOIYg71pxdl1fQabiaxsn7CnNeGWVrK3jSIY/132',
    status            : 0,
    stranger          : 'v1_cd6656d42f505e5ffbb7eab65fed448fc8f02eade29a873ec3e758c7553db424@stranger',
    ticket            : '',
    user_name         : 'gh_59d7c8ad720c',
  }

  const EXPECTED_CONTACT_PAYLOAD_PERSONAL: ContactPayload = {
    id        : 'mengjunjun001',
    gender    : ContactGender.Female,
    type      : ContactType.Personal,
    alias     : '女儿',
    avatar    : 'http://wx.qlogo.cn/mmhead/ver_1/xfCMmibHH74xGLoyeDFJadrZXX3eOEznPefiaCa3iczxZGMwPtDuSbRQKx3Xdm18un303mf0NFia3USY2nO2VEYILw/0',
    city      : 'Haidian',
    name      : '梦君君',
    province  : 'Beijing',
    signature : 'Stay Foolish',
  }

  const EXPECTED_CONTACT_PAYLOAD_OFFICIAL: ContactPayload = {
    id        : 'gh_59d7c8ad720c',
    gender    : ContactGender.Unknown,
    type      : ContactType.Official,
    alias     : '',
    avatar    : 'http://wx.qlogo.cn/mmhead/ver_1/TR8EDh3MgMsu20pxjrDPBpaGySuEAGf3MUuoeUOV2LiaqvZxeMqb1U7hgiciaQZBC8LYN0boVLCKOIYg71pxdl1fQabiaxsn7CnNeGWVrK3jSIY/0',
    city      : 'Haidian',
    name      : '李卓桓',
    province  : 'Beijing',
    signature : 'CARPE DIEM+-+if+not+us,+who?+if+not+now,+when?',
  }

  const resultPersonal = contactRawPayloadParser(PADCHAT_CONTACT_PAYLOAD_PERSONAL)
  t.deepEqual(resultPersonal, EXPECTED_CONTACT_PAYLOAD_PERSONAL, 'should parse ContactPayload for personal account payload')

  const resultOfficial = contactRawPayloadParser(PADCHAT_CONTACT_PAYLOAD_OFFICIAL)
  t.deepEqual(resultOfficial, EXPECTED_CONTACT_PAYLOAD_OFFICIAL, 'should parse ContactPayload for official account payload')

  t.throws(() => contactRawPayloadParser({} as any), 'should throw exception for invalid object')
  t.throws(() => contactRawPayloadParser(undefined as any), 'should throw exception for undifined')
})
