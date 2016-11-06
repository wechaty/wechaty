/**
 * Wechaty - Wechat for Bot. Connecting ChatBots
 *
 * Licenst: ISC
 * https://github.com/wechaty/wechaty
 *
 */
import { test } from 'ava'

import {
    Config
  , log
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
    id:       '179242112323992762'
    , from:   '@0bb3e4dd746fdbd4a80546aef66f4085'
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

  const expectedFromUserName  = '@0748ee480711bf20af91c298a0d7dcc77c30a680c1004157386b81cf13474823'
  const expectedToUserName    = '@b58f91e0c5c9e841e290d862ddb63c14'
  const expectedFromNickName  = 'From Nick Name@Test'
  const expectedToNickName    = 'To Nick Name@Test'
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
            UserName: expectedFromUserName
            , NickName: expectedFromNickName
          }
          break
        case expectedToUserName:
          obj = {
            UserName: expectedToUserName
            , NickName: expectedToNickName
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
    id: 'xxx'
  })

  t.truthy(m.id, 'Message.find')
})

test('findAll()', async t => {
  const msgList = await Message.findAll({
    from: 'yyy'
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
