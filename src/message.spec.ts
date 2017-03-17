/**
 * Wechaty - Wechat for Bot. Connecting ChatBots
 *
 * Licenst: ISC
 * https://github.com/wechaty/wechaty
 *
 */
import { test } from 'ava'

import {
  Config,
  log,
}                 from './config'
import { Message }    from './message'
import { PuppetWeb }  from './puppet-web/'

const MOCK_USER_ID = 'TEST-USER-ID'

const puppet = new PuppetWeb()
puppet.userId = MOCK_USER_ID
Config.puppetInstance(puppet)

test('constructor()', t => {
  /* tslint:disable:max-line-length */
  const rawData = JSON.parse('{"MsgId":"179242112323992762","FromUserName":"@0bb3e4dd746fdbd4a80546aef66f4085","ToUserName":"@16d20edf23a3bf3bc71bb4140e91619f3ff33b4e33f7fcd25e65c1b02c7861ab","MsgType":1,"Content":"test123","Status":3,"ImgStatus":1,"CreateTime":1461652670,"VoiceLength":0,"PlayLength":0,"FileName":"","FileSize":"","MediaId":"","Url":"","AppMsgType":0,"StatusNotifyCode":0,"StatusNotifyUserName":"","RecommendInfo":{"UserName":"","NickName":"","QQNum":0,"Province":"","City":"","Content":"","Signature":"","Alias":"","Scene":0,"VerifyFlag":0,"AttrStatus":0,"Sex":0,"Ticket":"","OpCode":0},"ForwardFlag":0,"AppInfo":{"AppID":"","Type":0},"HasProductId":0,"Ticket":"","ImgHeight":0,"ImgWidth":0,"SubMsgType":0,"NewMsgId":179242112323992770,"MMPeerUserName":"@0bb3e4dd746fdbd4a80546aef66f4085","MMDigest":"test123","MMIsSend":false,"MMIsChatRoom":false,"MMUnread":true,"LocalID":"179242112323992762","ClientMsgId":"179242112323992762","MMActualContent":"test123","MMActualSender":"@0bb3e4dd746fdbd4a80546aef66f4085","MMDigestTime":"14:37","MMDisplayTime":1461652670,"MMTime":"14:37"}')

  const EXPECTED = {
    id:       '179242112323992762',
    from:   '@0bb3e4dd746fdbd4a80546aef66f4085',
  }
  const m = new Message(rawData)

  t.is(m.id         , EXPECTED.id   , 'id right')
  t.is(m.from().id  , EXPECTED.from , 'from right')

  const s = m.toString()
  t.is(typeof s, 'string', 'toString()')
})

test('ready()', async t => {

  // must different with other rawData, because Contact class with load() will cache the result. or use Contact.resetPool()
  /* tslint:disable:max-line-length */
  const rawData = JSON.parse('{"MsgId":"3009511950433684462","FromUserName":"@0748ee480711bf20af91c298a0d7dcc77c30a680c1004157386b81cf13474823","ToUserName":"@b58f91e0c5c9e841e290d862ddb63c14","MsgType":1,"Content":"哈哈","Status":3,"ImgStatus":1,"CreateTime":1462887888,"VoiceLength":0,"PlayLength":0,"FileName":"","FileSize":"","MediaId":"","Url":"","AppMsgType":0,"StatusNotifyCode":0,"StatusNotifyUserName":"","RecommendInfo":{"UserName":"","NickName":"","QQNum":0,"Province":"","City":"","Content":"","Signature":"","Alias":"","Scene":0,"VerifyFlag":0,"AttrStatus":0,"Sex":0,"Ticket":"","OpCode":0},"ForwardFlag":0,"AppInfo":{"AppID":"","Type":0},"HasProductId":0,"Ticket":"","ImgHeight":0,"ImgWidth":0,"SubMsgType":0,"NewMsgId":3009511950433684500,"MMPeerUserName":"@0748ee480711bf20af91c298a0d7dcc77c30a680c1004157386b81cf13474823","MMDigest":"哈哈","MMIsSend":false,"MMIsChatRoom":false,"MMUnread":false,"LocalID":"3009511950433684462","ClientMsgId":"3009511950433684462","MMActualContent":"哈哈","MMActualSender":"@0748ee480711bf20af91c298a0d7dcc77c30a680c1004157386b81cf13474823","MMDigestTime":"21:44","MMDisplayTime":1462887888,"MMTime":"21:44","_h":104,"_index":0,"_offsetTop":0,"$$hashKey":"098"}')

  const expectedFromUserName = '@0748ee480711bf20af91c298a0d7dcc77c30a680c1004157386b81cf13474823'
  const expectedToUserName   = '@b58f91e0c5c9e841e290d862ddb63c14'
  const expectedFromNickName = 'From Nick Name@Test'
  const expectedToNickName   = 'To Nick Name@Test'
  const expectedMsgId        = '3009511950433684462'

  Config.puppetInstance()
        .getContact = mockGetContact

  // Mock
  function mockGetContact(id) {
    log.silly('TestMessage', `mocked getContact(${id})`)
    return new Promise((resolve, reject) => {
      let obj = {}
      switch (id) {
        case expectedFromUserName:
          obj = {
            UserName: expectedFromUserName,
            NickName: expectedFromNickName,
          }
          break
        case expectedToUserName:
          obj = {
            UserName: expectedToUserName,
            NickName: expectedToNickName,
          }
          break
        default:
          log.error('TestMessage', `mocked getContact(${id}) unknown`)
          t.fail('mocked getContact(${id}) unknown')
          break
      }
      log.silly('TestMessage', 'setTimeout mocked getContact')
      setTimeout(r => {
        log.silly('TestMessage', 'mocked getContact resolved')
        return resolve(obj)
      }, 100)
    })
  }

  const m = new Message(rawData)

  t.is(m.id, expectedMsgId, 'id/MsgId right')
  await m.ready()

  const fc = m.from()
  const tc = m.to()

  if (!fc || !tc) {
    throw new Error('no fc or no tc')
  }
  t.is(fc.get('id')   , expectedFromUserName, 'contact ready for FromUserName')
  t.is(fc.get('name') , expectedFromNickName, 'contact ready for FromNickName')
  t.is(tc.get('id')   , expectedToUserName  , 'contact ready for ToUserName')
  t.is(tc.get('name') , expectedToNickName  , 'contact ready for ToNickName')
})

