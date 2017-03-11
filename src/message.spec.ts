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

  const expectedFromUserName  = '@0748ee480711bf20af91c298a0d7dcc77c30a680c1004157386b81cf13474823'
  const expectedToUserName    = '@b58f91e0c5c9e841e290d862ddb63c14'
  const expectedFromNickName  = 'From Nick Name@Test'
  const expectedToNickName    = 'To Nick Name@Test'
  const expectedMsgId         = '3009511950433684462'

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
  const rawData = JSON.parse('{"MsgId":"5733520304972067629","FromUserName":"@@e2355db381dc46a77c0b95516d05e7486135cb6370d8a6af66925d89d50ec278","ToUserName":"@ea35c07e35698e669e7bcf12abc3a1c851c617354d9467fce1f7f548365fcf33","MsgType":1,"Content":"@2ec5cdb1268f40a7280aa720b9b5c272:<br/>@麦刚 和@童玮亮 是好朋友","Status":3,"ImgStatus":1,"CreateTime":1489218261,"VoiceLength":0,"PlayLength":0,"FileName":"","FileSize":"","MediaId":"","Url":"","AppMsgType":0,"StatusNotifyCode":0,"StatusNotifyUserName":"","RecommendInfo":{"UserName":"","NickName":"","QQNum":0,"Province":"","City":"","Content":"","Signature":"","Alias":"","Scene":0,"VerifyFlag":0,"AttrStatus":0,"Sex":0,"Ticket":"","OpCode":0},"ForwardFlag":0,"AppInfo":{"AppID":"","Type":0},"HasProductId":0,"Ticket":"","ImgHeight":0,"ImgWidth":0,"SubMsgType":0,"NewMsgId":5733520304972068000,"OriContent":"","MMPeerUserName":"@@e2355db381dc46a77c0b95516d05e7486135cb6370d8a6af66925d89d50ec278","MMDigest":"22acb030-ff09-11e6-8a73-cff62d9268c5:@麦刚 和@童玮亮 是好朋友","MMIsSend":false,"MMIsChatRoom":true,"MMUnread":true,"LocalID":"5733520304972067629","ClientMsgId":"5733520304972067629","MMActualContent":"@麦刚 和@童玮亮 是好朋友","MMActualSender":"@2ec5cdb1268f40a7280aa720b9b5c272","MMDigestTime":"15:44","MMDisplayTime":1489218261,"MMTime":"15:44"}')

   const RAW_OBJ = JSON.parse(`{"RemarkPYQuanPin":"","RemarkPYInitial":"","PYInitial":"TZZGQNTSHGFJ","PYQuanPin":"tongzhizhongguoqingniantianshihuiguanfangjia","Uin":0,"UserName":"@@e2355db381dc46a77c0b95516d05e7486135cb6370d8a6af66925d89d50ec278","NickName":"（通知）中国青年天使会官方家","HeadImgUrl":"/cgi-bin/mmwebwx-bin/webwxgetheadimg?seq=670397504&username=@@e2355db381dc46a77c0b95516d05e7486135cb6370d8a6af66925d89d50ec278&skey=","ContactFlag":2,"MemberCount":146,"MemberList":[{"Uin":0,"UserName":"@ecff4a7a86f23455dc42317269aa36ab","NickName":"童玮亮","AttrStatus":103423,"PYInitial":"","PYQuanPin":"","RemarkPYInitial":"","RemarkPYQuanPin":"","MemberStatus":0,"DisplayName":"","KeyWord":"dap","HeadImgUrl":"/cgi-bin/mmwebwx-bin/webwxgeticon?seq=0&username=@ecff4a7a86f23455dc42317269aa36ab&skey=@crypt_f9cec94b_f23a307a23231cfb5098faf91ff759ca&chatroomid=@4b8baa99bdfc354443711412126d2aaf"},{"Uin":0,"UserName":"@eac4377ecfd59e4321262f892177169f","NickName":"麦刚","AttrStatus":33674247,"PYInitial":"","PYQuanPin":"","RemarkPYInitial":"","RemarkPYQuanPin":"","MemberStatus":0,"DisplayName":"","KeyWord":"mai","HeadImgUrl":"/cgi-bin/mmwebwx-bin/webwxgeticon?seq=0&username=@eac4377ecfd59e4321262f892177169f&skey=@crypt_f9cec94b_f23a307a23231cfb5098faf91ff759ca&chatroomid=@4b8baa99bdfc354443711412126d2aaf"},{"Uin":0,"UserName":"@ad85207730aa94e006ddce28f74e6878","NickName":"田美坤Maggie","AttrStatus":112679,"PYInitial":"","PYQuanPin":"","RemarkPYInitial":"","RemarkPYQuanPin":"","MemberStatus":0,"DisplayName":"田美坤","KeyWord":"tia","HeadImgUrl":"/cgi-bin/mmwebwx-bin/webwxgeticon?seq=0&username=@ad85207730aa94e006ddce28f74e6878&skey=@crypt_f9cec94b_f23a307a23231cfb5098faf91ff759ca&chatroomid=@4b8baa99bdfc354443711412126d2aaf"},{"Uin":2351423900,"UserName":"@33cc239d22b20d56395bbbd0967b28b9","NickName":"周宏光","AttrStatus":327869,"PYInitial":"","PYQuanPin":"","RemarkPYInitial":"","RemarkPYQuanPin":"","MemberStatus":0,"DisplayName":"周宏光","KeyWord":"acc","HeadImgUrl":"/cgi-bin/mmwebwx-bin/webwxgeticon?seq=0&username=@33cc239d22b20d56395bbbd0967b28b9&skey=@crypt_f9cec94b_f23a307a23231cfb5098faf91ff759ca&chatroomid=@4b8baa99bdfc354443711412126d2aaf"},{"Uin":0,"UserName":"@5e77381e1e3b5641ddcee44670b6e83a","NickName":"牛文文","AttrStatus":100349,"PYInitial":"","PYQuanPin":"","RemarkPYInitial":"","RemarkPYQuanPin":"","MemberStatus":0,"DisplayName":"","KeyWord":"niu","HeadImgUrl":"/cgi-bin/mmwebwx-bin/webwxgeticon?seq=0&username=@5e77381e1e3b5641ddcee44670b6e83a&skey=@crypt_f9cec94b_f23a307a23231cfb5098faf91ff759ca&chatroomid=@4b8baa99bdfc354443711412126d2aaf"},{"Uin":0,"UserName":"@56941ef97f3e9c70af88667fdd613b44","NickName":"羊东 东方红酒窖","AttrStatus":33675367,"PYInitial":"","PYQuanPin":"","RemarkPYInitial":"","RemarkPYQuanPin":"","MemberStatus":0,"DisplayName":"","KeyWord":"Yan","HeadImgUrl":"/cgi-bin/mmwebwx-bin/webwxgeticon?seq=0&username=@56941ef97f3e9c70af88667fdd613b44&skey=@crypt_f9cec94b_f23a307a23231cfb5098faf91ff759ca&chatroomid=@4b8baa99bdfc354443711412126d2aaf"},{"Uin":0,"UserName":"@72c4767ce32db488871fdd1c27173b81","NickName":"李竹～英诺天使（此号已满）","AttrStatus":235261,"PYInitial":"","PYQuanPin":"","RemarkPYInitial":"","RemarkPYQuanPin":"","MemberStatus":0,"DisplayName":"","KeyWord":"liz","HeadImgUrl":"/cgi-bin/mmwebwx-bin/webwxgeticon?seq=0&username=@72c4767ce32db488871fdd1c27173b81&skey=@crypt_f9cec94b_f23a307a23231cfb5098faf91ff759ca&chatroomid=@4b8baa99bdfc354443711412126d2aaf"},{"Uin":0,"UserName":"@0b0e2eb9501ab2d84f9f800f6a0b4216","NickName":"周静彤 杨宁助理","AttrStatus":230885,"PYInitial":"","PYQuanPin":"","RemarkPYInitial":"","RemarkPYQuanPin":"","MemberStatus":0,"DisplayName":"","KeyWord":"zlo","HeadImgUrl":"/cgi-bin/mmwebwx-bin/webwxgeticon?seq=0&username=@0b0e2eb9501ab2d84f9f800f6a0b4216&skey=@crypt_f9cec94b_f23a307a23231cfb5098faf91ff759ca&chatroomid=@4b8baa99bdfc354443711412126d2aaf"},{"Uin":0,"UserName":"@4bfa767be0cd3fb78409b9735d1dcc57","NickName":"周哲 Jeremy","AttrStatus":33791995,"PYInitial":"","PYQuanPin":"","RemarkPYInitial":"","RemarkPYQuanPin":"","MemberStatus":0,"DisplayName":"","KeyWord":"zho","HeadImgUrl":"/cgi-bin/mmwebwx-bin/webwxgeticon?seq=0&username=@4bfa767be0cd3fb78409b9735d1dcc57&skey=@crypt_f9cec94b_f23a307a23231cfb5098faf91ff759ca&chatroomid=@4b8baa99bdfc354443711412126d2aaf"},{"Uin":0,"UserName":"@ad954bf2159a572b7743a5bc134739f4","NickName":"vicky张","AttrStatus":100477,"PYInitial":"","PYQuanPin":"","RemarkPYInitial":"","RemarkPYQuanPin":"","MemberStatus":0,"DisplayName":"","KeyWord":"hua","HeadImgUrl":"/cgi-bin/mmwebwx-bin/webwxgeticon?seq=0&username=@ad954bf2159a572b7743a5bc134739f4&skey=@crypt_f9cec94b_f23a307a23231cfb5098faf91ff759ca&chatroomid=@4b8baa99bdfc354443711412126d2aaf"}],"RemarkName":"","HideInputBarFlag":0,"Sex":0,"Signature":"","VerifyFlag":0,"OwnerUin":2351423900,"StarFriend":0,"AppAccountFlag":0,"Statues":0,"AttrStatus":0,"Province":"","City":"","Alias":"","SnsFlag":0,"UniFriend":0,"DisplayName":"","ChatRoomId":0,"KeyWord":"","EncryChatRoomId":"@4b8baa99bdfc354443711412126d2aaf","MMFromBatchGet":true,"MMOrderSymbol":"TONGZHIZHONGGUOQINGNIANTIANSHIHUIGUANFANGJIA","MMFromBatchget":true,"MMInChatroom":true}`)
  const CONTACT_LIST = JSON.parse(`{"@ad85207730aa94e006ddce28f74e6878":{ "UserName": "@ad85207730aa94e006ddce28f74e6878","NickName": "田美坤Maggie","RemarkName": "" },"@eac4377ecfd59e4321262f892177169f":{ "UserName": "@eac4377ecfd59e4321262f892177169f","NickName": "麦刚","RemarkName": "" },"@ecff4a7a86f23455dc42317269aa36ab":{ "UserName": "@ecff4a7a86f23455dc42317269aa36ab","NickName": "童玮亮","RemarkName": "童玮亮备注" }}`)

  const EXPECTED = {
    id:           '@@e2355db381dc46a77c0b95516d05e7486135cb6370d8a6af66925d89d50ec278',
    mentionId0:   '@eac4377ecfd59e4321262f892177169f',
    mentionId1:   '@ecff4a7a86f23455dc42317269aa36ab',
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

  t.is(mentionList[0].id, EXPECTED.mentionId0, 'get the correct mention contact')
  t.is(mentionList[1].id, EXPECTED.mentionId1, 'get the correct mention contact')
})