test('find()', async t => {
  const m = await Message.find({
    id: 'xxx',
  })

  t.truthy(m.id, 'Message.find')
})

test('findAll()', async t => {
  const msgList = await Message.findAll({
    from: 'yyy',
  })

  t.is(msgList.length, 2, 'Message.findAll with limit 2')
})

test('self()', t => {
  Config.puppetInstance()

  const m = new Message()
  m.from(MOCK_USER_ID)

  t.true(m.self(), 'should identify self message true where message from userId')

  m.from('fdsafasfsfa')
  t.false(m.self(), 'should identify self message false when from a different fromId')
})

test('mention()', async t => {
  /* tslint:disable:max-line-length */
  const rawData = JSON.parse(`{"MsgId":"1159549798484970886","FromUserName":"@@f47ccb7762cf4dc7352508fb03b79b44cedd3d1e16152e7f1bae3d4cf7996eb2","ToUserName":"@56c8d702f12e05ae64872e7c2a92073486b57623bf04941cef47bf2e8452ca7d","MsgType":1,"Content":"@c8e11ab44ea04b92c98885453eeef1a5:<br/>@wuli舞哩客服 @小桔同学 你们好","Status":3,"ImgStatus":1,"CreateTime":1489758397,"VoiceLength":0,"PlayLength":0,"FileName":"","FileSize":"","MediaId":"","Url":"","AppMsgType":0,"StatusNotifyCode":0,"StatusNotifyUserName":"","RecommendInfo":{"UserName":"","NickName":"","QQNum":0,"Province":"","City":"","Content":"","Signature":"","Alias":"","Scene":0,"VerifyFlag":0,"AttrStatus":0,"Sex":0,"Ticket":"","OpCode":0},"ForwardFlag":0,"AppInfo":{"AppID":"","Type":0},"HasProductId":0,"Ticket":"","ImgHeight":0,"ImgWidth":0,"SubMsgType":0,"NewMsgId":1159549798484971000,"OriContent":"","MMPeerUserName":"@@f47ccb7762cf4dc7352508fb03b79b44cedd3d1e16152e7f1bae3d4cf7996eb2","MMDigest":"22acb030-ff09-11e6-8a73-cff62d9268c5:@wuli舞哩客服 @小桔同学 你们好","MMIsSend":false,"MMIsChatRoom":true,"MMUnread":true,"LocalID":"1159549798484970886","ClientMsgId":"1159549798484970886","MMActualContent":"@wuli舞哩客服 @小桔同学 你们好","MMActualSender":"@c8e11ab44ea04b92c98885453eeef1a5","MMDigestTime":"21:46","MMDisplayTime":1489758397,"MMTime":"21:46"}`)

  const RAW_OBJ = JSON.parse(`{"Alias":"","AppAccountFlag":0,"AttrStatus":0,"ChatRoomId":0,"City":"","ContactFlag":2,"DisplayName":"","EncryChatRoomId":"@305fa7624e77bbe1857bfc899dc05835","HeadImgUrl":"/cgi-bin/mmwebwx-bin/webwxgetheadimg?seq=648035057&username=@@f47ccb7762cf4dc7352508fb03b79b44cedd3d1e16152e7f1bae3d4cf7996eb2&skey=","HideInputBarFlag":0,"IsOwner":1,"KeyWord":"","MMFromBatchGet":true,"MMFromBatchget":true,"MMInChatroom":true,"MMOrderSymbol":"FUFEIRUQUN","MemberCount":3,"MemberList":[{"AttrStatus":2147584103,"DisplayName":"","KeyWord":"qq5","MemberStatus":0,"NickName":"22acb030-ff09-11e6-8a73-cff62d9268c5","PYInitial":"","PYQuanPin":"","RemarkPYInitial":"","RemarkPYQuanPin":"","Uin":0,"UserName":"@c8e11ab44ea04b92c98885453eeef1a5"},{"AttrStatus":135205,"DisplayName":"","KeyWord":"","MemberStatus":0,"NickName":"小桔同学","PYInitial":"","PYQuanPin":"","RemarkPYInitial":"","RemarkPYQuanPin":"","Uin":0,"UserName":"@56c8d702f12e05ae64872e7c2a92073486b57623bf04941cef47bf2e8452ca7d"},{"AttrStatus":233509,"DisplayName":"","KeyWord":"","MemberStatus":0,"NickName":"50fb16c0-ff09-11e6-9fe5-dda97284d25b","PYInitial":"","PYQuanPin":"","RemarkPYInitial":"","RemarkPYQuanPin":"","Uin":0,"UserName":"@4731ed48f9914e7b95ebec77803223863e2cd33497f8633c755d985a544c6922"}],"NickName":"付费入群","OwnerUin":0,"PYInitial":"FFRQ","PYQuanPin":"fufeiruqun","Province":"","RemarkName":"","RemarkPYInitial":"","RemarkPYQuanPin":"","Sex":0,"Signature":"","SnsFlag":0,"StarFriend":0,"Statues":1,"Uin":0,"UniFriend":0,"UserName":"@@f47ccb7762cf4dc7352508fb03b79b44cedd3d1e16152e7f1bae3d4cf7996eb2","VerifyFlag":0,"stranger":true}`)

  const CONTACT_LIST = JSON.parse(`{"@c8e11ab44ea04b92c98885453eeef1a5":{ "UserName": "@c8e11ab44ea04b92c98885453eeef1a5","NickName": "李佳芮","RemarkName": "22acb030-ff09-11e6-8a73-cff62d9268c5" },"@56c8d702f12e05ae64872e7c2a92073486b57623bf04941cef47bf2e8452ca7d":{ "UserName": "@56c8d702f12e05ae64872e7c2a92073486b57623bf04941cef47bf2e8452ca7d","NickName": "小桔同学","RemarkName": "" },"@4731ed48f9914e7b95ebec77803223863e2cd33497f8633c755d985a544c6922":{ "UserName": "@4731ed48f9914e7b95ebec77803223863e2cd33497f8633c755d985a544c6922","NickName": "wuli舞哩客服","RemarkName": "50fb16c0-ff09-11e6-9fe5-dda97284d25b" }}`)

  const EXPECTED = {
    id:           '@@f47ccb7762cf4dc7352508fb03b79b44cedd3d1e16152e7f1bae3d4cf7996eb2',
    mentionId0:   '@56c8d702f12e05ae64872e7c2a92073486b57623bf04941cef47bf2e8452ca7d',
    mentionId1:   '@4731ed48f9914e7b95ebec77803223863e2cd33497f8633c755d985a544c6922',
  }

  // Mock
  const mockContactGetter = function (id) {
    return new Promise((resolve, reject) => {
      if (id !== EXPECTED.id && !(id in CONTACT_LIST)) return resolve({})
      if (id === EXPECTED.id) {
        setTimeout(() => {
          return resolve(RAW_OBJ)
        }, 10)
      }
      if (id in CONTACT_LIST) {
        setTimeout(() => {
          return resolve(CONTACT_LIST[id])
        }, 10)
      }
    })
  }

  let puppet1
  try {
    puppet1 = Config.puppetInstance()
    puppet1.getContact = mockContactGetter
  } catch (err) {
    puppet1 = { getContact: mockContactGetter }
    Config.puppetInstance(puppet1)
  }
  const m = new Message(rawData)
  const room = m.room()
  if (room) {
    await room.ready()
  }
  const mentionList = m.mention()

  t.is(mentionList[0].id, EXPECTED.mentionId0, '0 get the correct mention contact')
})
